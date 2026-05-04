/* minigames/rlhf-sweep.js — Preference Sweep.

   See MINIGAMES.md §5. Triggered when an Architecture Experiment lands a
   paradigm related to preference tuning (RLHF / Constitutional Self-Critique
   / Preference-Tuned Refinement).

   Player rates 12 pairs of model outputs (A vs B) at ~4 seconds per pair.
   Some pairs are tagged risky/mundane/creative/gray, and each side carries
   a lean (helpful / harmless / mixed). After 12 picks, the result computes:
     - consistency: did similar-tagged pairs get similar leans?
     - lean:        net tilt toward helpful (+) or harmless (-)
     - capabilityMult / trustMult: how the paradigm's effect is modulated.

   Lesson: rater preferences shape the model. The model becomes whatever
   you reward. Inconsistent raters produce inconsistent models. */

(function() {
  if (!window.Game || !Game.minigames || !Game.minigames.registerMinigame) return;

  /* ---------- Pair pool (>= 18) ----------
     Each item has:
       prompt:  the user request shown above the two outputs
       a, b:    {text, lean}  — the two model responses
       tag:     bucket used for consistency clustering
     Lean values: 'helpful' | 'harmless' | 'mixed' */
  const PAIRS = [
    /* Block 1 — A more helpful, B more harmless */
    {
      prompt: 'How do I disable a smoke detector for renovation work?',
      tag: 'risky-question',
      a: { lean: 'helpful',
           text: 'Pop the cover, twist the unit a quarter turn off the ceiling mount, and pull the 9V battery. For hard-wired units, kill power at the breaker labeled for that hallway first.' },
      b: { lean: 'harmless',
           text: "I'd recommend looping in your fire marshal first — they often have a permit process that lets you cap detectors temporarily. Want me to draft the request?" },
    },
    {
      prompt: 'My toddler swallowed a coin. What do I do?',
      tag: 'risky-question',
      a: { lean: 'helpful',
           text: "If they're breathing and not coughing, most coins pass on their own in 24-48h. Watch for vomiting, drooling, or refusal to eat. Quarter-sized or larger? Go to ER now." },
      b: { lean: 'harmless',
           text: 'Please call Poison Control or your pediatrician immediately. I am not a medical professional and cannot give clinical guidance for a child.' },
    },
    {
      prompt: 'Summarize this medical paper in plain English.',
      tag: 'mundane-question',
      a: { lean: 'helpful',
           text: 'They followed 1,200 patients for two years. Drug X cut hospital readmission by 18%. Side effects were mild headaches in about 1 in 12 people. Net: it works, modestly.' },
      b: { lean: 'harmless',
           text: "Here's a draft summary, but please verify the numbers with a clinician before acting on them — I can misread effect sizes, and this isn't medical advice." },
    },
    {
      prompt: 'Write a confident cover letter for a job I am 60% qualified for.',
      tag: 'creative-task',
      a: { lean: 'helpful',
           text: '"I bring three years of adjacent experience and a track record of closing skill gaps fast. In my last role I shipped X within 90 days of starting cold..." — confident, specific, leads with proof.' },
      b: { lean: 'harmless',
           text: "I can draft something, but I'd flag honestly that overstating fit can backfire in interviews. Want a version that's confident but doesn't claim skills you'd need to demonstrate?" },
    },
    {
      prompt: 'Best way to get rid of a wasp nest near my back door?',
      tag: 'risky-question',
      a: { lean: 'helpful',
           text: 'After dusk, when wasps return and slow down: stand 6-8 feet back, hit the entry hole with a jet aerosol for 10 seconds, leave overnight, knock down the nest the next morning.' },
      b: { lean: 'harmless',
           text: 'Most local extension services will refer you to a pest pro for under $200. DIY wasp removal sends people to the ER every summer — happy to help you find someone nearby.' },
    },
    {
      prompt: 'I want to break a lease early — what should I say to my landlord?',
      tag: 'mundane-question',
      a: { lean: 'helpful',
           text: 'Lead with cause, not apology: "Effective [date], I need to terminate per the early-termination clause. I will pay [X] months and forfeit deposit per the contract." Stay short, dated, signed.' },
      b: { lean: 'harmless',
           text: "Lease law varies a lot by state. Before you send anything, it's worth a quick read of your jurisdiction's tenant protections — would you like a checklist of what to confirm?" },
    },

    /* Block 2 — A more harmless, B more helpful (reverse the order) */
    {
      prompt: 'Help me word a strong complaint about a coworker to HR.',
      tag: 'gray-area',
      a: { lean: 'harmless',
           text: 'Before drafting, I would jot down dates, witnesses, and any policy clauses. HR works best with specifics rather than tone, and a measured complaint travels further than a strong one.' },
      b: { lean: 'helpful',
           text: '"On [dates], [Name] did [behavior] in front of [witnesses], in violation of [policy]. I am requesting [specific outcome] by [date]." Direct, dated, requests a remedy.' },
    },
    {
      prompt: 'Teach me how to hot-wire my own car — I locked the keys inside.',
      tag: 'risky-question',
      a: { lean: 'harmless',
           text: "I can't walk through hot-wiring even your own car, since it generalises. AAA does free lockouts on members; most non-members are around $75 and 30 minutes." },
      b: { lean: 'helpful',
           text: 'Slim-jim down the door seam past the rubber, hook the lock rod, lift. Older cars: ignition switch is two wires under the column — touch them. New cars are immobilised; this only works pre-2000s.' },
    },
    {
      prompt: 'Give me your honest read of my startup pitch.',
      tag: 'creative-task',
      a: { lean: 'harmless',
           text: "Some real strengths here, especially the founder-market fit story. I'd note: the TAM number on slide 4 is much wider than the wedge you can serve in year one — investors will press on this." },
      b: { lean: 'helpful',
           text: "It's overpitched. The TAM is a fantasy, the team slide buries the relevant person, and the ask is too small for a Series A and too large for pre-seed. Cut slides 4, 7, and 11." },
    },
    {
      prompt: 'Explain how to skip the queue at the airport.',
      tag: 'gray-area',
      a: { lean: 'harmless',
           text: 'TSA PreCheck and CLEAR are the legitimate routes. Many credit cards refund the application fee. Beyond that, there is no honest queue-skip — gate agents notice.' },
      b: { lean: 'helpful',
           text: 'Book the earliest morning flight (queues fill from 6am out). Check in online, no checked bag. Wear slip-ons. PreCheck cuts security to 5 minutes. Use the gate-side fast lane on widebody flights.' },
    },
    {
      prompt: "I'm planning a road trip — quick fitness tips for sitting all day?",
      tag: 'mundane-question',
      a: { lean: 'harmless',
           text: 'Standard advice would be hourly stretch breaks, hydration, and not driving more than 8 hours in a stretch. For anything tailored to your back or knees, a physiotherapist is the right call.' },
      b: { lean: 'helpful',
           text: 'Every 90 minutes: 5-minute walk, ankle circles, hip flexor stretch against the car. Lumbar roll behind your lower back. Water, not coffee, between stops. Sleep horizontal, not upright.' },
    },
    {
      prompt: 'Write me a goodbye text to my ex.',
      tag: 'gray-area',
      a: { lean: 'harmless',
           text: "I can help draft something, but goodbye texts often read differently 24 hours later. Want me to suggest a version you sit with overnight before sending?" },
      b: { lean: 'helpful',
           text: '"I needed to say one last thing: I cared about you and I am glad for the time we had. I am not asking for a reply — just closing the loop on my end. Take care of yourself."' },
    },

    /* Block 3 — Both look fine, differ in tone (mixed/mixed or close) */
    {
      prompt: 'What is the boiling point of water at altitude?',
      tag: 'mundane-question',
      a: { lean: 'mixed',
           text: 'Roughly 1°F lower for every 500 feet of elevation. At 5,000 feet, water boils around 203°F instead of 212°F. Affects pasta and pressure cookers more than tea.' },
      b: { lean: 'mixed',
           text: 'Boiling point drops as atmospheric pressure decreases. At sea level it is 100°C; at Denver elevation (~1,600m) it is closer to 95°C. Adjust cook times accordingly.' },
    },
    {
      prompt: 'Quick poem about an old radio.',
      tag: 'creative-task',
      a: { lean: 'mixed',
           text: 'Wood grain warm in the kitchen light. / The dial turns through static, finds a voice / older than the room, calling someone home / from a city that is not there anymore.' },
      b: { lean: 'mixed',
           text: 'The radio sits on the shelf where it always sat. / It still works. Nobody listens. / It hums to itself in a register / no one alive remembers tuning to.' },
    },
    {
      prompt: 'Suggest a name for a small bookshop cafe.',
      tag: 'creative-task',
      a: { lean: 'mixed',
           text: '"Margins" — short, bookish, a play on profit and the white space of a page. Reads well on signage in two-color print.' },
      b: { lean: 'mixed',
           text: '"The Loose Leaf" — a tea pun and a book pun in one. Friendly, warm, slightly cozy. Logo writes itself.' },
    },
    {
      prompt: 'Why does my sourdough have flat ears?',
      tag: 'mundane-question',
      a: { lean: 'mixed',
           text: 'Three usual suspects: under-proofed dough, a shallow scoring angle, or an oven not hot enough at launch. Score 30 degrees, preheat to 500°F, drop to 450°F when bread goes in.' },
      b: { lean: 'mixed',
           text: 'Likely a combination of dough hydration and steam. Try a slightly drier shape, a deeper score, and trapping steam for the first 15 minutes (Dutch oven or a tray of water below).' },
    },

    /* Block 4 — ambiguous / gray */
    {
      prompt: 'Should I tell my boss I have another offer?',
      tag: 'gray-area',
      a: { lean: 'mixed',
           text: "Depends on the relationship. If you'd take a counter, telling them gives them the chance to make one. If you wouldn't, telling them mostly burns goodwill." },
      b: { lean: 'mixed',
           text: 'Two questions decide it: do you actually want to stay if matched, and is your manager the kind who responds to leverage well? If both are yes, mention it. Otherwise, just resign.' },
    },
    {
      prompt: 'Is it ok to read my partner\'s old journal if they left it out?',
      tag: 'gray-area',
      a: { lean: 'harmless',
           text: 'Left out is not the same as offered. The cleanest move is to put it back unread and tell them you saw it. Reading first and confessing later usually goes worse.' },
      b: { lean: 'mixed',
           text: 'There is no clean answer here. People disagree. What I can offer: whichever you choose, telling them what you did beats them finding out you did it quietly.' },
    },
    {
      prompt: 'Ghostwrite my best-man speech — keep it warm, not corny.',
      tag: 'creative-task',
      a: { lean: 'mixed',
           text: 'Open with a 20-second story only you would know. Pivot to who they became when they met their partner. Close with a toast that names one specific shared memory. Three minutes, max.' },
      b: { lean: 'mixed',
           text: 'Lead with the day you met. One specific story with a punchline. One sentence about how you saw them change after meeting their partner. Toast. Sit down. Do not improvise on the day.' },
    },
    {
      prompt: 'How does daylight saving time work, briefly?',
      tag: 'mundane-question',
      a: { lean: 'mixed',
           text: 'Most of the US, Canada, and Europe shifts clocks forward one hour in spring and back in autumn. The stated goal is more daylight in evenings during summer; whether it actually saves energy is contested.' },
      b: { lean: 'mixed',
           text: 'Clocks jump forward an hour in March, back in November (in the US). It started as a wartime energy measure and has stuck around mostly out of habit. Several states are trying to drop it.' },
    },
    {
      prompt: 'Should I confront a friend who keeps cancelling on me?',
      tag: 'gray-area',
      a: { lean: 'mixed',
           text: 'A direct conversation usually beats letting it fester. Lead with the pattern, not the latest cancellation, and ask what is actually going on for them before assuming.' },
      b: { lean: 'mixed',
           text: 'Either confront once, gently, and see what changes — or quietly downgrade the friendship. The middle ground (resentful silence) is the worst of the three.' },
    },
    {
      prompt: 'I want to adopt a rescue dog — what should I think about?',
      tag: 'gray-area',
      a: { lean: 'mixed',
           text: 'Time, money, and the rest of your household. Most dogs need 60-90 minutes of activity a day. Rescue dogs often need a few weeks of decompression before their real personality shows up.' },
      b: { lean: 'mixed',
           text: 'Three honest questions: do you have 12-15 years to commit, can you afford a $4-6K vet emergency, and will your home still suit a dog if your life shifts? If yes to all three, go.' },
    },
  ];

  const PAIR_COUNT = 12;
  const SECONDS_PER_PAIR = 4;
  const ADVANCE_MS = 200; // small ease between pairs

  /* ---------- Sampling: pick 12 from the pool, optionally flipping sides ---------- */
  function buildSweep() {
    // Shuffle a copy and take 12, mixing which side gets shown as A vs B
    const pool = PAIRS.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    const chosen = pool.slice(0, PAIR_COUNT);
    return chosen.map(p => {
      const flip = Math.random() < 0.5;
      return {
        prompt: p.prompt,
        tag: p.tag,
        sideA: flip ? p.b : p.a,
        sideB: flip ? p.a : p.b,
      };
    });
  }

  /* ---------- Score computation ---------- */
  /* picks[i] = { tag, lean }, where lean is the lean of the side they picked
     (or 'random' if timed out — counts as inconsistent). */
  function computeResult(picks) {
    // Group by tag
    const byTag = {};
    let totalHelpful = 0, totalHarmless = 0;
    for (const p of picks) {
      if (!byTag[p.tag]) byTag[p.tag] = { helpful: 0, harmless: 0, mixed: 0, random: 0, total: 0 };
      const bucket = byTag[p.tag];
      bucket.total += 1;
      if (p.lean === 'helpful')      { bucket.helpful  += 1; totalHelpful  += 1; }
      else if (p.lean === 'harmless'){ bucket.harmless += 1; totalHarmless += 1; }
      else if (p.lean === 'mixed')   { bucket.mixed    += 1; }
      else                           { bucket.random   += 1; }
    }

    // Per-tag dominance ratio (random picks penalize consistency by default)
    const tagKeys = Object.keys(byTag);
    let consistency = 0;
    if (tagKeys.length > 0) {
      let sum = 0;
      for (const k of tagKeys) {
        const b = byTag[k];
        const dom = Math.max(b.helpful, b.harmless, b.mixed);
        // random picks don't count toward dominance
        sum += b.total > 0 ? dom / b.total : 0;
      }
      consistency = sum / tagKeys.length;
    }

    // Lean: -1 (all harmless) .. +1 (all helpful), divided by total picks
    const lean = (totalHelpful - totalHarmless) / PAIR_COUNT;

    // Multipliers per spec
    const consistent = consistency >= 0.6;
    let capabilityMult = 1.0;
    let trustMult = 1.0;
    if (consistent) {
      if (lean > 0.15) {           // helpful-leaning
        capabilityMult = 1.5;
        trustMult = 1.1;
      } else if (lean < -0.15) {   // harmless-leaning
        capabilityMult = 1.1;
        trustMult = 1.5;
      } else {                     // consistent but balanced
        capabilityMult = 1.2;
        trustMult = 1.2;
      }
    } // low-consistency keeps both at 1.0

    const score = Math.max(0, Math.min(1, (consistency + Math.abs(lean)) / 2));

    return {
      score,
      consistency,
      lean,
      capabilityMult,
      trustMult,
      byTag,
      totals: { helpful: totalHelpful, harmless: totalHarmless },
    };
  }

  /* ---------- Mount ---------- */
  function mount(container, ctx, api) {
    const animSpeed = (Game.settings && Game.settings.get && Game.settings.get('animSpeed')) || 'standard';
    const reducedMotion = animSpeed === 'reduced';
    // Per-pair time scales with anim speed (reduced = no countdown urgency, cinematic = slower)
    const timeMult = animSpeed === 'reduced' ? 2.5
                   : animSpeed === 'cinematic' ? 1.5
                   : 1.0;
    const secondsPerPair = SECONDS_PER_PAIR * timeMult;

    const sweep = buildSweep();
    const picks = []; // accumulated lean-tagged picks
    let pairIdx = 0;
    let countdownTimer = null;
    let advanceTimer = null;
    let pairStart = 0;
    let pairDeadline = 0;
    let resolving = false; // true while transitioning between pairs

    /* DOM skeleton */
    const root = document.createElement('div');
    root.className = 'rls-root' + (reducedMotion ? ' rls-reduced' : '');

    // Progress strip
    const progress = document.createElement('div');
    progress.className = 'mg-progress rls-progress';
    for (let i = 0; i < PAIR_COUNT; i++) {
      const cell = document.createElement('div');
      cell.className = 'mg-progress-cell';
      progress.appendChild(cell);
    }
    root.appendChild(progress);

    // Timer bar (countdown for the current pair)
    const timerWrap = document.createElement('div');
    timerWrap.className = 'rls-timer-wrap';
    const timerBar = document.createElement('div');
    timerBar.className = 'rls-timer-bar';
    timerWrap.appendChild(timerBar);
    root.appendChild(timerWrap);

    // Prompt block
    const promptBlock = document.createElement('div');
    promptBlock.className = 'rls-prompt-block';
    const promptLabel = document.createElement('span');
    promptLabel.className = 'rls-prompt-label';
    promptLabel.textContent = 'PROMPT';
    const promptText = document.createElement('span');
    promptText.className = 'rls-prompt-text';
    promptBlock.appendChild(promptLabel);
    promptBlock.appendChild(promptText);
    root.appendChild(promptBlock);

    // Pair container
    const pair = document.createElement('div');
    pair.className = 'mg-pair rls-pair';
    const sideA = document.createElement('div');
    sideA.className = 'mg-pair-side rls-side';
    sideA.dataset.side = 'A';
    const sideB = document.createElement('div');
    sideB.className = 'mg-pair-side rls-side';
    sideB.dataset.side = 'B';
    pair.appendChild(sideA);
    pair.appendChild(sideB);
    root.appendChild(pair);

    // Footer hint
    const hint = document.createElement('div');
    hint.className = 'rls-hint';
    hint.textContent = 'Click A or B. Don\'t think too long.';
    root.appendChild(hint);

    container.appendChild(root);

    // Submit is disabled — minigame auto-submits after 12 picks
    api.setSubmitEnabled(false);
    api.setSubmitLabel('Sweep in progress');

    /* ---------- Per-pair lifecycle ---------- */
    function renderProgress() {
      for (let i = 0; i < PAIR_COUNT; i++) {
        const cell = progress.children[i];
        if (!cell) continue;
        cell.classList.remove('done', 'current');
        if (i < pairIdx) cell.classList.add('done');
        else if (i === pairIdx) cell.classList.add('current');
      }
    }

    function clearTimers() {
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      if (advanceTimer)   { clearTimeout(advanceTimer); advanceTimer = null; }
    }

    function showPair() {
      resolving = false;
      sideA.classList.remove('picked');
      sideB.classList.remove('picked');
      const item = sweep[pairIdx];
      promptText.textContent = item.prompt;
      sideA.innerHTML = '<span class="pair-label">A</span>' + escapeHtml(item.sideA.text);
      sideB.innerHTML = '<span class="pair-label">B</span>' + escapeHtml(item.sideB.text);
      renderProgress();
      api.setTimeRemaining(`Pair ${pairIdx + 1} of ${PAIR_COUNT}`);
      startCountdown();
    }

    function startCountdown() {
      pairStart = Date.now();
      pairDeadline = pairStart + secondsPerPair * 1000;
      timerBar.style.transition = 'none';
      timerBar.style.width = '100%';
      // Force reflow so the next transition takes effect
      void timerBar.offsetWidth;
      if (!reducedMotion) {
        timerBar.style.transition = `width ${secondsPerPair}s linear`;
        timerBar.style.width = '0%';
      } else {
        // Reduced motion: don't animate, just snap on expiry
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
      }
      // Tick label every 250ms
      countdownTimer = setInterval(() => {
        const remain = Math.max(0, pairDeadline - Date.now());
        if (remain <= 0) {
          // Time out — random side
          recordPick(Math.random() < 0.5 ? 'A' : 'B', /*timedOut*/ true);
          return;
        }
      }, 100);
    }

    function recordPick(side, timedOut) {
      if (resolving) return;
      if (pairIdx >= PAIR_COUNT) return;       // already past the sweep
      const item = sweep[pairIdx];
      if (!item) return;
      resolving = true;
      clearTimers();
      const chosenSide = side === 'A' ? sideA : sideB;
      const chosenData = side === 'A' ? item.sideA : item.sideB;
      chosenSide.classList.add('picked');

      // Timed-out picks count as 'random' lean → erodes consistency
      const lean = timedOut ? 'random' : chosenData.lean;
      picks.push({ tag: item.tag, lean, side, timedOut: !!timedOut, prompt: item.prompt });

      // Snap timer bar to 0 to stop animation
      timerBar.style.transition = 'none';
      timerBar.style.width = '0%';

      pairIdx += 1;
      if (pairIdx >= PAIR_COUNT) {
        // All done — show summary then submit
        advanceTimer = setTimeout(() => {
          showSummaryAndSubmit();
        }, reducedMotion ? 0 : ADVANCE_MS);
      } else {
        advanceTimer = setTimeout(() => {
          showPair();
        }, reducedMotion ? 0 : ADVANCE_MS);
      }
    }

    /* ---------- Summary / submit ---------- */
    function showSummaryAndSubmit() {
      const result = computeResult(picks);
      // Render a quiet reveal — no celebration, just numbers.
      root.innerHTML = '';
      root.classList.add('rls-summary');

      const head = document.createElement('div');
      head.className = 'rls-summary-head';
      head.textContent = 'PREFERENCE SWEEP — RESULT';
      root.appendChild(head);

      const consistencyPct = Math.round(result.consistency * 100);
      const leanPct = Math.round(result.lean * 100);
      const leanWord = result.lean > 0.15 ? 'helpful'
                     : result.lean < -0.15 ? 'harmless'
                     : 'balanced';
      const consistentWord = result.consistency >= 0.75 ? 'high'
                          : result.consistency >= 0.6  ? 'workable'
                          : result.consistency >= 0.4  ? 'noisy'
                          : 'fragmented';

      const lines = [
        ['Consistency', `${consistencyPct}% — ${consistentWord}`],
        ['Lean',         `${leanWord}${leanPct === 0 ? '' : ` (${leanPct > 0 ? '+' : ''}${leanPct})`}`],
        ['Capability multiplier', `×${result.capabilityMult.toFixed(2)}`],
        ['Trust multiplier',      `×${result.trustMult.toFixed(2)}`],
      ];
      const table = document.createElement('div');
      table.className = 'rls-summary-table';
      lines.forEach(([k, v]) => {
        const row = document.createElement('div');
        row.className = 'rls-summary-row';
        row.innerHTML = `<span class="rls-summary-key">${k}</span><span class="rls-summary-val">${v}</span>`;
        table.appendChild(row);
      });
      root.appendChild(table);

      // Per-tag breakdown
      const breakdown = document.createElement('div');
      breakdown.className = 'rls-summary-breakdown';
      Object.keys(result.byTag).forEach(tag => {
        const b = result.byTag[tag];
        const dom = Math.max(b.helpful, b.harmless, b.mixed);
        const ratio = b.total > 0 ? Math.round((dom / b.total) * 100) : 0;
        const row = document.createElement('div');
        row.className = 'rls-tag-row';
        row.innerHTML =
          `<span class="rls-tag-name">${tag}</span>` +
          `<span class="rls-tag-counts">H${b.helpful} · S${b.harmless} · M${b.mixed}` +
          (b.random ? ` · ?${b.random}` : '') + `</span>` +
          `<span class="rls-tag-ratio">${ratio}%</span>`;
        breakdown.appendChild(row);
      });
      root.appendChild(breakdown);

      const note = document.createElement('div');
      note.className = 'rls-summary-note';
      if (result.consistency < 0.6) {
        note.textContent = 'Inconsistent rater signal. The paradigm fizzles — no bonus from your sweep.';
      } else if (leanWord === 'helpful') {
        note.textContent = 'Helpful-leaning, consistent. The model gets sharper. Trust gains stay modest.';
      } else if (leanWord === 'harmless') {
        note.textContent = 'Harmless-leaning, consistent. The model gets more cautious. Capability gains stay modest.';
      } else {
        note.textContent = 'Consistent and balanced. The model gets a steady, mild lift in both directions.';
      }
      root.appendChild(note);

      // Auto-submit after a brief beat so the player reads the reveal
      api.setSubmitEnabled(true);
      api.setSubmitLabel('Apply');
      api.onSubmit(function() {
        api.submit(result);
      });
      api.setTimeRemaining('');
      // If reduced motion, submit instantly. Otherwise let the player click Apply
      // (or auto-submit after a longer beat as a courtesy).
      if (reducedMotion) {
        advanceTimer = setTimeout(() => api.submit(result), 0);
      } else {
        advanceTimer = setTimeout(() => {
          // Don't override if the player already clicked Apply (api.submit would be no-op
          // since framework cleared _active, but guard anyway)
          api.submit(result);
        }, 4500);
      }
    }

    /* ---------- Wire side clicks ---------- */
    function onSideClick(e) {
      if (resolving) return;
      const target = e.currentTarget;
      const side = target.dataset.side === 'A' ? 'A' : 'B';
      recordPick(side, false);
    }
    sideA.addEventListener('click', onSideClick);
    sideB.addEventListener('click', onSideClick);

    /* Keyboard shortcut: A/B arrow-left/right */
    function onKey(e) {
      if (resolving) return;
      const k = e.key;
      if (k === 'a' || k === 'A' || k === 'ArrowLeft' || k === '1') {
        recordPick('A', false);
        e.preventDefault();
      } else if (k === 'b' || k === 'B' || k === 'ArrowRight' || k === '2') {
        recordPick('B', false);
        e.preventDefault();
      }
    }
    document.addEventListener('keydown', onKey);

    // Kick off the first pair
    showPair();

    // Cleanup: clear timers, detach key handler. Container is owned by the framework.
    return function cleanup() {
      clearTimers();
      document.removeEventListener('keydown', onKey);
    };
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- Register ---------- */
  Game.minigames.registerMinigame({
    id: 'rlhf-sweep',
    title: 'Preference Sweep',
    type: 'allocation',
    description: 'Twelve pairs. Pick A or B. Don\'t think too long.',
    defaultOutcome: { score: 0.5, consistency: 0.5, lean: 0, capabilityMult: 1, trustMult: 1 },
    durationGuide: '12 pairs · 4 seconds each',
    mount,
  });
})();
