/* options.js — Wires the #options-screen form to Game.settings.
   Stays small: every control reads from Game.settings on refresh() and
   writes through Game.settings.set() on change. The settings module
   handles persistence + apply. */

window.Game = window.Game || {};

Game.options = (function() {
  let _wired = false;
  let _resetState = 'idle';   // 'idle' | 'armed'
  let _resetTimer = null;

  function $(id) { return document.getElementById(id); }

  function refresh() {
    const s = Game.settings.get();

    // Animation speed radios.
    const radios = document.querySelectorAll('input[name="opt-anim-speed"]');
    radios.forEach(r => { r.checked = (r.value === s.animSpeed); });

    // Tick rate slider + readout.
    const slider = $('opt-tick-slider');
    const readout = $('opt-tick-readout');
    if (slider) slider.value = s.tickMs;
    if (readout) readout.textContent = s.tickMs + ' ms';

    // Toggles.
    const sound = $('opt-sound');
    if (sound) sound.checked = !!s.sound;
    const hc = $('opt-high-contrast');
    if (hc) hc.checked = !!s.highContrast;
    const cm = $('opt-confirm-major');
    if (cm) cm.checked = !!s.confirmMajor;

    // Reset button label.
    armReset(false, true);
  }

  function armReset(arm, silent) {
    const btn = $('opt-reset-data');
    if (!btn) return;
    if (_resetTimer) { clearTimeout(_resetTimer); _resetTimer = null; }
    if (arm) {
      _resetState = 'armed';
      btn.textContent = 'Click again to confirm';
      btn.classList.add('armed');
      _resetTimer = setTimeout(() => armReset(false), 4000);
    } else {
      _resetState = 'idle';
      btn.textContent = 'Reset all data';
      btn.classList.remove('armed');
    }
    if (silent) { /* no-op marker — kept for clarity */ }
  }

  function wire() {
    if (_wired) return;
    _wired = true;

    // Animation speed.
    document.querySelectorAll('input[name="opt-anim-speed"]').forEach(r => {
      r.addEventListener('change', () => {
        if (r.checked) Game.settings.set('animSpeed', r.value);
      });
    });

    // Tick rate slider — live readout, but only commit on input (which
    // restarts sim on each tick step). Cheap: sim restart is just clearInterval.
    const slider = $('opt-tick-slider');
    if (slider) {
      slider.addEventListener('input', () => {
        const v = Number(slider.value);
        const ro = $('opt-tick-readout');
        if (ro) ro.textContent = v + ' ms';
        Game.settings.set('tickMs', v);
      });
    }

    // Toggles.
    const sound = $('opt-sound');
    if (sound) sound.addEventListener('change', () => Game.settings.set('sound', sound.checked));
    const hc = $('opt-high-contrast');
    if (hc) hc.addEventListener('change', () => Game.settings.set('highContrast', hc.checked));
    const cm = $('opt-confirm-major');
    if (cm) cm.addEventListener('change', () => Game.settings.set('confirmMajor', cm.checked));

    // Back button.
    const back = $('opt-back-btn');
    if (back) back.addEventListener('click', () => {
      armReset(false);
      if (Game.menu) Game.menu.showMain();
    });

    // Reset all data — two-click confirm.
    const reset = $('opt-reset-data');
    if (reset) reset.addEventListener('click', () => {
      if (_resetState === 'idle') {
        armReset(true);
      } else {
        armReset(false);
        Game.settings.resetAllData();
      }
    });
  }

  return { wire, refresh };
})();
