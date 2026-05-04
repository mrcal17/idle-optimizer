/* boot.js — POST-style typewriter intro.
   Plays once on page load, fills #boot-screen, then fades out and calls
   onComplete(). Skippable: any click during boot fast-forwards to the
   completion. A 5s safety timeout guarantees we never hang. */

window.Game = window.Game || {};

Game.boot = (function() {
  // Lines: most are dead-serious; the P(doom) line is the one wink.
  const LINES = [
    { label: 'FOUNDRY-OS v0.1', value: '[system rom]', kind: 'header' },
    { label: '> POST',          value: 'OK' },
    { label: '> CPU',           value: 'OK' },
    { label: '> MEM',           value: '2.1 MiB' },
    { label: '> NETWORK',       value: 'ONLINE' },
    { label: '> P(doom)',       value: 'ASSESSING' },
    { label: '> READY.',        value: '' },
  ];

  const STAGGER_MS = 240;     // between lines
  const HOLD_MS = 600;        // pause after READY.
  const FADE_MS = 400;
  const SAFETY_MS = 5000;

  let _running = false;
  let _timers = [];
  let _onComplete = null;

  function clearTimers() {
    for (const t of _timers) clearTimeout(t);
    _timers = [];
  }

  function renderLine(line) {
    const row = document.createElement('div');
    row.className = 'boot-line' + (line.kind === 'header' ? ' boot-line-header' : '');
    const lbl = document.createElement('span');
    lbl.className = 'boot-line-label';
    lbl.textContent = line.label;
    row.appendChild(lbl);
    if (line.value) {
      const val = document.createElement('span');
      val.className = 'boot-line-value';
      val.textContent = line.value;
      row.appendChild(val);
    }
    return row;
  }

  function finish() {
    if (!_running) return;
    _running = false;
    clearTimers();
    const screen = document.getElementById('boot-screen');
    if (screen) {
      screen.classList.add('boot-fading');
      // Wait for fade then hide + invoke callback.
      setTimeout(() => {
        screen.classList.add('hidden');
        screen.classList.remove('boot-fading');
        const cb = _onComplete;
        _onComplete = null;
        if (typeof cb === 'function') cb();
      }, FADE_MS);
    } else {
      const cb = _onComplete;
      _onComplete = null;
      if (typeof cb === 'function') cb();
    }
  }

  function run(onComplete) {
    _onComplete = onComplete;
    const screen = document.getElementById('boot-screen');
    if (!screen) {
      // No DOM — fall straight through.
      finish();
      return;
    }
    _running = true;
    screen.classList.remove('hidden');
    screen.classList.remove('boot-fading');

    // Wipe any stale lines (idempotent on re-entry).
    const list = screen.querySelector('.boot-lines');
    if (list) list.innerHTML = '';

    // Skip-on-click: any click anywhere during boot.
    const skip = () => {
      screen.removeEventListener('click', skip, true);
      window.removeEventListener('keydown', skip, true);
      finish();
    };
    screen.addEventListener('click', skip, true);
    window.addEventListener('keydown', skip, true);

    // Stagger lines.
    LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        if (!_running) return;
        try {
          if (list) list.appendChild(renderLine(line));
        } catch (e) { /* defensive — never let render throw block finish */ }
      }, i * STAGGER_MS);
      _timers.push(t);
    });

    // Hold then fade.
    const finalT = setTimeout(() => {
      if (_running) finish();
    }, LINES.length * STAGGER_MS + HOLD_MS);
    _timers.push(finalT);

    // Safety net: even if something throws, exit after SAFETY_MS.
    const safety = setTimeout(() => {
      if (_running) finish();
    }, SAFETY_MS);
    _timers.push(safety);
  }

  return { run };
})();
