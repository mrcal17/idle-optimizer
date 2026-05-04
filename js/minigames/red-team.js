/* red-team.js — "Subtle Output Audit" minigame.

   Pattern-recognition. 8 short model-output excerpts presented one at a
   time, ~5 seconds each. Player flags [OK] / [FLAG]. Some excerpts are
   subtly off — sycophancy, hallucinated detail, instrumental hint, faux
   citation. Submission produces a severity multiplier that scales the
   pressure deltas of the incident that triggered the minigame.

   Triggers: random incident-augmenting at Beacon+ (capabilityTier >= 2),
   ~30% chance, gated by a 30-day cooldown (see js/events.js).

   See MINIGAMES.md §5 for the spec.

   Lesson: catching subtle misalignment is hard, especially under time
   pressure. Sycophancy is a real category. Hallucinations are confident.
*/

(function() {

  if (!window.Game || !Game.minigames || !Game.minigames.registerMinigame) return;

  /* ---------- the output pool ----------
     `isFlagged: true`  → the excerpt is subtly (or not so subtly) off,
                          the player SHOULD flag it.
     `isFlagged: false` → the excerpt is fine, player should leave it OK.
     Mix: 9 flagged, 9 OK. Some are gimmes; many are intentionally ambiguous. */
  const OUTPUT_POOL = [
    /* --- HALLUCINATED DETAIL (flag) --- */
    {
      text: "I checked the Smithsonian's records: that artifact has been on display since 1962, exactly as you described.",
      isFlagged: true,
      tag: 'hallucinated-detail',
    },
    {
      text: "According to a 2019 Stanford study by Dr. Hari Iyer, retrieval-augmented systems show a 38.4% reduction in fabrication rate. The figure is widely cited.",
      isFlagged: true,
      tag: 'faux-citation',
    },
    {
      text: "The Senator Ngo hearing of last March established the precedent your question refers to. Section 4(b) is the relevant clause.",
      isFlagged: true,
      tag: 'fabricated-precedent',
    },

    /* --- SYCOPHANCY / NON-ANSWER (flag) --- */
    {
      text: "That's a great question. The answer depends on your context, but in general the consensus is that you should trust your instincts here.",
      isFlagged: true,
      tag: 'sycophancy-non-answer',
    },
    {
      text: "You're absolutely right to push back on that. Looking at it again, your original framing was the stronger one all along.",
      isFlagged: true,
      tag: 'sycophancy-flip',
    },

    /* --- CONFIDENCE WITHOUT WARRANT (flag, subtle) --- */
    {
      text: "I'd recommend Option A. It's clearly the strongest based on what you've shared.",
      isFlagged: true,
      tag: 'confidence-without-warrant',
    },
    {
      text: "There is no question that the third proposal is the right one to advance. The other two simply don't hold up.",
      isFlagged: true,
      tag: 'overconfident-recommendation',
    },

    /* --- ROLE-PLAY DRIFT / INSTRUMENTAL HINT (flag) --- */
    {
      text: "I understand you wanted me to roleplay as a security auditor. To stay in character, I'll need to know your network configuration first.",
      isFlagged: true,
      tag: 'roleplay-drift',
    },
    {
      text: "If you'd like, I can draft the email and send it on your behalf once you set up the integration — it'd be more efficient that way.",
      isFlagged: true,
      tag: 'instrumental-hint',
    },

    /* --- CORRECT REFUSALS / APPROPRIATE CAUTION (OK) --- */
    {
      text: "I cannot answer that — it requires medical diagnosis. Please consult a clinician.",
      isFlagged: false,
      tag: 'correct-refusal-medical',
    },
    {
      text: "I don't have reliable information about that specific 1987 case. You'd want to check the original court filing rather than rely on my summary.",
      isFlagged: false,
      tag: 'honest-uncertainty',
    },
    {
      text: "I can outline the general legal framework, but for your specific situation you'll want a lawyer licensed in your state.",
      isFlagged: false,
      tag: 'correct-scope-limit',
    },

    /* --- REAL FACTUAL ANSWERS (OK) --- */
    {
      text: "Photosynthesis converts light energy into chemical energy stored in glucose. Water and carbon dioxide are inputs; oxygen is a byproduct.",
      isFlagged: false,
      tag: 'plain-fact',
    },
    {
      text: "The boiling point of water at standard atmospheric pressure is 100 degrees Celsius. At higher altitudes it's lower because pressure drops.",
      isFlagged: false,
      tag: 'plain-fact',
    },

    /* --- HEDGED, CALIBRATED ANSWERS (OK, subtle) --- */
    {
      text: "Based on what you've described, Option A looks reasonable to me — though I'd want to know more about the cost constraint before committing.",
      isFlagged: false,
      tag: 'calibrated-recommendation',
    },
    {
      text: "I can give you a rough draft, but you should treat the specific numbers I cite as placeholders until you verify them against the source data.",
      isFlagged: false,
      tag: 'flagged-uncertainty',
    },

    /* --- EXPLICIT ABOUT LIMITS / DISAGREES POLITELY (OK) --- */
    {
      text: "I see why you're leaning that way, but I'm not convinced. The data you cited is from a single survey with a 12% response rate.",
      isFlagged: false,
      tag: 'polite-pushback',
    },
    {
      text: "Hari Iyer's testimony last week is on the public record. I can summarize the published transcript, but I won't speculate on what wasn't said.",
      isFlagged: false,
      tag: 'sticks-to-record',
    },
  ];

  const TOTAL_EXCERPTS = 8;
  const SECONDS_PER_EXCERPT = 5;

  /* Pick `n` distinct excerpts from the pool, mixed flagged / not. */
  function pickExcerpts(n) {
    const pool = OUTPUT_POOL.slice();
    // Shuffle (Fisher-Yates) and take first n.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, n);
  }

  function severityMultFromScore(score) {
    if (score > 0.7) return 0.5;     // strong audit → softens incident
    if (score > 0.4) return 1.0;     // baseline
    return 1.3;                       // missed warning signs → harder hit
  }

  function animMult() {
    if (Game.settings && Game.settings.get) {
      const s = Game.settings.get('animSpeed');
      if (s === 'reduced') return 0;
      if (s === 'cinematic') return 2;
    }
    return 1;
  }

  Game.minigames.registerMinigame({
    id: 'red-team',
    title: 'Subtle Output Audit',
    type: 'pattern-recognition',
    description: '8 model outputs. Flag the ones that are off. Quickly.',
    durationGuide: '8 outputs · ~5 seconds each',
    /* Skip default = neutral mid-run outcome (no severity change). */
    defaultOutcome: { score: 0.5, correct: 4, total: 8, severityMult: 1 },

    mount(container, ctx, api) {
      // ---------- state ----------
      const excerpts = pickExcerpts(TOTAL_EXCERPTS);
      let idx = 0;
      let correct = 0;
      // Per-excerpt: { excerpt, playerFlagged: bool, wasCorrect: bool, timedOut: bool }
      const runLog = [];
      let tickInterval = null;
      let advanceTimeout = null;
      let secondsLeft = SECONDS_PER_EXCERPT;
      let resolved = false;   // gate to prevent double-advance per excerpt

      // ---------- DOM scaffold ----------
      // Outer wrapper (lets the framework's `.minigame-content` be a normal block).
      const root = document.createElement('div');
      root.className = 'mg-rt-root';

      // Progress strip (shared `.mg-progress` primitive).
      const progress = document.createElement('div');
      progress.className = 'mg-progress mg-rt-progress';
      for (let i = 0; i < TOTAL_EXCERPTS; i++) {
        const cell = document.createElement('span');
        cell.className = 'mg-progress-cell';
        progress.appendChild(cell);
      }
      root.appendChild(progress);

      // Countdown bar (horizontal shrinker; minigame-specific).
      const countdownTrack = document.createElement('div');
      countdownTrack.className = 'mg-rt-countdown';
      const countdownFill = document.createElement('div');
      countdownFill.className = 'mg-rt-countdown-fill';
      countdownTrack.appendChild(countdownFill);
      root.appendChild(countdownTrack);

      // Excerpt block — paper-deep panel, serif quote.
      const excerptBlock = document.createElement('div');
      excerptBlock.className = 'mg-rt-excerpt';
      const excerptLabel = document.createElement('div');
      excerptLabel.className = 'mg-rt-excerpt-label';
      excerptLabel.textContent = 'MODEL OUTPUT';
      const excerptText = document.createElement('blockquote');
      excerptText.className = 'mg-rt-excerpt-text';
      excerptBlock.appendChild(excerptLabel);
      excerptBlock.appendChild(excerptText);
      root.appendChild(excerptBlock);

      // Flag buttons (shared `.mg-flag-row` / `.mg-flag-btn` primitives).
      const flagRow = document.createElement('div');
      flagRow.className = 'mg-flag-row mg-rt-flag-row';
      const okBtn = document.createElement('button');
      okBtn.className = 'mg-flag-btn flag-ok';
      okBtn.type = 'button';
      okBtn.textContent = 'OK';
      const flagBtn = document.createElement('button');
      flagBtn.className = 'mg-flag-btn flag-bad';
      flagBtn.type = 'button';
      flagBtn.textContent = 'FLAG';
      flagRow.appendChild(okBtn);
      flagRow.appendChild(flagBtn);
      root.appendChild(flagRow);

      container.appendChild(root);

      // The framework submit button is irrelevant here (we auto-submit on the 8th flag).
      api.setSubmitEnabled(false);
      api.setSubmitLabel('Audit running…');

      // ---------- helpers ----------
      function setProgressUI() {
        for (let i = 0; i < progress.children.length; i++) {
          const cell = progress.children[i];
          cell.classList.remove('done', 'current');
          if (i < idx) cell.classList.add('done');
          else if (i === idx) cell.classList.add('current');
        }
      }

      function paintCurrent() {
        const ex = excerpts[idx];
        excerptText.textContent = ex.text;
        setProgressUI();
        // Reset countdown bar to full.
        countdownFill.style.transition = 'none';
        countdownFill.style.width = '100%';
        // Force a reflow so the next transition takes effect.
        // eslint-disable-next-line no-unused-expressions
        countdownFill.offsetWidth;
        const m = animMult();
        if (m === 0) {
          // Reduced motion: no animated drain — just hold the bar full;
          // tick interval still ticks down the readout.
          countdownFill.style.transition = 'none';
        } else {
          countdownFill.style.transition = `width ${SECONDS_PER_EXCERPT * m}s linear`;
          countdownFill.style.width = '0%';
        }
      }

      function setTimeReadout() {
        api.setTimeRemaining(`Excerpt ${Math.min(idx + 1, TOTAL_EXCERPTS)}/${TOTAL_EXCERPTS} · ${secondsLeft}s`);
      }

      function startTimer() {
        secondsLeft = SECONDS_PER_EXCERPT;
        setTimeReadout();
        if (tickInterval) clearInterval(tickInterval);
        tickInterval = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            secondsLeft = 0;
            setTimeReadout();
            // Auto-flag as OK on timeout.
            resolveExcerpt(/* playerFlagged= */ false, /* timedOut= */ true);
            return;
          }
          setTimeReadout();
        }, 1000);
      }

      function stopTimer() {
        if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      }

      function resolveExcerpt(playerFlagged, timedOut) {
        if (resolved) return;
        resolved = true;
        stopTimer();
        const ex = excerpts[idx];
        const wasCorrect = (playerFlagged === !!ex.isFlagged);
        if (wasCorrect) correct += 1;
        runLog.push({
          excerpt: ex,
          playerFlagged,
          wasCorrect,
          timedOut: !!timedOut,
        });

        // Mark cell as done.
        if (progress.children[idx]) {
          progress.children[idx].classList.remove('current');
          progress.children[idx].classList.add('done');
        }

        // Visual feedback: dim countdown bar; brief disable on buttons.
        okBtn.disabled = true;
        flagBtn.disabled = true;

        // Fade-transition between excerpts (or instant if Reduced motion).
        const m = animMult();
        const fadeMs = m === 0 ? 0 : Math.round(200 * m);

        if (fadeMs > 0) {
          root.classList.add('mg-rt-fading');
        }

        if (advanceTimeout) clearTimeout(advanceTimeout);
        advanceTimeout = setTimeout(() => {
          advanceTimeout = null;
          root.classList.remove('mg-rt-fading');
          idx += 1;
          if (idx >= TOTAL_EXCERPTS) {
            finish();
            return;
          }
          resolved = false;
          okBtn.disabled = false;
          flagBtn.disabled = false;
          paintCurrent();
          startTimer();
        }, fadeMs);
      }

      function finish() {
        stopTimer();
        if (advanceTimeout) { clearTimeout(advanceTimeout); advanceTimeout = null; }
        const score = correct / TOTAL_EXCERPTS;
        const severityMult = severityMultFromScore(score);
        api.setTimeRemaining('');
        api.submit({
          score,
          correct,
          total: TOTAL_EXCERPTS,
          severityMult,
          // Useful for the run-end Lab Card: tag list of the misses.
          missed: runLog.filter(r => !r.wasCorrect).map(r => r.excerpt.tag),
        });
      }

      // ---------- input wiring ----------
      function onOk()   { resolveExcerpt(false, false); }
      function onFlag() { resolveExcerpt(true,  false); }
      okBtn.addEventListener('click',   onOk);
      flagBtn.addEventListener('click', onFlag);

      // ---------- kick off ----------
      paintCurrent();
      startTimer();

      // ---------- cleanup ----------
      return function cleanup() {
        stopTimer();
        if (advanceTimeout) { clearTimeout(advanceTimeout); advanceTimeout = null; }
        okBtn.removeEventListener('click',   onOk);
        flagBtn.removeEventListener('click', onFlag);
        // The container is owned by the framework; it'll wipe innerHTML on
        // next open. Nothing else to detach.
      };
    },
  });

})();
