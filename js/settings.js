/* settings.js — Global player settings (NOT on Game.state).
   Settings persist across runs in localStorage and are applied on load
   so that systems started afterwards (sim, transitions) read corrected
   values from the start. */

window.Game = window.Game || {};

Game.settings = (function() {
  const STORAGE_KEY = 'idle-optimizer:settings:v1';

  /* Defaults — also the canonical shape. */
  const DEFAULTS = {
    animSpeed: 'standard',   // 'reduced' | 'standard' | 'cinematic'
    tickMs: 1000,            // 500..2000
    sound: false,
    highContrast: false,
    confirmMajor: false,
  };

  /* Live state — readers should treat these as read-only and go through
     set() to mutate so persistence + apply happens together. */
  let current = Object.assign({}, DEFAULTS);

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only copy known keys — defends against stale / extra fields.
        for (const k of Object.keys(DEFAULTS)) {
          if (parsed[k] !== undefined) current[k] = parsed[k];
        }
        // Type / range guard.
        if (!['reduced','standard','cinematic'].includes(current.animSpeed)) {
          current.animSpeed = DEFAULTS.animSpeed;
        }
        current.tickMs = clamp(Number(current.tickMs) || DEFAULTS.tickMs, 500, 2000);
        current.sound = !!current.sound;
        current.highContrast = !!current.highContrast;
        current.confirmMajor = !!current.confirmMajor;
      }
    } catch (e) {
      // Corrupt or unavailable storage — fall through to defaults.
      current = Object.assign({}, DEFAULTS);
    }
    apply();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      // Storage quota / privacy mode — settings still apply for the session.
    }
  }

  /* Push the current values into the running game. Safe to call any time;
     guards against modules not yet loaded. */
  function apply() {
    // Animation speed → CSS variable consumed by transitions in styles.css.
    const mult = current.animSpeed === 'reduced' ? 0
               : current.animSpeed === 'cinematic' ? 2
               : 1;
    document.documentElement.style.setProperty('--anim-mult', String(mult));

    // High contrast — body class.
    if (document.body) {
      document.body.classList.toggle('high-contrast', !!current.highContrast);
    }

    // Tick rate — write to config and restart sim if it's running.
    if (Game.config) Game.config.tickMs = current.tickMs;
    if (Game.sim && Game.sim._intervalId) {
      Game.sim.stop();
      Game.sim.start();
    }
  }

  function get(key) {
    if (key === undefined) return Object.assign({}, current);
    return current[key];
  }

  function set(key, value) {
    if (!(key in DEFAULTS)) return;
    if (key === 'tickMs') value = clamp(Number(value) || DEFAULTS.tickMs, 500, 2000);
    if (key === 'animSpeed' && !['reduced','standard','cinematic'].includes(value)) return;
    if (key === 'sound' || key === 'highContrast' || key === 'confirmMajor') value = !!value;
    current[key] = value;
    save();
    apply();
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    current = Object.assign({}, DEFAULTS);
    apply();
  }

  /* Wipes ALL local state for the game (settings + any future save data)
     and reloads the page. Used by the "Reset all data" danger button. */
  function resetAllData() {
    try { localStorage.clear(); } catch (e) {}
    location.reload();
  }

  return {
    DEFAULTS,
    load,
    save,
    apply,
    get,
    set,
    reset,
    resetAllData,
  };
})();
