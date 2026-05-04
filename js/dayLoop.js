/* dayLoop.js — End-of-day "Papers Please" decision beat.
   Owns the rhythm: every N in-game days, halt the sim, show a recap of what
   happened, deal 3 cards, let the player pick a subset, then sleep and
   advance. N varies by stage — stage 1 is daily, stage 2 weekly, stage 3
   roughly monthly — so the weight of each pick scales with the act.

   sim.js calls Game.dayLoop.checkBoundary() each tick.
   main.js wires the "Sleep on it" button to Game.dayLoop.endDay(). */

window.Game = window.Game || {};

(function() {
  // Snapshot taken when end-of-day is entered, so the recap can diff.
  let recapSnapshot = null;

  function safeFounder(s) {
    return (s && s.founder) ? s.founder : null;
  }

  Game.dayLoop = {
    /* === Tempo === */

    // Days between end-of-day panels, by stage.
    //   Stage 1 = 1 day  → frequent, intimate
    //   Stage 2 = 3 days → "Friday wrap-up"
    //   Stage 3 = 7 days → "weekly briefing"
    dayLength: function(state) {
      const stage = (state && state.stage) || 1;
      if (stage <= 1) return 1;
      if (stage === 2) return 3;
      return 7;
    },

    // How many cards the player picks per panel.
    // Stage 3 is ONE card (heavier, more consequential).
    pickLimit: function(state) {
      const stage = (state && state.stage) || 1;
      return stage >= 3 ? 1 : 2;
    },

    // First boundary should sit ~5 days into the run so the player
    // gets to breathe before sleep #1.
    initFor: function(state) {
      if (!state) return;
      // Only nudge it if it still looks fresh (initial value 1).
      if (state.lastDayBoundary == null || state.lastDayBoundary <= 1) {
        state.lastDayBoundary = 5;
      }
    },

    /* === Tick hook === */
    checkBoundary: function() {
      const s = Game.state;
      if (!s) return;
      if (s.runEnded) return;
      if (s.dayPhase !== 'working') return;
      // Don't fight other modal gates — let the pivot/incident resolve first.
      if (s.pendingDecision) return;
      const length = Game.dayLoop.dayLength(s);
      const elapsed = (s.day || 0) - (s.lastDayBoundary || 0);
      if (elapsed >= length) {
        Game.dayLoop.enterEndOfDay();
      }
    },

    /* === Phase entry === */
    enterEndOfDay: function() {
      const s = Game.state;
      if (!s || s.runEnded) return;

      // Snapshot key resources so the recap can diff against them.
      recapSnapshot = {
        day: s.day,
        lastBoundary: s.lastDayBoundary,
        compute: s.compute || 0,
        money: s.money || 0,
        capability: s.capability || 0,
        capabilityTier: s.capabilityTier || 0,
        trust: s.trust || 0,
        control: s.control || 0,
        dependence: s.dependence || 0,
        logCount: (s.logs || []).length,
        pivotCount: (s.stats && s.stats.pivotCount) || 0,
        incidentCount: (s.stats && s.stats.incidentCount) || 0,
      };

      s.dayPhase = 'end-of-day';
      s.pendingDayCards = (Game.dayCardData && Game.dayCardData.pickFor)
        ? Game.dayCardData.pickFor(s, 3)
        : [];

      Game.dayLoop.renderOverlay();
    },

    /* === DOM render === */
    renderOverlay: function() {
      const s = Game.state;
      if (!s) return;
      if (s.runEnded) return;

      const overlay  = document.getElementById('end-of-day-overlay');
      const titleEl  = document.getElementById('eod-title');
      const subEl    = document.getElementById('eod-subtitle');
      const recapEl  = document.getElementById('eod-recap');
      const cardsEl  = document.getElementById('eod-cards');
      const endBtn   = document.getElementById('eod-end-btn');
      if (!overlay || !cardsEl) return;

      const dayInt = Math.floor(s.day);
      const length = Game.dayLoop.dayLength(s);
      const limit  = Game.dayLoop.pickLimit(s);

      // --- Header ---
      if (titleEl) {
        if (length >= 7)      titleEl.textContent = 'End Of Week';
        else if (length >= 3) titleEl.textContent = 'End Of Cycle';
        else                  titleEl.textContent = 'End Of Day';
      }
      if (subEl) {
        const weekday = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayInt % 7];
        subEl.textContent = `Day ${dayInt} — A ${weekday}.`;
      }

      // --- Recap ---
      if (recapEl) {
        recapEl.innerHTML = '';
        const snap = recapSnapshot || {};
        const dCompute = (s.compute || 0)    - (snap.compute || 0);
        const dMoney   = (s.money || 0)      - (snap.money || 0);
        const dCap     = (s.capability || 0) - (snap.capability || 0);
        const tieredUp = (s.capabilityTier || 0) > (snap.capabilityTier || 0);
        const newPivot = ((s.stats && s.stats.pivotCount) || 0)    > (snap.pivotCount || 0);
        const newInc   = ((s.stats && s.stats.incidentCount) || 0) > (snap.incidentCount || 0);

        function row(lbl, val, klass) {
          const r = document.createElement('div');
          r.className = 'recap-row';
          const l = document.createElement('span');
          l.className = 'lbl';
          l.textContent = lbl;
          const v = document.createElement('span');
          v.className = 'val' + (klass ? (' ' + klass) : '');
          v.textContent = val;
          r.appendChild(l); r.appendChild(v);
          recapEl.appendChild(r);
        }
        const periodLbl = length >= 7 ? 'This week' : length >= 3 ? 'This cycle' : 'Today';
        row(periodLbl, `Day ${dayInt} closed.`);
        row('Compute earned',  fmtNum(dCompute), dCompute > 0 ? 'good' : '');
        row('Capital change',  (dMoney >= 0 ? '+$' : '-$') + fmtNum(Math.abs(dMoney)), dMoney >= 0 ? 'good' : 'bad');
        row('Capability gain', '+' + fmtNum(Math.max(0, dCap)), dCap > 0 ? 'good' : '');
        if (tieredUp) row('Tier-up', 'Yes', 'good');
        if (newPivot) row('Pivot taken', 'Yes', 'good');
        if (newInc)   row('Incident', 'Yes', 'bad');

        const flavor = document.createElement('p');
        flavor.textContent = pickFlavor({
          dCompute, dMoney, dCap, tieredUp, newPivot, newInc, stage: s.stage,
        });
        recapEl.appendChild(flavor);
      }

      // --- Cards ---
      cardsEl.innerHTML = '';
      const cards = s.pendingDayCards || [];
      if (!cards.length) {
        const empty = document.createElement('div');
        empty.className = 'eod-card disabled';
        empty.textContent = 'No cards drawn. Sleep is the only choice.';
        cardsEl.appendChild(empty);
      }
      for (const card of cards) {
        const el = document.createElement('div');
        el.className = 'eod-card';
        el.dataset.cardId = card.id;
        const taken = (s.dayCardsTaken || []).some(t => t && t.id === card.id && t._thisRound);
        if (taken) el.classList.add('taken');
        el.innerHTML = `
          <div class="card-head">
            <span class="card-icon">${card.icon || '•'}</span>
            <span class="card-tag">${card.tag || ''}</span>
          </div>
          <div class="card-title">${card.title || ''}</div>
          <div class="card-body">${card.body || ''}</div>
          <div class="card-effect">${card.effectShort || ''}</div>
        `;
        el.addEventListener('click', function() {
          if (el.classList.contains('taken') || el.classList.contains('disabled')) return;
          Game.dayLoop.takeCard(card.id);
        });
        cardsEl.appendChild(el);
      }

      // --- Pick counter + button state ---
      const actionsEl = document.querySelector('.eod-actions');
      if (actionsEl) {
        let counter = actionsEl.querySelector('.pick-counter');
        if (!counter) {
          counter = document.createElement('span');
          counter.className = 'pick-counter';
          actionsEl.insertBefore(counter, endBtn);
        }
        const taken = countTakenThisRound(s);
        counter.textContent = `Picked ${taken}/${limit}`;
      }
      if (endBtn) {
        const taken = countTakenThisRound(s);
        endBtn.disabled = taken < limit;
        endBtn.textContent = taken >= limit ? 'Sleep on it' : `Pick ${limit - taken} more`;
      }

      Game.ui.openOverlay('end-of-day-overlay');
    },

    /* === Card pick === */
    takeCard: function(cardId) {
      const s = Game.state;
      if (!s) return;
      const card = (s.pendingDayCards || []).find(c => c && c.id === cardId);
      if (!card) return;
      const limit = Game.dayLoop.pickLimit(s);
      if (countTakenThisRound(s) >= limit) return;
      // Already taken this round?
      if ((s.dayCardsTaken || []).some(t => t && t.id === cardId && t._thisRound)) return;

      try {
        if (typeof card.effect === 'function') card.effect(s);
      } catch (e) {
        // Defensive: don't crash the loop if a card's effect throws.
        if (Game.addLog) Game.addLog('A decision dissolved into the noise of the day.', '');
      }
      const dayInt = Math.floor(s.day);
      s.dayCardsTaken = s.dayCardsTaken || [];
      s.dayCardsTaken.push({
        id: card.id,
        title: card.title,
        day: dayInt,
        stage: s.stage,
        _thisRound: true,
      });
      if (Game.addLog) Game.addLog(`Day ${dayInt}: chose "${card.title}".`, '');
      Game.dayLoop.renderOverlay();
    },

    /* === Sleep button === */
    endDay: function() {
      const s = Game.state;
      if (!s) return;

      // Refill founder energy and bleed off some stress.
      const f = safeFounder(s);
      if (f) {
        f.energy = f.maxEnergy || 100;
        f.stress = Math.max(0, (f.stress || 0) - 10);
        // Mood based on stress/energy.
        if (f.stress >= 70) f.mood = 'shaken';
        else if (f.stress >= 45) f.mood = 'tired';
        else if (f.energy >= 90 && f.stress <= 20) f.mood = 'serene';
        else if (f.stress <= 25) f.mood = 'focused';
        else f.mood = 'wired';
      }

      // Clear "this round" markers so picks become permanent history but
      // future renders treat them as historical, not the current pick.
      (s.dayCardsTaken || []).forEach(t => { if (t) delete t._thisRound; });

      s.pendingDayCards = [];
      s.lastDayBoundary = Math.floor(s.day);
      s.dayPhase = 'working';

      Game.ui.closeOverlay('end-of-day-overlay');

      if (Game.ui && Game.ui.refresh) Game.ui.refresh();
    },
  };

  /* === Helpers === */
  function countTakenThisRound(s) {
    return (s.dayCardsTaken || []).filter(t => t && t._thisRound).length;
  }

  function fmtNum(n) {
    if (!isFinite(n)) return '0';
    const abs = Math.abs(n);
    if (abs >= 1000) return (n / 1000).toFixed(1) + 'k';
    if (abs >= 100)  return n.toFixed(0);
    if (abs >= 10)   return n.toFixed(1);
    return n.toFixed(2);
  }

  function pickFlavor(ctx) {
    const lines = [];
    if (ctx.newInc) lines.push('A messy day. Something broke that the team will be talking about for a while.');
    else if (ctx.tieredUp) lines.push('A milestone. The lab is not the same shape it was this morning.');
    else if (ctx.newPivot) lines.push('A pivot has been called. The team is recalibrating.');
    else if (ctx.dCap > 50) lines.push('The capability work is moving. Faster than is comfortable.');
    else if (ctx.dMoney > 1000) lines.push('Money came in. The runway extended a little.');
    else if (ctx.dCompute > 30) lines.push('A productive day. The interpretability team logged a small win.');
    else if (ctx.stage === 3) lines.push('A quiet day at this scale is never quite quiet.');
    else lines.push('A flat day. Heads down. Lights stayed on.');
    return lines[0];
  }
})();
