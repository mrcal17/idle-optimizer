/* room.js — Pressure-driven room/environment decay.

   Reads Game.state pressures (trust, control, dependence, founder.{stress,
   energy}) and eases CSS custom-properties on :root each tick so the
   office visibly responds to the run state. Also keeps a model-photo
   index so TEAM.app's corkboard can render a "polaroid" per trained model
   without re-deriving identity each render.

   No new intervals — this hooks into the existing per-tick UI refresh
   (see Game.ui.refresh -> Game.room.tick). All DOM access is defensive:
   if a node is missing (mobile-hidden, pre-init), we no-op.

   No ES modules. Mutates only document.documentElement.style, the wall
   clock + phone DOM, and (when present) the office-scene corkboard.
   State writes are limited to state.flags (phone-ringing flag) so
   save/load stays clean. */

window.Game = window.Game || {};

Game.room = (function() {

  /* ---- DOM cache -------------------------------------------------------- */
  let docRoot = null;
  let nodeRoomBack = null;
  let nodeRoomWindow = null;
  let nodeWindowGlass = null;
  let nodeDeskPhone = null;
  let nodeMonitor = null;

  function _cacheNodes() {
    docRoot = document.documentElement;
    nodeRoomBack = document.getElementById('room-back');
    nodeRoomWindow = document.getElementById('room-window');
    nodeWindowGlass = document.getElementById('window-glass');
    nodeDeskPhone = document.getElementById('desk-phone');
    nodeMonitor = document.getElementById('monitor');
  }

  /* The corkboard now lives inside the active TEAM.app scene, so it may
     not exist on every render (different scene mounted). Look it up
     fresh each time we need it rather than caching. */
  function _corkboardNode() {
    return document.getElementById('office-corkboard');
  }

  /* ---- Eased current values (smooth CSS-var animation) ------------------ */
  /* Targets are recomputed each tick from state; current values lerp toward
     them so changes are subtle. */
  const cur = {
    saturation: 1,
    flicker: 0,
    cloud: 0,
    phone: 0,
    yellow: 0,        /* dependence wall tint */
    darkness: 0,      /* trust=0 lighting darkening */
  };

  /* One-shot pulse overrides — { name: { until, peak } }. While a pulse is
     active, cur[name] is forced toward peak; after, it relaxes back to the
     state-driven target. */
  const pulses = Object.create(null);

  /* Track the last tilt application so we don't re-set every tick. */
  let lastPhotoTiltLevel = -1;

  /* Track the last day applied to the wall clock so we don't restart its
     transition every tick. -1 sentinel forces a first apply at init. */
  let lastClockDay = -1;

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
        saturation: 1, flicker: 0, cloud: 0, phone: 0,
        yellow: 0, darkness: 0,
      };
    }

    const trust = Math.max(0, Math.min(100, s.trust != null ? s.trust : 100));
    const control = Math.max(0, Math.min(100, s.control != null ? s.control : 100));
    const dependence = Math.max(0, Math.min(100, s.dependence != null ? s.dependence : 0));

    /* Window cloud: rises smoothly as trust drops below 50. */
    const cloud = clamp01((50 - trust) / 50);

    /* Darkness: only kicks in below trust=20, ramps to 1 at trust=0. */
    const darkness = clamp01((20 - trust) / 20);

    /* Flicker: rises as control drops; flat 0 above ~70, full at 0. */
    const flicker = clamp01((70 - control) / 70);

    /* Yellow paint: starts at dep=40, full at dep=85. */
    const yellow = clamp01((dependence - 40) / 45);

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
      saturation, flicker, cloud, phone,
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
    st.setProperty('--phone-urgency',    cur.phone.toFixed(3));

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

    /* Phone ringing class — toggled from the flag, not the eased value. */
    if (nodeDeskPhone) {
      const ringing = !!(Game.state && Game.state.flags && Game.state.flags['phone-ringing']);
      if (ringing && !nodeDeskPhone.classList.contains('ringing')) nodeDeskPhone.classList.add('ringing');
      else if (!ringing && nodeDeskPhone.classList.contains('ringing')) nodeDeskPhone.classList.remove('ringing');
    }

    /* Photo tilt: bucketed by control band so we apply at most a couple
       times per run. At control < 25 we add a per-photo nudge to its
       baseline rotation. The corkboard now lives in the office scene; if
       it's not currently mounted we skip — when it remounts, addModelPhoto
       reapplies tilt to the new node. */
    const tiltLevel = (Game.state && Game.state.control != null && Game.state.control < 25) ? 1 : 0;
    if (tiltLevel !== lastPhotoTiltLevel) {
      lastPhotoTiltLevel = tiltLevel;
      const cork = _corkboardNode();
      if (cork) {
        const photos = cork.querySelectorAll('.corkboard-photo');
        photos.forEach((p, i) => {
          const baseAttr = p.getAttribute('data-base-rot');
          const base = baseAttr != null ? parseFloat(baseAttr) : 0;
          const extra = tiltLevel ? ((i % 2 === 0) ? -7 : 7) : 0;
          p.style.setProperty('--rot', (base + extra).toFixed(2) + 'deg');
        });
      }
    }

    /* Wall clock — one rotation step per in-game day. The minute hand
       sweeps 360° over a 7-day week; the hour hand creeps 30° per day
       (a 12-day "clock day"). Only set vars when the day actually
       changed so we don't re-trigger transitions every tick. */
    const dayNum = (Game.state && typeof Game.state.day === 'number')
      ? Math.floor(Game.state.day)
      : 0;
    if (dayNum !== lastClockDay) {
      lastClockDay = dayNum;
      const minRot = ((dayNum % 7) / 7) * 360;
      const hourRot = (dayNum % 12) * 30;
      st.setProperty('--room-clock-min-rot', minRot.toFixed(1) + 'deg');
      st.setProperty('--room-clock-hour-rot', hourRot.toFixed(1) + 'deg');
    }
  }

  /* ---- corkboard reconciliation ----------------------------------------
     The corkboard lives in TEAM.app now — it may not be mounted on every
     tick. When it isn't, we silently no-op; when it remounts (player opens
     TEAM.app), the office scene's reconcile pass repopulates it from the
     surviving photoIndex / state.models. */

  function _reconcileCorkboard() {
    const cork = _corkboardNode();
    if (!cork) return;
    const s = Game.state;
    const models = (s && Array.isArray(s.models)) ? s.models : [];

    /* Drop any cached entries whose DOM node has been detached (scene
       remount discards them). Any model still in state.models will be
       re-added below. */
    Object.keys(photoIndex).forEach(k => {
      const node = photoIndex[k];
      if (!node || !node.isConnected) delete photoIndex[k];
    });

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

    /* Empty-state hint: when no photos are pinned yet, show a quiet line
       so the panel doesn't read as a broken container. */
    const hasPhotos = !!cork.querySelector('.corkboard-photo');
    let empty = cork.querySelector('.corkboard-empty');
    if (!hasPhotos) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'corkboard-empty';
        empty.textContent = 'No models pinned yet.';
        cork.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  /* ---- API -------------------------------------------------------------- */

  function init() {
    _cacheNodes();
    if (!docRoot) return;

    /* Reset eased values to baseline. */
    cur.saturation = 1;
    cur.flicker = 0;
    cur.cloud = 0;
    cur.phone = 0;
    cur.yellow = 0;
    cur.darkness = 0;

    /* Wipe any lingering pulse overrides from a prior run. */
    Object.keys(pulses).forEach(k => delete pulses[k]);

    /* Drop any photos cached from the prior run; the office scene will
       repopulate from state.models when TEAM.app next renders. */
    Object.keys(photoIndex).forEach(k => delete photoIndex[k]);
    const cork = _corkboardNode();
    if (cork) cork.innerHTML = '';

    /* Clear inline styles we may have set last run. */
    if (nodeRoomBack) {
      nodeRoomBack.style.filter = '';
      nodeRoomBack.style.boxShadow = '';
    }
    if (nodeDeskPhone) nodeDeskPhone.classList.remove('ringing');

    lastProtesterLevel = -1;
    _renderProtesters(0);
    lastPhotoTiltLevel = -1;
    lastClockDay = -1;

    /* Defensive: pre-existing models on a loaded save show up immediately
       once the corkboard scene mounts. */
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
    const cork = _corkboardNode();
    if (!cork || !model || model.id == null) return;
    const key = String(model.id);
    if (photoIndex[key] && photoIndex[key].isConnected) return photoIndex[key];

    /* Drop any "no models pinned" empty-state line — a real photo is
       arriving. */
    const empty = cork.querySelector('.corkboard-empty');
    if (empty) empty.remove();

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

    cork.appendChild(el);
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
