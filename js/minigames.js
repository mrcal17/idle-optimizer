/* minigames.js — The minigame framework.

   See MINIGAMES.md for the design.

   Each minigame is a self-contained spec registered via
   Game.minigames.registerMinigame(spec). The framework provides:
     - a generic overlay shell (title, description, content area, footer)
     - lifecycle (open / close / skip)
     - sim halt via state.pendingDecision
     - default-outcome fallback so every minigame is skippable
     - state.minigameLog persistence so outcomes are traceable

   This module is thin. Per-minigame UI lives in its own module. */

window.Game = window.Game || {};

Game.minigames = (function() {

  /* ---------- registry ---------- */
  const registry = {};

  function registerMinigame(spec) {
    if (!spec || !spec.id) return;
    if (typeof spec.mount !== 'function') return;
    registry[spec.id] = spec;
  }

  function get(id) { return registry[id] || null; }

  /* ---------- internal state ---------- */
  let _active = null;        // { id, spec, ctx, opts, cleanup }
  let _wired = false;

  /* ---------- DOM refs (lazy) ---------- */
  function dom() {
    return {
      overlay:   document.getElementById('minigame-overlay'),
      title:     document.getElementById('minigame-title'),
      kind:      document.getElementById('minigame-kind'),
      desc:      document.getElementById('minigame-desc'),
      content:   document.getElementById('minigame-content'),
      time:      document.getElementById('minigame-time'),
      actions:   document.getElementById('minigame-actions'),
      skip:      document.getElementById('minigame-skip'),
      submit:    document.getElementById('minigame-submit'),
    };
  }

  function wireOnce() {
    if (_wired) return;
    const d = dom();
    if (!d.skip) return;
    d.skip.addEventListener('click', () => {
      if (!_active) return;
      const spec = _active.spec;
      const result = spec.defaultOutcome ? Object.assign({}, spec.defaultOutcome) : { score: 0 };
      result.skipped = true;
      _finish(result);
    });
    d.submit.addEventListener('click', () => {
      // The minigame wires its own submit via api.setSubmitEnabled / api.submit;
      // this fallback is for keyboard accessibility.
      if (!_active) return;
      // If the minigame didn't override the submit handler, treat as skip.
      if (typeof _active._lastSubmitHandler === 'function') {
        _active._lastSubmitHandler();
      }
    });
    _wired = true;
  }

  /* ---------- public: open / close / skip ---------- */

  function open(id, opts) {
    opts = opts || {};
    const spec = get(id);
    if (!spec) {
      // Unknown minigame — call onComplete with skip-default if provided
      if (opts.onComplete) opts.onComplete({ id, skipped: true, score: 0 });
      return false;
    }

    // Don't stack — if one is already open, defer or replace?
    if (_active) {
      // Replace: cleanly close the existing one with its default outcome.
      _finish({ skipped: true, replaced: true });
    }

    wireOnce();

    // Halt sim via pendingDecision so the tick loop respects it.
    if (Game.state) {
      Game.state.pendingDecision = { type: 'minigame', payload: { id } };
    }

    const d = dom();
    if (!d.overlay) {
      // No DOM target — fall back to default outcome
      if (opts.onComplete && spec.defaultOutcome) opts.onComplete(spec.defaultOutcome);
      return false;
    }

    // Populate shell
    if (d.title) d.title.textContent = spec.title || 'Minigame';
    if (d.kind)  d.kind.textContent  = spec.type ? spec.type.toUpperCase() : '';
    if (d.desc)  d.desc.textContent  = spec.description || '';
    if (d.time)  d.time.textContent  = spec.durationGuide || '';
    if (d.content) d.content.innerHTML = '';
    if (d.submit) {
      d.submit.disabled = true;
      d.submit.textContent = 'Submit';
    }

    // Settings: respect Auto-skip Minigames
    if (Game.settings && Game.settings.get && Game.settings.get('autoSkipMinigames')) {
      // Auto-skip: apply default outcome immediately and don't show.
      if (Game.state) Game.state.pendingDecision = null;
      const result = spec.defaultOutcome ? Object.assign({}, spec.defaultOutcome) : { score: 0 };
      result.skipped = true;
      result.autoSkipped = true;
      if (opts.onComplete) opts.onComplete(result);
      return true;
    }

    d.overlay.classList.remove('hidden');
    document.body.classList.add('has-modal');

    // Build the api object that the minigame uses
    const api = {
      submit(result) {
        result = result || {};
        result.skipped = false;
        _finish(result);
      },
      skip() {
        const result = spec.defaultOutcome ? Object.assign({}, spec.defaultOutcome) : { score: 0 };
        result.skipped = true;
        _finish(result);
      },
      setSubmitEnabled(enabled) {
        if (d.submit) d.submit.disabled = !enabled;
      },
      setSubmitLabel(label) {
        if (d.submit) d.submit.textContent = label || 'Submit';
      },
      onSubmit(handler) {
        // The minigame wires its actual submit via the framework's button.
        _active._lastSubmitHandler = handler;
      },
      setTimeRemaining(text) {
        if (d.time) d.time.textContent = text || '';
      },
      ctx: opts.context || {},
    };

    // Mount the minigame and remember its cleanup fn (if returned)
    let cleanup = null;
    try {
      cleanup = spec.mount(d.content, opts.context || {}, api) || null;
    } catch (e) {
      console.error('Minigame mount failed:', spec.id, e);
      // Fallback: skip
      if (Game.state) Game.state.pendingDecision = null;
      if (d.overlay) d.overlay.classList.add('hidden');
      document.body.classList.remove('has-modal');
      const result = spec.defaultOutcome ? Object.assign({}, spec.defaultOutcome) : { score: 0 };
      result.skipped = true;
      result.error = true;
      if (opts.onComplete) opts.onComplete(result);
      return false;
    }

    _active = { id, spec, opts, cleanup, _lastSubmitHandler: null };
    return true;
  }

  function close(result) {
    if (!_active) return;
    _finish(result || { skipped: true });
  }

  function _finish(result) {
    if (!_active) return;
    const active = _active;
    _active = null;

    // Run cleanup if the minigame returned one
    try { if (typeof active.cleanup === 'function') active.cleanup(); }
    catch (e) { console.error('Minigame cleanup failed:', active.id, e); }

    // Hide overlay
    const d = dom();
    if (d.overlay) d.overlay.classList.add('hidden');
    document.body.classList.remove('has-modal');

    // Persist to log
    if (Game.state) {
      if (!Array.isArray(Game.state.minigameLog)) Game.state.minigameLog = [];
      Game.state.minigameLog.push({
        id: active.id,
        day: Game.state.day,
        outcome: result,
        score: result && typeof result.score === 'number' ? result.score : 0,
      });
      if (Game.state.minigameLog.length > 100) Game.state.minigameLog.shift();
    }

    // Clear sim halt
    if (Game.state && Game.state.pendingDecision &&
        Game.state.pendingDecision.type === 'minigame') {
      Game.state.pendingDecision = null;
    }

    // Light log entry
    if (Game.addLog) {
      const verb = result && result.skipped ? 'skipped' : 'completed';
      const scoreStr = (result && typeof result.score === 'number')
        ? ` · score ${(result.score * 100).toFixed(0)}%` : '';
      Game.addLog(`Minigame ${verb}: ${active.spec.title || active.id}${scoreStr}.`,
                  result && result.skipped ? 'warn' : 'tier');
    }

    // Resume UI
    if (Game.ui && Game.ui.refresh) Game.ui.refresh();

    // Notify caller
    if (active.opts && typeof active.opts.onComplete === 'function') {
      try { active.opts.onComplete(result); }
      catch (e) { console.error('Minigame onComplete failed:', e); }
    }
  }

  /* ---------- expose ---------- */
  return {
    registry,
    registerMinigame,
    open,
    close,
    get,
    isActive() { return !!_active; },
  };
})();
