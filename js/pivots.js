/* pivots.js — Major Pivots: one-way doors with rich flavor.
   ~6–8 pivots in v1.0 (data lives in js/data/pivots.js). Most become
   available between Beacon and Lighthouse tiers, trickling in.

   Each pivot is the heaviest narrative beat the game produces outside of
   endings — multi-paragraph in-world flavor, real team reactions, choices
   that close other doors permanently. These are the Reigns moments.

   This module:
     - scans Game.pivotData.list every Nth tick for newly-available pivots,
     - shows them via #pivot-overlay (or auto-decides if Auto-Strategist),
     - records the player's choice in state.pivots and runs choice.effect.
*/

window.Game = window.Game || {};

Game.pivots = (function() {

  // Rate-limit: only check every N ticks. Pivots aren't a tight-loop concern.
  const CHECK_INTERVAL = 20;
  let _lastCheckTick = -999;

  function isTaken(pivotId) {
    return Game.state && Game.state.pivots && (pivotId in Game.state.pivots);
  }

  function isExcludedByTaken(pivot) {
    if (!pivot.excludes || !pivot.excludes.length) return false;
    for (const ex of pivot.excludes) {
      if (isTaken(ex)) return true;
    }
    return false;
  }

  function checkAvailability() {
    const s = Game.state;
    if (!s || s.runEnded || s.pendingDecision) return;
    if (!Game.pivotData || !Game.pivotData.list) return;
    if (s.tickCount - _lastCheckTick < CHECK_INTERVAL) return;
    _lastCheckTick = s.tickCount;

    for (const pivot of Game.pivotData.list) {
      if (isTaken(pivot.id)) continue;
      if (isExcludedByTaken(pivot)) continue;
      // Each pivot owns its availability predicate.
      let ok = false;
      try { ok = pivot.condition && pivot.condition(s); }
      catch (e) { ok = false; }
      if (!ok) continue;

      // Auto-Strategist + pivotPolicy === 'auto-decline': decline silently.
      const u = s.autopilot.unlocks;
      let policy = s.autopilot.custom.pivotPolicy;
      if (u['auto-strategist'] && policy === 'ask') {
        if (s.flags['safe-auto-decline']) policy = 'auto-decline';
        if (s.flags['frontier-auto-accept']) policy = 'auto-accept';
      }
      if (u['auto-strategist'] && policy === 'auto-decline') {
        // Mark as taken with a sentinel "-1" choice so we don't re-prompt.
        s.pivots[pivot.id] = -1;
        Game.addLog(`Auto-Strategist declined pivot: ${pivot.title}.`, 'autopilot');
        continue;
      }

      // Auto-Strategist + 'auto-accept' AND the pivot is flagged low-risk:
      // pick choice 0 (the conventional "accept") automatically.
      if (u['auto-strategist'] && policy === 'auto-accept' && pivot.lowRisk) {
        Game.addLog(`Auto-Strategist accepted pivot: ${pivot.title}.`, 'autopilot');
        takeChoice(pivot.id, 0);
        return; // one pivot per check
      }

      // Otherwise: halt the sim and surface the decision overlay.
      s.pendingDecision = { type: 'pivot', payload: pivot };
      show(pivot.id);
      return; // only one pivot at a time
    }
  }

  function findPivot(pivotId) {
    if (!Game.pivotData || !Game.pivotData.list) return null;
    return Game.pivotData.list.find(p => p.id === pivotId) || null;
  }

  function show(pivotId) {
    const pivot = findPivot(pivotId);
    if (!pivot) return;

    const overlay = document.getElementById('pivot-overlay');
    const titleEl = document.getElementById('pivot-title');
    const descEl = document.getElementById('pivot-desc');
    const flavorEl = document.getElementById('pivot-flavor');
    const choicesEl = document.getElementById('pivot-choices');
    if (!overlay || !choicesEl) return;

    const sub = Game.substitute || (x => x);
    if (titleEl) titleEl.textContent = pivot.title || 'Pivot';
    if (descEl) descEl.textContent = sub(pivot.desc || '');
    if (flavorEl) flavorEl.textContent = sub(pivot.flavor || '');

    // Wipe choices & rewire
    choicesEl.innerHTML = '';
    (pivot.choices || []).forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'action-btn pivot-choice-btn';
      btn.textContent = choice.label || `Option ${idx + 1}`;
      if (choice.subtitle) {
        const sub = document.createElement('span');
        sub.className = 'choice-sub';
        sub.textContent = choice.subtitle;
        btn.appendChild(document.createElement('br'));
        btn.appendChild(sub);
      }
      btn.addEventListener('click', () => takeChoice(pivot.id, idx));
      choicesEl.appendChild(btn);
    });

    overlay.classList.remove('hidden');
  }

  function takeChoice(pivotId, choiceIdx) {
    const s = Game.state;
    if (!s) return;
    const pivot = findPivot(pivotId);
    if (!pivot) return;
    const choice = (pivot.choices || [])[choiceIdx];
    if (!choice) return;

    // Apply effect
    try { if (choice.effect) choice.effect(s); }
    catch (e) { console.error('Pivot effect failed:', pivotId, e); }

    /* Founder energy — pivots are heavy. We don't reject on exhaustion
       (pivots are mandatory once accepted), we just spend. */
    if (Game.founder && Game.founder.spendEnergy) {
      Game.founder.spendEnergy(25, 'pivot');
    }
    /* Trait reactions: Principled, Pragmatist, Hedger etc. */
    if (Game.founder && Game.founder.applyTraitEffects) {
      Game.founder.applyTraitEffects('pivot', { pivotId: pivotId, choiceIdx: choiceIdx });
    }

    // Record + bookkeeping
    s.pivots[pivotId] = choiceIdx;
    s.stats.pivotCount = (s.stats.pivotCount || 0) + 1;

    Game.addLog(`Pivot taken — ${pivot.title}: ${choice.label || ('option ' + (choiceIdx + 1))}.`, 'pivot');

    // Clear the gate + close overlay
    if (s.pendingDecision && s.pendingDecision.type === 'pivot' &&
        s.pendingDecision.payload && s.pendingDecision.payload.id === pivotId) {
      s.pendingDecision = null;
    }
    const overlay = document.getElementById('pivot-overlay');
    if (overlay) overlay.classList.add('hidden');

    if (Game.ui && Game.ui.refresh) Game.ui.refresh();
  }

  return {
    available: [],   // populated lazily; consumers can read
    checkAvailability,
    show,
    takeChoice,
  };
})();
