/* founder.js — Founder character module.
   Owns the energy / mood / stress / traits behaviour and the always-visible
   vitals widget DOM. Big actions cost energy; long days build stress;
   accumulated traits compound across the run.

   Loaded after data modules (founder-data.js) but before ui.js so that
   ui.refresh can defensively call into renderVitals.

   No ES modules. All state mutations stay routed through state.founder. */

window.Game = window.Game || {};

Game.founder = (function () {

  /* Track last-rendered mood so we only update the DOM label on change. */
  let _lastRenderedMood = null;
  let _lastEnergyZeroLogged = false;

  /* Helpers --------------------------------------------------------------- */

  function getF() {
    if (!Game.state || !Game.state.founder) return null;
    return Game.state.founder;
  }

  function archetype(state) {
    if (!state || !state.archetypeId) return null;
    return (Game.archetypes && Game.archetypes[state.archetypeId]) || null;
  }

  /* Apply a mood -> CSS hook on the widget so styles can react. Cheap. */
  function setMoodOnDom(mood) {
    const widget = document.getElementById('vitals-widget');
    if (!widget) return;
    widget.dataset.mood = mood;
  }

  /* Choose Trust/Control/Dependence fill color based on threshold. */
  function pressureClass(value, isInverted) {
    // For Trust/Control: high is good. For Dependence: high is bad (isInverted).
    const v = isInverted ? (100 - value) : value;
    if (v >= 60) return 'good';
    if (v >= 30) return 'warn';
    return 'bad';
  }

  /* API ------------------------------------------------------------------ */

  function init(state) {
    if (!state) return;
    if (!state.founder) {
      state.founder = {
        portrait: null,
        energy: 100,
        maxEnergy: 100,
        mood: 'focused',
        traits: [],
        stress: 0,
      };
    } else {
      state.founder.energy = 100;
      state.founder.maxEnergy = 100;
      state.founder.mood = 'focused';
      state.founder.traits = [];
      state.founder.stress = 0;
    }

    // Pick portrait — archetype's founderPortrait wins, else a random pick
    // from the archetype's pool (defined in founder-data.js).
    const arch = archetype(state);
    if (arch && arch.founderPortrait) {
      state.founder.portrait = arch.founderPortrait;
    } else if (Game.founderData && Game.founderData.pickPortrait) {
      state.founder.portrait = Game.founderData.pickPortrait(state.archetypeId);
    } else {
      state.founder.portrait = '👤';
    }

    _lastRenderedMood = null;
    _lastEnergyZeroLogged = false;

    // Initial render so the widget shows correct values immediately.
    renderVitals();
  }

  function tick() {
    const f = getF();
    const s = Game.state;
    if (!f || !s) return;

    /* Stress drift — pressure causes it to climb. */
    let stressDelta = 0;
    if (s.trust < 50 || s.control < 50) stressDelta += 0.05;
    if (s.dependence > 70) stressDelta += 0.10;

    /* Stress decay — calm work shaves it back down. */
    const calm = (s.trust >= 50 && s.control >= 50 && s.dependence <= 70);
    if (calm) stressDelta -= 0.02;

    f.stress = Math.max(0, Math.min(100, f.stress + stressDelta));

    /* Mood derivation — only assigns; renderVitals handles label change. */
    if (Game.founderData && Game.founderData.computeMood) {
      f.mood = Game.founderData.computeMood(s);
    }

    /* Run any tick-trigger traits */
    applyTraitEffects('tick');
  }

  function spendEnergy(amount, reason) {
    const f = getF();
    if (!f) return true;  // No founder state — nothing to gate.
    amount = Math.max(0, amount || 0);
    if (f.energy < amount) {
      // Exhausted — log once, set tired mood, bump stress.
      if (!_lastEnergyZeroLogged) {
        Game.addLog && Game.addLog("You're running on fumes.", 'warn');
        _lastEnergyZeroLogged = true;
      }
      f.mood = 'tired';
      f.stress = Math.min(100, f.stress + 10);
      return false;
    }
    f.energy = Math.max(0, f.energy - amount);
    if (f.energy <= 0) {
      f.mood = 'tired';
      f.stress = Math.min(100, f.stress + 10);
      if (!_lastEnergyZeroLogged) {
        Game.addLog && Game.addLog("You're running on fumes.", 'warn');
        _lastEnergyZeroLogged = true;
      }
    } else {
      // Still have some — clear the once-flag so a future zero re-logs.
      _lastEnergyZeroLogged = false;
    }
    return true;
  }

  function gainTrait(traitId) {
    const s = Game.state;
    const f = getF();
    if (!s || !f) return false;
    if (!Array.isArray(f.traits)) f.traits = [];
    if (f.traits.indexOf(traitId) >= 0) return false;
    f.traits.push(traitId);
    const data = Game.founderData && Game.founderData.findTrait
      ? Game.founderData.findTrait(traitId)
      : null;
    if (data) {
      Game.addLog && Game.addLog(`New trait: ${data.name}.`, 'trait');
      if (Game.events && Game.events.advise) {
        Game.events.advise('You', `${data.name}: ${data.desc}`);
      }
    } else {
      Game.addLog && Game.addLog(`New trait: ${traitId}.`, 'trait');
    }
    return true;
  }

  function applyTraitEffects(triggerType, ctx) {
    const s = Game.state;
    const f = getF();
    if (!s || !f || !Array.isArray(f.traits)) return;
    const lookup = Game.founderData && Game.founderData.findTrait;
    if (!lookup) return;
    for (const tid of f.traits) {
      const t = lookup(tid);
      if (!t) continue;
      if (t.trigger !== triggerType) continue;
      if (typeof t.effect !== 'function') continue;
      try { t.effect(s, ctx || {}); }
      catch (e) { console.error('Founder trait effect failed:', tid, e); }
    }
  }

  /* DOM rendering -------------------------------------------------------- */

  function renderVitals() {
    const s = Game.state;
    const f = getF();
    if (!s || !f) return;

    const portraitEl = document.getElementById('vw-portrait-glyph');
    if (portraitEl && f.portrait) portraitEl.textContent = f.portrait;

    /* Mood — only update DOM on change to avoid noise. */
    const moodEl = document.getElementById('vw-mood');
    if (moodEl && f.mood !== _lastRenderedMood) {
      moodEl.textContent = f.mood || 'focused';
      _lastRenderedMood = f.mood;
      setMoodOnDom(f.mood);
    }

    /* Energy bar */
    const energyEl = document.getElementById('vw-energy-fill');
    if (energyEl) {
      const max = f.maxEnergy > 0 ? f.maxEnergy : 100;
      const pct = Math.max(0, Math.min(100, (f.energy / max) * 100));
      energyEl.style.width = pct.toFixed(1) + '%';
    }

    /* Pressures: trust / control / dependence. */
    const trustEl = document.getElementById('vw-trust-fill');
    if (trustEl) {
      const v = Math.max(0, Math.min(100, s.trust || 0));
      trustEl.style.width = v.toFixed(1) + '%';
      trustEl.classList.remove('good', 'warn', 'bad');
      trustEl.classList.add(pressureClass(v, false));
    }
    const controlEl = document.getElementById('vw-control-fill');
    if (controlEl) {
      const v = Math.max(0, Math.min(100, s.control || 0));
      controlEl.style.width = v.toFixed(1) + '%';
      controlEl.classList.remove('good', 'warn', 'bad');
      controlEl.classList.add(pressureClass(v, false));
    }
    const depEl = document.getElementById('vw-dep-fill');
    if (depEl) {
      const v = Math.max(0, Math.min(100, s.dependence || 0));
      depEl.style.width = v.toFixed(1) + '%';
      depEl.classList.remove('good', 'warn', 'bad');
      depEl.classList.add(pressureClass(v, true));  // dependence is inverted
    }
  }

  function showVitals() {
    const w = document.getElementById('vitals-widget');
    if (!w) return;
    w.classList.remove('hidden');
    // Force a reflow + opacity transition so it fades in rather than pops.
    w.style.opacity = '0';
    // Next frame: restore.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { w.style.opacity = ''; });
    });
  }

  function hideVitals() {
    const w = document.getElementById('vitals-widget');
    if (!w) return;
    w.classList.add('hidden');
    _lastRenderedMood = null;
  }

  /* expose */
  return {
    init,
    tick,
    spendEnergy,
    gainTrait,
    applyTraitEffects,
    renderVitals,
    showVitals,
    hideVitals,
  };

})();
