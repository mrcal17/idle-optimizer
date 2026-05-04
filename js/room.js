/* room.js — Pressure-driven room/environment decay.

   Reads Game.state pressures (trust, control, dependence, founder.{stress,
   energy}) and eases CSS custom-properties on :root each tick so the
   office visibly responds to the run state. Also reconciles the corkboard
   against state.models, mounting a "polaroid" per trained model.

   No new intervals — this hooks into the existing per-tick UI refresh
   (see Game.ui.refresh -> Game.room.tick). All DOM access is defensive:
   if a node is missing (mobile-hidden, pre-init), we no-op.

   No ES modules. Mutates only document.documentElement.style and the
   corkboard / phone DOM. State writes are limited to state.flags
   (phone-ringing flag) so save/load stays clean. */

window.Game = window.Game || {};

Game.room = (function() {

  /* ---- DOM cache -------------------------------------------------------- */
  let docRoot = null;
  let nodeRoomBack = null;
  let nodeRoomWindow = null;
  let nodeWindowGlass = null;
  let nodeCorkboard = null;
  let nodeDeskPhone = null;
  let nodeMugGlyph = null;
  let nodePlantGlyph = null;
  let nodeMonitor = null;

  function _cacheNodes() {
    docRoot = document.documentElement;
    nodeRoomBack = document.getElementById('room-back');
    nodeRoomWindow = document.getElementById('room-window');
    nodeWindowGlass = document.getElementById('window-glass');
    nodeCorkboard = document.getElementById('room-corkboard');
    nodeDeskPhone = document.getElementById('desk-phone');
    nodeMugGlyph = document.querySelector('#desk-mug .mug-glyph');
    nodePlantGlyph = document.getElementById('plant-glyph');
    nodeMonitor = document.getElementById('monitor');
  }

  /* ---- Eased current values (smooth CSS-var animation) ------------------ */
  /* Targets are recomputed each tick from state; current values lerp toward
     them so changes are subtle. */
  const cur = {
    saturation: 1,
    flicker: 0,
    cloud: 0,
    plant: 1,
    phone: 0,
    steam: 1,
    yellow: 0,        /* dependence wall tint */
    darkness: 0,      /* trust=0 lighting darkening */
  };

  /* One-shot pulse overrides — { name: { until, peak } }. While a pulse is
     active, cur[name] is forced toward peak; after, it relaxes back to the
     state-driven target. */
  const pulses = Object.create(null);

  /* Track the last tilt application so we don't re-set every tick. */
  let lastPhotoTiltLevel = -1;

  /* Track corkboard photos by modelId so we don't duplicate. */
  const photoIndex = Object.create(null);

  /* Small deterministic emoji pool (used only when model has no crest and
     Game.modelFlavor.crestFor isn't available). */
  const FALLBACK_CRESTS = ['★','✦','✧','◆','◇','◈','✶','✷','☼','☽','▲','●','■','♆','♅','⚛','⚙','⚓'];

  /* ---- helpers ---------------------------------------------------------- */

  function lerp(a, b, t) { return a + (b - a) * t; }

  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  function _now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  /* Hash a string id to a stable integer (used for stable rotation). */
  function _hashId(id) {
    if (id == null) return 0;
    if (typeof id === 'number') return id | 0;
    let n = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) | 0;
    return n;
  }

  /* Pick a stable rotation in degrees for a given model id, ±6deg. */
  function _stableRotation(id) {
    const n = _hashId(id);
    /* Map hash to [-6, 6] in 0.5deg steps. */
    const buckets = 25;                 /* -6 to +6 in 0.5 steps */
    const idx = ((n % buckets) + buckets) % buckets;
    return (idx - 12) * 0.5;
  }

  function _crestFor(model) {
    if (!model) return '★';
    if (model.crest) return model.crest;
    if (Game.modelFlavor && Game.modelFlavor.crestFor) {
      try { return Game.modelFlavor.crestFor(model.id); } catch (e) {}
    }
    const n = _hashId(model.id);
    return FALLBACK_CRESTS[((n % FALLBACK_CRESTS.length) + FALLBACK_CRESTS.length) % FALLBACK_CRESTS.length];
  }

  /* ---- protester rendering inside the window ---------------------------- */
  /* Rendered as an inline SVG group inside #window-glass. We rebuild only
     when the bucketed protester level changes (so we're not thrashing DOM
     on every tick). */

  let lastProtesterLevel = -1;

  function _protesterLevelFromTrust(trust) {
    /* 0 = clear, 1 = silhouettes, 2 = filled crowd */
    if (trust >= 60) return 0;
    if (trust >= 25) return 1;
    return 2;
  }

  function _renderProtesters(level) {
    if (!nodeWindowGlass) return;
    /* Find or create our SVG container so we don't disturb the existing
       ::before/::after pseudos. */
    let svg = nodeWindowGlass.querySelector('svg.protesters');
    if (level === 0) {
      if (svg) svg.remove();
      return;
    }
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'protesters');
      svg.setAttribute('viewBox', '0 0 220 150');
      svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '2';
      nodeWindowGlass.appendChild(svg);
    }
    /* level 1: 3 silhouettes spread across the bottom half.
       level 2: 6 figures, denser, with raised-sign rectangles. */
    const figures = level === 1 ? 3 : 6;
    const opacity = level === 1 ? 0.55 : 0.85;
    let html = '';
    for (let i = 0; i < figures; i++) {
      const x = 20 + (i * (180 / Math.max(1, figures - 1)));
      const y = 92 + ((i * 7) % 14);     /* slight bobbing variance */
      const headR = 5;
      const bodyW = 9;
      const bodyH = 22;
      /* Sign on every other figure at level 2; just figures at level 1. */
      const hasSign = level === 2 && (i % 2 === 0);
      const signX = x - 11;
      const signY = y - 26;
      html +=
        `<g fill="rgba(8,8,12,${opacity})">` +
          `<circle cx="${x}" cy="${y}" r="${headR}" />` +
          `<rect x="${x - bodyW / 2}" y="${y + headR - 1}" width="${bodyW}" height="${bodyH}" rx="2" />` +
          (hasSign
            ? `<rect x="${signX}" y="${signY}" width="22" height="14" fill="rgba(220,180,90,${opacity})" />` +
              `<line x1="${x}" y1="${signY + 14}" x2="${x}" y2="${y + headR - 1}" stroke="rgba(8,8,12,${opacity})" stroke-width="1.5" />`
            : '') +
        `</g>`;
    }
    svg.innerHTML = html;
  }

  /* ---- target computation ----------------------------------------------- */

  function _targetsFromState() {
    const s = Game.state;
    if (!s) {
      return {
        saturation: 1, flicker: 0, cloud: 0, plant: 1, phone: 0, steam: 1,
        yellow: 0, darkness: 0,
      };
    }

    const trust = Math.max(0, Math.min(100, s.trust != null ? s.trust : 100));
    const control = Math.max(0, Math.min(100, s.control != null ? s.control : 100));
    const dependence = Math.max(0, Math.min(100, s.dependence != null ? s.dependence : 0));
    const founder = s.founder || {};
    const stress = Math.max(0, Math.min(100, founder.stress != null ? founder.stress : 0));
    const maxEnergy = Math.max(1, founder.maxEnergy || 100);
    const energyFrac = Math.max(0, Math.min(1, (founder.energy != null ? founder.energy : maxEnergy) / maxEnergy));

    /* Window cloud: rises smoothly as trust drops below 50. */
    const cloud = clamp01((50 - trust) / 50);

    /* Darkness: only kicks in below trust=20, ramps to 1 at trust=0. */
    const darkness = clamp01((20 - trust) / 20);

    /* Flicker: rises as control drops; flat 0 above ~70, full at 0. */
    const flicker = clamp01((70 - control) / 70);

    /* Yellow paint: starts at dep=40, full at dep=85. */
    const yellow = clamp01((dependence - 40) / 45);

    /* Plant vitality: 1 at stress=0, falls to 0.4 at stress=100. */
    const plant = 0.4 + (1 - stress / 100) * 0.6;

    /* Steam: blended from founder.energy (mostly) and stress. Empty mug =>
       no steam regardless of stress. */
    const steam = clamp01(0.2 + 0.7 * energyFrac - 0.3 * (stress / 100));

    /* Saturation: world desaturates as the worst pressure worsens. */
    const worstHit = Math.max(
      (100 - trust) / 100,
      (100 - control) / 100,
      dependence / 100
    );
    const saturation = 1 - 0.45 * worstHit;

    /* Phone urgency: 0 unless flag is set; 1 while ringing (pulsing on top
       handles the "burst"). */
    const phoneFlag = s.flags && s.flags['phone-ringing'];
    const phone = phoneFlag ? 1 : 0;

    return {
      saturation, flicker, cloud, plant, phone, steam,
      yellow, darkness,
    };
  }

  /* ---- per-tick DOM application ----------------------------------------- */

  function _applyToDOM() {
    if (!docRoot) return;
    const st = docRoot.style;
    st.setProperty('--decay-saturation', cur.saturation.toFixed(3));
    st.setProperty('--decay-flicker',    cur.flicker.toFixed(3));
    st.setProperty('--window-cloud',     cur.cloud.toFixed(3));
    st.setProperty('--plant-vitality',   cur.plant.toFixed(3));
    st.setProperty('--phone-urgency',    cur.phone.toFixed(3));
    st.setProperty('--steam-rate',       cur.steam.toFixed(3));

    /* Wall yellowing — overlay on .room-back via a private CSS var; we
       set background-blend without touching styles.css. */
    if (nodeRoomBack) {
      if (cur.yellow > 0.01) {
        const a = (cur.yellow * 0.22).toFixed(3);
        nodeRoomBack.style.boxShadow = `inset 0 0 220px rgba(196,168,72,${a})`;
      } else if (nodeRoomBack.style.boxShadow) {
        nodeRoomBack.style.boxShadow = '';
      }
    }

    /* Lighting darkness — apply to room-layer via filter on root. We use
       brightness on .room-back so the desk + monitor still read. */
    if (nodeRoomBack) {
      if (cur.darkness > 0.01) {
        const b = (1 - cur.darkness * 0.35).toFixed(3);
        nodeRoomBack.style.filter = `saturate(var(--decay-saturation)) brightness(${b})`;
      } else if (nodeRoomBack.style.filter) {
        nodeRoomBack.style.filter = '';
      }
    }

    /* Mug glyph fades as steam dies (energy gone). */
    if (nodeMugGlyph) {
      const op = (0.55 + 0.45 * cur.steam).toFixed(3);
      nodeMugGlyph.style.opacity = op;
    }

    /* Phone ringing class — toggled from the flag, not the eased value. */
    if (nodeDeskPhone) {
      const ringing = !!(Game.state && Game.state.flags && Game.state.flags['phone-ringing']);
      if (ringing && !nodeDeskPhone.classList.contains('ringing')) nodeDeskPhone.classList.add('ringing');
      else if (!ringing && nodeDeskPhone.classList.contains('ringing')) nodeDeskPhone.classList.remove('ringing');
    }

    /* Photo tilt: bucketed by control band so we apply at most a couple
       times per run. At control < 25 we add a per-photo nudge to its
       baseline rotation. */
    const tiltLevel = (Game.state && Game.state.control != null && Game.state.control < 25) ? 1 : 0;
    if (tiltLevel !== lastPhotoTiltLevel) {
      lastPhotoTiltLevel = tiltLevel;
      if (nodeCorkboard) {
        const photos = nodeCorkboard.querySelectorAll('.corkboard-photo');
        photos.forEach((p, i) => {
          const baseAttr = p.getAttribute('data-base-rot');
          const base = baseAttr != null ? parseFloat(baseAttr) : 0;
          const extra = tiltLevel ? ((i % 2 === 0) ? -7 : 7) : 0;
          p.style.setProperty('--rot', (base + extra).toFixed(2) + 'deg');
        });
      }
    }
  }

  /* ---- corkboard reconciliation ---------------------------------------- */

  function _reconcileCorkboard() {
    if (!nodeCorkboard) return;
    const s = Game.state;
    const models = (s && Array.isArray(s.models)) ? s.models : [];
    /* Add photos for any unseen models. */
    for (let i = 0; i < models.length; i++) {
      const m = models[i];
      if (!m || m.id == null) continue;
      const key = String(m.id);
      if (photoIndex[key]) continue;
      addModelPhoto(m);
    }
    /* Optional: remove photos for models that were archived/removed. */
    const liveIds = Object.create(null);
    for (let i = 0; i < models.length; i++) {
      if (models[i] && models[i].id != null) liveIds[String(models[i].id)] = true;
    }
    Object.keys(photoIndex).forEach(k => {
      if (!liveIds[k]) {
        try { photoIndex[k].remove(); } catch (e) {}
        delete photoIndex[k];
      }
    });
  }

  /* ---- API -------------------------------------------------------------- */

  function init() {
    _cacheNodes();
    if (!docRoot) return;

    /* Reset eased values to baseline. */
    cur.saturation = 1;
    cur.flicker = 0;
    cur.cloud = 0;
    cur.plant = 1;
    cur.phone = 0;
    cur.steam = 1;
    cur.yellow = 0;
    cur.darkness = 0;

    /* Wipe any lingering pulse overrides from a prior run. */
    Object.keys(pulses).forEach(k => delete pulses[k]);

    /* Clear the corkboard so a fresh run starts empty. */
    if (nodeCorkboard) nodeCorkboard.innerHTML = '';
    Object.keys(photoIndex).forEach(k => delete photoIndex[k]);

    /* Clear inline styles we may have set last run. */
    if (nodeRoomBack) {
      nodeRoomBack.style.filter = '';
      nodeRoomBack.style.boxShadow = '';
    }
    if (nodeMugGlyph) nodeMugGlyph.style.opacity = '';
    if (nodeDeskPhone) nodeDeskPhone.classList.remove('ringing');

    lastProtesterLevel = -1;
    _renderProtesters(0);
    lastPhotoTiltLevel = -1;

    /* Defensive: pre-existing models on a loaded save show up immediately. */
    _reconcileCorkboard();

    /* Push baseline CSS vars now so we don't wait a tick. */
    _applyToDOM();
  }

  function tick() {
    if (!docRoot) _cacheNodes();
    if (!docRoot) return;

    const target = _targetsFromState();

    /* Per-frame ease toward target. ~0.05 per tick is gentle. */
    const k = 0.05;
    cur.saturation = lerp(cur.saturation, target.saturation, k);
    cur.flicker    = lerp(cur.flicker,    target.flicker,    k);
    cur.cloud      = lerp(cur.cloud,      target.cloud,      k);
    cur.plant      = lerp(cur.plant,      target.plant,      k);
    cur.steam      = lerp(cur.steam,      target.steam,      k);
    cur.yellow     = lerp(cur.yellow,     target.yellow,     k * 0.6);
    cur.darkness   = lerp(cur.darkness,   target.darkness,   k);

    /* Phone urgency: faster ease so a ring spike feels snappy; pulsing
       handled below. */
    cur.phone = lerp(cur.phone, target.phone, 0.18);

    /* Apply any active pulses (forced overrides). */
    const t = _now();
    Object.keys(pulses).forEach(name => {
      const p = pulses[name];
      if (!p) return;
      if (t >= p.until) {
        delete pulses[name];
        return;
      }
      /* Triangular envelope: ramp up over first half, ramp down second. */
      const total = p.until - p.start;
      const elapsed = t - p.start;
      const phase = elapsed / total;            // 0..1
      const env = phase < 0.5 ? (phase / 0.5) : (1 - (phase - 0.5) / 0.5);
      const forced = lerp(cur[name] || 0, p.peak, env);
      if (cur[name] != null) cur[name] = Math.max(cur[name], forced);
    });

    _applyToDOM();

    /* Window protesters: bucketed update. */
    const trust = Game.state ? (Game.state.trust != null ? Game.state.trust : 100) : 100;
    const lvl = _protesterLevelFromTrust(trust);
    if (lvl !== lastProtesterLevel) {
      lastProtesterLevel = lvl;
      _renderProtesters(lvl);
    }

    /* Reconcile corkboard against state.models (cheap: only adds when new). */
    _reconcileCorkboard();
  }

  function ringPhone(callerId) {
    if (!Game.state) return;
    Game.state.flags = Game.state.flags || {};
    Game.state.flags['phone-ringing'] = callerId || true;
    /* Snap urgency target high immediately and pulse so the player notices. */
    pulse('phone', 1, 600);
  }

  function hangUpPhone() {
    if (!Game.state || !Game.state.flags) return;
    delete Game.state.flags['phone-ringing'];
  }

  function addModelPhoto(model) {
    if (!nodeCorkboard || !model || model.id == null) return;
    const key = String(model.id);
    if (photoIndex[key]) return photoIndex[key];

    const crest = _crestFor(model);
    const rot = _stableRotation(model.id);
    const label = (model.name || ('m-' + model.id)).slice(0, 10);

    const el = document.createElement('div');
    el.className = 'corkboard-photo';
    el.setAttribute('data-model-id', String(model.id));
    el.setAttribute('data-base-rot', rot.toFixed(2));
    el.style.setProperty('--rot', rot.toFixed(2) + 'deg');
    /* Use textContent for the crest, span for the label so CSS pseudos still work. */
    const crestNode = document.createTextNode(crest);
    el.appendChild(crestNode);
    const labelEl = document.createElement('span');
    labelEl.className = 'photo-label';
    labelEl.textContent = label;
    el.appendChild(labelEl);

    nodeCorkboard.appendChild(el);
    photoIndex[key] = el;
    /* New photo arrived — re-apply current tilt level so it matches siblings. */
    if (lastPhotoTiltLevel === 1) {
      const idx = Object.keys(photoIndex).length - 1;
      const extra = (idx % 2 === 0) ? -7 : 7;
      el.style.setProperty('--rot', (rot + extra).toFixed(2) + 'deg');
    }
    return el;
  }

  function removeModelPhoto(modelId) {
    if (modelId == null) return;
    const key = String(modelId);
    const el = photoIndex[key];
    if (!el) return;
    try { el.remove(); } catch (e) {}
    delete photoIndex[key];
  }

  /* One-shot pulse: forces cur[target] toward `intensity` for `durationMs`,
     then relaxes. Useful for monitor flicker spikes, phone urgency burst. */
  function pulse(target, intensity, durationMs) {
    if (!target || cur[target] == null) return;
    const dur = Math.max(50, durationMs || 600);
    pulses[target] = {
      start: _now(),
      until: _now() + dur,
      peak: Math.max(0, Math.min(1, intensity != null ? intensity : 1)),
    };
  }

  return {
    init,
    tick,
    ringPhone,
    hangUpPhone,
    addModelPhoto,
    removeModelPhoto,
    pulse,
  };

})();
