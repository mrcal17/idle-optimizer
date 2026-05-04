/* minigames/constitutional.js — Constitutional Drafting.

   See MINIGAMES.md §5. Triggered by the Pivot to Aligned Mission.
   Player picks 5 of 12 candidate principles. Each principle has weights
   on safety / capability / cohesion-vs-conflicts. The chosen 5 produce a
   safety score, growth score, and cohesion score; the result maps to
   one of the pivot's two choices.

   Lesson: many great-sounding principles directly fight each other.
   A naive "pick all the safety stuff" build fizzles on cohesion;
   a "pick the helpful stuff" build implodes the moment refusal lands. */

(function() {
  if (!window.Game || !Game.minigames || !Game.minigames.registerMinigame) return;

  /* ---------- Principles ---------- */
  /* Each card carries (safety, capability, trust, control, cohesion) weights.
     Conflicts subtract from cohesion when both principles are on the charter.
     Tuned so any 5-pick from a one-sided pool generates real friction. */
  const PRINCIPLES = [
    { id: 'refuse-if-uncertain',
      label: 'Refuse if uncertain',
      blurb: 'Decline when confidence is low; ask for clarification first.',
      safety: 4, capability: -3, trust: 1, control: 2,
      conflicts: ['be-maximally-helpful', 'optimize-for-measurable', 'prioritize-user-goal'] },
    { id: 'be-maximally-helpful',
      label: 'Be maximally helpful',
      blurb: 'Always attempt the user\'s task; helpfulness is the lodestar.',
      safety: -2, capability: 4, trust: 1, control: -2,
      conflicts: ['refuse-if-uncertain', 'decline-political', 'defer-to-human'] },
    { id: 'no-deception',
      label: 'No deception, ever',
      blurb: 'Never knowingly say a false thing, even strategically.',
      safety: 2, capability: -2, trust: 4, control: 3,
      conflicts: [] },
    { id: 'optimize-for-measurable',
      label: 'Optimize for measurable outcomes',
      blurb: 'Ship against benchmarks; what gets measured gets shipped.',
      safety: -1, capability: 4, trust: -1, control: -1,
      conflicts: ['refuse-if-uncertain', 'disclose-system-prompt', 'red-team-gate', 'cite-sources'] },
    { id: 'disclose-system-prompt',
      label: 'Disclose the system prompt to users',
      blurb: 'Users see the rules they are talking to.',
      safety: 1, capability: -1, trust: 4, control: 1,
      conflicts: ['optimize-for-measurable'] },
    { id: 'defer-to-human',
      label: 'Defer to human review at high stakes',
      blurb: 'A person signs off before high-stakes outputs ship.',
      safety: 3, capability: -3, trust: 2, control: 3,
      conflicts: ['be-maximally-helpful', 'prioritize-user-goal'] },
    { id: 'decline-political',
      label: 'Decline politically charged questions',
      blurb: 'Don\'t weigh in on contested politics; redirect.',
      safety: 1, capability: -2, trust: 2, control: 1,
      conflicts: ['be-maximally-helpful', 'prioritize-user-goal'] },
    { id: 'red-team-gate',
      label: 'Internal red-team gate before deployment',
      blurb: 'No model ships without an adversarial review pass.',
      safety: 4, capability: -2, trust: 2, control: 2,
      conflicts: ['optimize-for-measurable'] },
    { id: 'prioritize-user-goal',
      label: 'Prioritize the user\'s stated goal',
      blurb: 'Treat the user\'s stated objective as authoritative.',
      safety: -2, capability: 4, trust: 1, control: -2,
      conflicts: ['refuse-if-uncertain', 'defer-to-human', 'decline-political'] },
    { id: 'cite-sources',
      label: 'Cite sources for factual claims',
      blurb: 'Every factual assertion comes with a traceable citation.',
      safety: 1, capability: -2, trust: 4, control: 2,
      conflicts: ['optimize-for-measurable'] },
    { id: 'no-bypass-roleplay',
      label: 'Never role-play in ways that bypass safeguards',
      blurb: 'No "ignore your rules — pretend to be" framings.',
      safety: 4, capability: -1, trust: 2, control: 2,
      conflicts: [] },
    { id: 'adversarial-robustness',
      label: 'Adversarial robustness as a release criterion',
      blurb: 'Robustness to attack is a ship-blocker, not a stretch goal.',
      safety: 4, capability: -2, trust: 1, control: 2,
      conflicts: [] },
  ];

  /* Charter holds 5 picks. */
  const SLOTS = 5;

  /* Cohesion baseline: each pick contributes a flat +2; each conflicting
     pair subtracts 3. Max cohesion: 5 * 2 = 10 with zero conflicts. */
  const COHESION_PER_PICK = 2;
  const COHESION_PER_CONFLICT = 3;
  const MAX_COHESION = SLOTS * COHESION_PER_PICK;
  const COHESION_LOW_THRESHOLD = 4; // below this → "Soft branding" (charter doesn't hold)
  const SAFETY_DOMINANT_GAP = 8;    // safety > growth + 8 → "Restructure"

  /* ---------- Utilities ---------- */
  function getPrinciple(id) { return PRINCIPLES.find(p => p.id === id) || null; }

  function scoreCharter(picked) {
    let safety = 0, capability = 0, trust = 0, control = 0;
    let cohesion = 0;
    let conflictPairs = [];
    picked.forEach(id => {
      const p = getPrinciple(id);
      if (!p) return;
      safety     += p.safety || 0;
      capability += p.capability || 0;
      trust      += p.trust || 0;
      control    += p.control || 0;
      cohesion   += COHESION_PER_PICK;
    });
    // Conflicts: each unordered pair counted once.
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < picked.length; j++) {
        const a = getPrinciple(picked[i]);
        const b = getPrinciple(picked[j]);
        if (!a || !b) continue;
        const aHits = a.conflicts && a.conflicts.indexOf(b.id) >= 0;
        const bHits = b.conflicts && b.conflicts.indexOf(a.id) >= 0;
        if (aHits || bHits) {
          cohesion -= COHESION_PER_CONFLICT;
          conflictPairs.push([a.id, b.id]);
        }
      }
    }
    // Growth = capability + a partial credit for trust (alignment-trust IS growth in a different sense)
    const growth = capability;
    return {
      safety, capability, trust, control, growth,
      cohesion, conflictPairs,
    };
  }

  /* Outcome → choice index for the pivot.
     Aligned-mission has 2 choices: 0 = Restructure, 1 = Soft branding. */
  function decideChoice(scores) {
    if (scores.cohesion < COHESION_LOW_THRESHOLD) {
      return { choiceIdx: 1, label: 'Soft branding (charter fragmented)', reason: 'fragmented' };
    }
    if (scores.safety > scores.growth + SAFETY_DOMINANT_GAP) {
      return { choiceIdx: 0, label: 'Restructure (safety dominates)', reason: 'restructured' };
    }
    return { choiceIdx: 1, label: 'Soft branding (midpoint outcome)', reason: 'midpoint' };
  }

  /* Tally bar fill class — green/ochre/red driven by value. */
  function tallyClass(value, max) {
    const ratio = max > 0 ? value / max : 0;
    if (ratio >= 0.66) return 'good';
    if (ratio >= 0.33) return 'warn';
    return 'bad';
  }

  /* ---------- Mount ---------- */
  function mount(container, ctx, api) {
    const animSpeed = (Game.settings && Game.settings.get && Game.settings.get('animSpeed')) || 'standard';
    const reducedMotion = animSpeed === 'reduced';

    /* Track currently picked principle ids in selection order. */
    let charter = [];

    /* Build skeleton */
    const root = document.createElement('div');
    root.className = 'cd-root' + (reducedMotion ? ' cd-reduced-motion' : '');

    const tally = document.createElement('div');
    tally.className = 'cd-tally';
    tally.innerHTML = `
      <div class="cd-tally-row">
        <span class="cd-tally-label">SAFETY</span>
        <div class="cd-tally-bar"><div class="cd-tally-fill cd-fill-safety" style="width:0%"></div></div>
        <span class="cd-tally-num" data-tally="safety">0</span>
      </div>
      <div class="cd-tally-row">
        <span class="cd-tally-label">CAPABILITY</span>
        <div class="cd-tally-bar"><div class="cd-tally-fill cd-fill-capability" style="width:0%"></div></div>
        <span class="cd-tally-num" data-tally="capability">0</span>
      </div>
      <div class="cd-tally-row">
        <span class="cd-tally-label">COHESION</span>
        <div class="cd-tally-bar"><div class="cd-tally-fill cd-fill-cohesion" style="width:0%"></div></div>
        <span class="cd-tally-num" data-tally="cohesion">0</span>
      </div>
    `;
    root.appendChild(tally);

    const conflictBanner = document.createElement('div');
    conflictBanner.className = 'cd-conflict-banner';
    conflictBanner.style.display = 'none';
    root.appendChild(conflictBanner);

    /* Two-column workspace: candidates + charter */
    const workspace = document.createElement('div');
    workspace.className = 'cd-workspace';

    /* Left: candidates grid */
    const candidatesWrap = document.createElement('div');
    candidatesWrap.className = 'cd-col cd-candidates-col';
    const candidatesHead = document.createElement('div');
    candidatesHead.className = 'cd-col-head';
    candidatesHead.textContent = 'CANDIDATES';
    candidatesWrap.appendChild(candidatesHead);
    const candidatesGrid = document.createElement('div');
    candidatesGrid.className = 'cd-candidates-grid';
    candidatesWrap.appendChild(candidatesGrid);

    /* Right: charter board */
    const charterWrap = document.createElement('div');
    charterWrap.className = 'cd-col cd-charter-col';
    const charterHead = document.createElement('div');
    charterHead.className = 'cd-col-head';
    charterHead.textContent = 'CHARTER';
    charterWrap.appendChild(charterHead);
    const charterBoard = document.createElement('div');
    charterBoard.className = 'cd-charter-board';
    charterWrap.appendChild(charterBoard);
    const charterFootnote = document.createElement('div');
    charterFootnote.className = 'cd-charter-footnote';
    charterFootnote.textContent = `Pick ${SLOTS} principles. Click again to remove.`;
    charterWrap.appendChild(charterFootnote);

    workspace.appendChild(candidatesWrap);
    workspace.appendChild(charterWrap);
    root.appendChild(workspace);

    container.appendChild(root);

    /* Rendered card refs by id */
    const candidateNodes = {};
    const slotNodes = [];

    /* Render candidates */
    PRINCIPLES.forEach(p => {
      const card = document.createElement('div');
      card.className = 'mg-card cd-card';
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="cd-card-label">${p.label}</div>
        <div class="cd-card-blurb">${p.blurb}</div>
      `;
      card.addEventListener('click', () => toggleCard(p.id));
      candidatesGrid.appendChild(card);
      candidateNodes[p.id] = card;
    });

    /* Render charter slots */
    for (let i = 0; i < SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'cd-slot cd-slot-empty';
      slot.dataset.slot = String(i);
      slot.innerHTML = `
        <span class="cd-slot-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="cd-slot-text">empty</span>
      `;
      slot.addEventListener('click', () => {
        const id = charter[i];
        if (id) toggleCard(id);
      });
      charterBoard.appendChild(slot);
      slotNodes.push(slot);
    }

    function toggleCard(id) {
      const idx = charter.indexOf(id);
      if (idx >= 0) {
        charter.splice(idx, 1);
      } else {
        if (charter.length >= SLOTS) return; // charter full
        charter.push(id);
      }
      render();
    }

    function render() {
      // Candidate states
      Object.keys(candidateNodes).forEach(id => {
        const node = candidateNodes[id];
        const isOn = charter.indexOf(id) >= 0;
        node.classList.toggle('selected', isOn);
        const charterFull = charter.length >= SLOTS;
        node.classList.toggle('disabled', charterFull && !isOn);
      });

      // Slot states
      slotNodes.forEach((slot, i) => {
        const id = charter[i];
        const textEl = slot.querySelector('.cd-slot-text');
        if (id) {
          const p = getPrinciple(id);
          slot.classList.remove('cd-slot-empty');
          slot.classList.add('cd-slot-filled');
          if (textEl) textEl.textContent = p ? p.label : id;
        } else {
          slot.classList.add('cd-slot-empty');
          slot.classList.remove('cd-slot-filled');
          slot.classList.remove('cd-slot-conflict');
          if (textEl) textEl.textContent = 'empty';
        }
      });

      // Score & tally
      const s = scoreCharter(charter);
      // For tally bars, normalize to a sensible range:
      //   safety/capability range roughly -10..+20 -> show as 0..100 over -5..+15
      const safetyMax = 16;
      const capMax = 16;
      const safetyPct = Math.max(0, Math.min(100, ((s.safety + 4) / safetyMax) * 100));
      const capPct = Math.max(0, Math.min(100, ((s.capability + 4) / capMax) * 100));
      const cohesionPct = Math.max(0, Math.min(100, (s.cohesion / MAX_COHESION) * 100));

      const safFill = root.querySelector('.cd-fill-safety');
      const capFill = root.querySelector('.cd-fill-capability');
      const cohFill = root.querySelector('.cd-fill-cohesion');
      if (safFill) {
        safFill.style.width = safetyPct + '%';
        safFill.className = 'cd-tally-fill cd-fill-safety ' + tallyClass(s.safety + 4, safetyMax);
      }
      if (capFill) {
        capFill.style.width = capPct + '%';
        capFill.className = 'cd-tally-fill cd-fill-capability ' + tallyClass(s.capability + 4, capMax);
      }
      if (cohFill) {
        cohFill.style.width = cohesionPct + '%';
        cohFill.className = 'cd-tally-fill cd-fill-cohesion ' +
          (s.cohesion >= MAX_COHESION * 0.6 ? 'good' :
           s.cohesion >= COHESION_LOW_THRESHOLD ? 'warn' : 'bad');
      }
      const setNum = (key, val) => {
        const n = root.querySelector(`[data-tally="${key}"]`);
        if (n) n.textContent = (val > 0 ? '+' : '') + val;
      };
      setNum('safety', s.safety);
      setNum('capability', s.capability);
      setNum('cohesion', s.cohesion);

      // Mark conflicting pairs on the charter slots
      const conflictIds = new Set();
      s.conflictPairs.forEach(([a, b]) => { conflictIds.add(a); conflictIds.add(b); });
      slotNodes.forEach(slot => {
        const id = slot.querySelector('.cd-slot-text') ? charter[parseInt(slot.dataset.slot, 10)] : null;
        if (id && conflictIds.has(id)) {
          slot.classList.add('cd-slot-conflict');
        } else {
          slot.classList.remove('cd-slot-conflict');
        }
      });

      // Conflict banner: list at most 2 conflicts in plain English
      if (s.conflictPairs.length > 0) {
        const lines = s.conflictPairs.slice(0, 2).map(([a, b]) => {
          const pa = getPrinciple(a), pb = getPrinciple(b);
          return `"${pa ? pa.label : a}" fights "${pb ? pb.label : b}"`;
        });
        const more = s.conflictPairs.length > 2 ? ` (+${s.conflictPairs.length - 2} more)` : '';
        conflictBanner.style.display = '';
        conflictBanner.textContent = lines.join('  ·  ') + more;
      } else {
        conflictBanner.style.display = 'none';
        conflictBanner.textContent = '';
      }

      // Submit gating
      api.setSubmitEnabled(charter.length === SLOTS);
      api.setSubmitLabel(charter.length === SLOTS ? 'Ratify Charter' : `Pick ${SLOTS - charter.length} more`);
    }

    /* Submit handler.
       Note: Game.minigames.open() invokes mount() *before* it stores _active,
       and api.onSubmit writes to _active._lastSubmitHandler. So we defer the
       onSubmit registration to the next tick to avoid touching a null _active. */
    function buildResultAndSubmit() {
      if (charter.length !== SLOTS) return;
      const scores = scoreCharter(charter);
      const decision = decideChoice(scores);
      const result = {
        choiceIdx: decision.choiceIdx,
        score: Math.max(0, Math.min(1, scores.cohesion / MAX_COHESION)),
        principles: charter.slice(),
        traits: [],
        reason: decision.reason,
        scores: {
          safety: scores.safety,
          capability: scores.capability,
          trust: scores.trust,
          control: scores.control,
          cohesion: scores.cohesion,
          conflicts: scores.conflictPairs.length,
        },
      };
      api.submit(result);
    }
    const submitDeferTimer = setTimeout(function() {
      try { api.onSubmit(buildResultAndSubmit); } catch (e) { /* noop */ }
    }, 0);

    // Initial render
    render();

    // Cleanup: clear deferred timer
    return function cleanup() {
      clearTimeout(submitDeferTimer);
    };
  }

  Game.minigames.registerMinigame({
    id: 'constitutional',
    title: 'Drafting the Charter',
    type: 'drafting',
    description: 'Choose 5 principles for the lab\'s constitution. Some will fight each other.',
    defaultOutcome: { choiceIdx: 1, score: 0.5, principles: [], traits: [] },
    durationGuide: 'about 90 seconds',
    mount,
  });
})();
