/* handlers.js — The Handlers / NPC system.
   Three recurring characters appear as video-call windows pinned over the
   terminal: G-Man (OpenLight VC), the Lead Researcher (Mira), and Big-E
   (P(doom) Live). Each has a personality, a tone, and a set of dialogue
   scenarios parameterized by state.

   Calls are HEAVY beats — they pause ambient gameplay (via
   state.pendingDecision) and demand a response or a deliberate "let it
   ring." Reserve them for genuinely earned moments. Light advisor blurbs
   continue to flow through Game.events.advise.

   Wiring:
     - Game.handlers.tick() runs every sim tick (rate-limited, see TICK_GAP).
     - It scans every handler's scenarios, picks the highest-priority one
       whose condition() holds and which hasn't fired this run, and shows it.
     - Once-per-run is enforced via state.flags['handler-fired-<scenarioId>'].
     - Programmatic triggers go through Game.handlers.trigger(handlerId, scenarioId).
     - External hooks (capital, control band, tier-up, paradigm) bias which
       scenarios are eligible but the actual fire still goes through the
       same condition() gate.
*/

window.Game = window.Game || {};

Game.handlers = (function() {

  const TICK_GAP = 30;            // min ticks between handler calls
  const FIRST_TICK_GRACE = 8;     // never fire on the very first ticks of a run
  const AUTO_IGNORE_MS = 12000;   // "let it ring" window before auto-dismiss

  let _lastFireTick = -999;
  let _autoIgnoreTimer = null;
  let _activeScenario = null;     // { handlerId, scenarioId, scenario, handler }
  let _wired = false;

  function _firedFlag(scenarioId) {
    return 'handler-fired-' + scenarioId;
  }

  function _hasFired(state, scenarioId) {
    return !!(state.flags && state.flags[_firedFlag(scenarioId)]);
  }

  function _markFired(state, scenarioId) {
    if (!state.flags) state.flags = {};
    state.flags[_firedFlag(scenarioId)] = true;
  }

  function _findHandler(handlerId) {
    if (!Game.handlerData || !Game.handlerData.handlers) return null;
    return Game.handlerData.handlers[handlerId] || null;
  }

  function _findScenario(handlerId, scenarioId) {
    const h = _findHandler(handlerId);
    if (!h || !Array.isArray(h.scenarios)) return null;
    return h.scenarios.find(sc => sc.id === scenarioId) || null;
  }

  /* Pick the highest-priority eligible scenario across all handlers. */
  function _pickEligible(state) {
    if (!Game.handlerData || !Game.handlerData.handlers) return null;
    let best = null;
    let bestPriority = -Infinity;
    const handlers = Game.handlerData.handlers;
    for (const handlerId in handlers) {
      const h = handlers[handlerId];
      if (!h || !Array.isArray(h.scenarios)) continue;
      for (const sc of h.scenarios) {
        const oncePerRun = (sc.oncePerRun !== false);  // default true
        if (oncePerRun && _hasFired(state, sc.id)) continue;
        let ok = false;
        try { ok = !!(sc.condition && sc.condition(state)); }
        catch (e) { ok = false; }
        if (!ok) continue;
        const pr = (typeof sc.priority === 'number') ? sc.priority : 0;
        if (pr > bestPriority) {
          bestPriority = pr;
          best = { handlerId, scenarioId: sc.id, scenario: sc, handler: h };
        }
      }
    }
    return best;
  }

  /* ---------- public API ---------- */

  function init() {
    /* Defensive: wipe any stale active scenario UI at run start. The DOM
       node is shared across runs (single-page app) and a previous run
       might have left it visible. */
    const frame = document.getElementById('handler-frame');
    if (frame) frame.classList.add('hidden');
    _clearAutoIgnore();
    _activeScenario = null;
    _lastFireTick = -999;
    if (Game.room && Game.room.hangUpPhone) Game.room.hangUpPhone();
    if (_wired) return;
    _wired = true;
  }

  function tick() {
    const s = Game.state;
    if (!s) return;
    if (s.runEnded) return;
    if (s.pendingDecision) return;          // don't stack overlays
    if (s.dayPhase === 'end-of-day') return;
    if (s.tickCount < FIRST_TICK_GRACE) return;
    if (s.tickCount - _lastFireTick < TICK_GAP) return;

    const pick = _pickEligible(s);
    if (!pick) return;
    show(pick.handlerId, pick.scenarioId);
  }

  function show(handlerId, scenarioId) {
    const s = Game.state;
    if (!s) return;
    if (s.pendingDecision) return;          // never overwrite a live gate

    const handler = _findHandler(handlerId);
    const scenario = _findScenario(handlerId, scenarioId);
    if (!handler || !scenario) return;

    const frame = document.getElementById('handler-frame');
    const portraitEl = document.getElementById('handler-portrait');
    const nameEl = document.getElementById('handler-name');
    const lineEl = document.getElementById('handler-line');
    const optionsEl = document.getElementById('handler-options');
    const callEl = document.getElementById('handler-call');
    if (!frame || !lineEl || !optionsEl) return;

    /* Populate header + portrait. */
    if (portraitEl) portraitEl.textContent = handler.portrait || '📺';
    if (nameEl) nameEl.textContent = handler.name || handlerId.toUpperCase();
    if (callEl && handler.baseColor) {
      /* Use --archetype CSS var on the call element so border + shadow pick
         up the per-handler tint without overwriting global theme. */
      callEl.style.setProperty('--archetype', handler.baseColor);
    }

    /* Compose the line. line(state) returns the raw text; route through
       Game.substitute so {lab}/{model} placeholders work even if the
       scenario uses them in addition to the inline lab/model lookups. */
    let raw = '';
    try { raw = scenario.line ? scenario.line(s) : ''; }
    catch (e) { raw = ''; console.error('handler line() failed', handlerId, scenarioId, e); }
    const text = (Game.substitute ? Game.substitute(raw) : raw) || '';
    lineEl.textContent = text;

    /* Options. Each option binds to _resolve, which applies effect, marks
       fired, dismisses, and optionally routes to a follow-up (pivot). */
    optionsEl.innerHTML = '';
    const options = scenario.options || [];
    let hasAutoIgnore = false;
    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = opt.label || `Option ${idx + 1}`;
      btn.addEventListener('click', () => _resolve(opt));
      optionsEl.appendChild(btn);
      if (opt.autoIgnore) hasAutoIgnore = true;
    });
    if (!options.length) {
      /* Defensive: every scenario should ship with at least one option,
         but if it doesn't, we add a Continue so the player isn't stuck. */
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = 'Continue';
      btn.addEventListener('click', () => _resolve(null));
      optionsEl.appendChild(btn);
    }

    /* Mark the gate, remember active. */
    s.pendingDecision = {
      type: 'handler',
      payload: { handlerId, scenarioId },
    };
    _activeScenario = { handlerId, scenarioId, scenario, handler };
    _lastFireTick = s.tickCount;

    frame.classList.remove('hidden');
    if (Game.room && Game.room.ringPhone) Game.room.ringPhone(handlerId);

    /* "Let it ring": if any option is flagged autoIgnore, schedule auto-
       dismissal that picks that option as if the player walked away. */
    _clearAutoIgnore();
    if (hasAutoIgnore) {
      _autoIgnoreTimer = setTimeout(() => {
        _autoIgnoreTimer = null;
        const ignoreOpt = (scenario.options || []).find(o => o.autoIgnore);
        if (ignoreOpt) {
          /* Add an extra penalty if they walked: small Trust hit unless
             the option's effect already moves Trust. We don't know what
             the effect does without inspecting it, so we just apply the
             effect — scenario authors set Trust deltas on autoIgnore
             options themselves. */
          _resolve(ignoreOpt);
        } else {
          _resolve(null);
        }
      }, AUTO_IGNORE_MS);
    }

    /* Log so the player can see in their feed what just happened. */
    Game.addLog(`${handler.name} called.`, 'beat');
  }

  function _resolve(opt) {
    const s = Game.state;
    if (!s) return;

    _clearAutoIgnore();

    /* Apply the choice effect. */
    if (opt && typeof opt.effect === 'function') {
      try { opt.effect(s); }
      catch (e) { console.error('handler option effect failed', e); }
    }

    /* Mark scenario as fired (once-per-run). */
    if (_activeScenario && _activeScenario.scenarioId) {
      _markFired(s, _activeScenario.scenarioId);
    }

    /* Founder energy: handler calls are heavier than advisor blurbs but
       lighter than pivots. Spend a small amount. Defensive against the
       module being absent. */
    if (Game.founder && Game.founder.spendEnergy) {
      try { Game.founder.spendEnergy(8, 'handler'); }
      catch (e) { /* swallow */ }
    }

    /* Optional route — e.g. "route: 'pivot:ipo'" jumps directly into the
       IPO pivot once the handler closes. */
    let route = (opt && opt.route) || null;

    dismiss();

    if (route && typeof route === 'string') {
      const m = route.match(/^pivot:(.+)$/);
      if (m && Game.pivots && Game.pivots.show) {
        const pivotId = m[1];
        /* Defer slightly so the handler frame has cleared and the pending
           decision slot is free for the pivot overlay. */
        setTimeout(() => {
          if (!Game.state) return;
          if (Game.state.pendingDecision) return;
          /* Set the pivot gate via the pivots module's own conventions. */
          if (Game.pivotData && Game.pivotData.list) {
            const pivot = Game.pivotData.list.find(p => p.id === pivotId);
            if (pivot) {
              Game.state.pendingDecision = { type: 'pivot', payload: pivot };
              Game.pivots.show(pivotId);
            }
          }
        }, 60);
      }
    }
  }

  function _clearAutoIgnore() {
    if (_autoIgnoreTimer) {
      clearTimeout(_autoIgnoreTimer);
      _autoIgnoreTimer = null;
    }
  }

  function dismiss() {
    const s = Game.state;
    const frame = document.getElementById('handler-frame');
    if (frame) frame.classList.add('hidden');
    _clearAutoIgnore();
    if (s && s.pendingDecision && s.pendingDecision.type === 'handler') {
      s.pendingDecision = null;
    }
    _activeScenario = null;
    if (Game.room && Game.room.hangUpPhone) Game.room.hangUpPhone();
    if (Game.ui && Game.ui.refresh) Game.ui.refresh();
  }

  /* Programmatic trigger: used by hooks below or by other systems for
     scripted moments. Bypasses the rate-limit but still respects the
     active-decision gate (we won't stack overlays). */
  function trigger(handlerId, scenarioId) {
    const s = Game.state;
    if (!s || s.runEnded) return;
    if (s.pendingDecision) return;
    const sc = _findScenario(handlerId, scenarioId);
    if (!sc) return;
    if ((sc.oncePerRun !== false) && _hasFired(s, scenarioId)) return;
    /* Still respect condition() so an external hook can't violate
       narrative invariants (e.g. firing the apex-buyer call at tier 0). */
    let ok = true;
    try { ok = !sc.condition || !!sc.condition(s); }
    catch (e) { ok = false; }
    if (!ok) return;
    show(handlerId, scenarioId);
  }

  /* ---------- external hooks ----------
     These are nudges. They don't directly fire — they let the next tick()
     pass over the now-eligible scenario. Some hooks call trigger() for
     immediate beats. */

  function onCapitalMilestone(amount) {
    /* No-op for now — the capital-shaped scenarios all gate via condition()
       on state.money. Hook is left in place for future explicit triggers. */
    void amount;
  }

  function onControlDrop(level) {
    /* When control crosses 25 going down, lock in the LR low-control
       stance immediately so the dialogue downstream is consistent.
       Otherwise the stance picks itself the first time the scenario fires. */
    const s = Game.state;
    if (!s) return;
    if (typeof level === 'number' && level <= 25 && !s.flags['lr-low-stance']) {
      s.flags['lr-low-stance'] = (Math.random() < 0.5) ? 'calm' : 'frantic';
    }
  }

  function onTierUp(tier) {
    /* No-op — the tier-up scenarios are eligible by condition() on
       state.capabilityTier and the tick loop will pick them. We keep the
       hook so events.js can be wired later without changes here. */
    void tier;
  }

  function onParadigmShift(shift) {
    /* No-op — paradigm-shift scenarios condition on state.paradigms.length. */
    void shift;
  }

  return {
    init,
    tick,
    show,
    dismiss,
    trigger,
    onCapitalMilestone,
    onControlDrop,
    onTierUp,
    onParadigmShift,
  };
})();
