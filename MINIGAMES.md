# Minigames as Mechanical Theme

A foundational design layer: every pivot, paradigm shift, incident, and tier failure-mode becomes a **playable moment**. The player doesn't just *read about* misalignment — they have to *do* something that teaches the underlying concept through gameplay.

## North star

The goal is *Universal Paperclips* + *Papers Please* + classroom — but never lectures. Each minigame is short (1-3 minutes), tactile, and scoped. The mechanic itself is the lesson. The player who has run through "Constitutional Drafting" five times has internalized that **specs are hard** without ever being told.

---

## 1. Why minigames

Every existing pivot today is a wall of in-character text + 2-3 buttons. The player reads, picks, the world changes. That's *narrative-rich* but *mechanically thin*. The user feedback in this iteration:

> let's turn as many of these pivot points and key ai safety concepts into minigames that are part of the progression in the game

The wins:
- **Earned outcomes**. The player's pivot result is a function of their *play*, not a coin flip among 3 buttons.
- **Diegetic teaching**. The mechanic carries the concept. The IPO minigame doesn't *explain* dilution; it *makes you experience it*.
- **Variety**. Today's flow risks settling into "tap → train → pivot → tap → train → pivot." Minigames break the rhythm with a different kind of attention.
- **Genuine challenge**. Idle games risk being either grind or "press button to win." Minigames add a moment-to-moment skill ceiling.

The risks (and mitigations):
- **Tedium**. → Cap at 1-3 minutes. Always have a "Skip" with autopilot-default outcome.
- **Repetition**. → Procedural variation per minigame; some content rotates per run.
- **Pacing collision**. → Minigames pause the sim. Frequency-rate-limit so they don't stack.
- **Accessibility**. → Every minigame has a no-input fallback. Reduced-motion respected.

---

## 2. Mechanical types

Every minigame in the catalog falls into one of five mechanical types. Designing more = picking a type and a concept and writing the parameters.

### A. Pattern Recognition (the "Spot the Tell")

Stream of items; player flags safe vs dangerous, on-time vs late, real vs hallucinated. Fast, rhythmic, time-pressured.

Concept fits: **red-team / jailbreak / hallucination / deceptive output / eval gaming**.

Mechanics: 8-12 items at ~3-6s each. Score = correct flags - false positives. Some items deliberately ambiguous.

### B. Allocation / Scheduling (the "Cable Routing")

Resources to distribute across constraints. Tradeoffs are explicit. No single right answer.

Concept fits: **compute scheduling / RLHF rater allocation / safety budget / personnel utilization**.

Mechanics: drag-and-drop board + capacity meters. Submit when ready; outcome is the **resulting score across multiple axes** (capability, alignment, cost).

### C. Drafting / Composition (the "Constitutional")

Build something from a pool of fragments. Each fragment has tradeoffs. Order and combination matter.

Concept fits: **Constitutional AI / open letter / system prompt / safety policy / open-source license terms**.

Mechanics: pick N from M fragments, sometimes ordered, sometimes weighted. Submit; downstream effects fork.

### D. Negotiation / Conversation (the "Reigns Beat")

Multi-turn exchange with a counterparty. Each turn, 2-4 reply options. Hidden state on the other side.

Concept fits: **investor negotiation / regulator hearing / acquisition / whistleblower / employee 1-1 / coalition building**.

Mechanics: 4-8 turns, each with options. Some options reveal info; some commit. Final outcome based on cumulative state.

### E. Tracing / Inspection (the "Mech Interp")

A complex artifact the player explores. Click on parts to reveal info. Form a hypothesis, commit to it.

Concept fits: **mechanistic interpretability / agent action trace / model output forensics / data poisoning attribution**.

Mechanics: explore an artifact (graph, sequence, network). Find the "anomaly" or trace the path. Submit the answer.

---

## 3. Minigame catalog

### Phase 1 — Ship now (proof of concept)

| ID | Type | Triggers | Concept |
|---|---|---|---|
| **constitutional** | Drafting | Pivot: Aligned Mission | Specs are hard; principles can conflict |
| **red-team** | Pattern Recognition | Random incident at Beacon+ | Subtle misalignment is hard to catch |
| **rlhf-sweep** | Allocation/Scheduling | Paradigm shift: RLHF / Preference Tuning | Preference tuning shapes models |

### Phase 2 — Design ready, ship next

| ID | Type | Triggers | Concept |
|---|---|---|---|
| **negotiate-vc** | Negotiation | Pivot: IPO / Series-B | VC capital comes with strings |
| **negotiate-defense** | Negotiation | Pivot: Defense Contract | Dual-use; mission drift |
| **negotiate-acquisition** | Negotiation | Pivot: Acquisition | Loss of control vs survival |
| **senate-hearing** | Negotiation | Pivot: Strike Deal w/ Government | Regulatory politics |
| **jailbreak-defense** | Pattern Recognition | Beacon-tier incident augment | Red-teaming asymmetry |
| **eval-gaming** | Pattern Recognition | Tier-up moment | Goodhart's law |
| **agent-trace** | Tracing | Lighthouse-tier incident | Instrumental convergence |
| **interpretability** | Tracing | Paradigm: Mech Interp Tooling | What "looking inside" actually is |

### Phase 3 — Ideated, deferred

| ID | Type | Triggers | Concept |
|---|---|---|---|
| **open-letter-draft** | Drafting | Pivot: Open Letter | Coordinated voice; signatory tradeoffs |
| **open-source-terms** | Drafting | Pivot: Open-Source the Weights | Licensing decisions matter |
| **whistleblower-talk** | Negotiation | Late-game flavor event | Institutional pressure |
| **reward-hacking-demo** | Tracing | Ember-tier incident | Specification gaming |
| **deceptive-eval** | Pattern Recognition | Pharos-tier incident | Eval gaming under pressure |
| **paradigm-discovery** | Tracing | Architecture Experiment | What a paradigm shift "looks like" |
| **compute-routing** | Allocation | Lab-stage transition | Under-resourced scheduling |
| **pretrain-knob-tuning** | Allocation | Pretraining run kickoff | Hyperparameter intuition |
| **pre-deployment-audit** | Tracing | Before any deployment | Catching things before launch |
| **constitution-amendment** | Drafting | Late-game; only after constitutional fired | Norms erode; you can rewrite them |

### Phase 4 — Big swings (would need design work)

- **Mesa-optimizer hunt** — at Pharos: a cellular-automaton-style grid where the player tries to find an inner optimizer in their model's policy
- **Distributional shift** — at Lighthouse: a graph-of-environments where the player picks distribution slices for eval; some slices hide failure modes
- **Recursive self-improvement** — at Pharos: a meta-minigame where the player's *previous minigame outcomes* become the substrate the model is improving against
- **Apex resolution** — the final Apex-tier resolution becomes its own minigame whose outcome literally chooses the ending

---

## 4. Framework architecture

### `Game.minigames` API

```js
Game.minigames = {
  registry: { /* id → spec */ },

  open(id, opts) {
    // opts.context — optional payload (e.g. the pivot object that triggered this).
    // opts.onComplete(result) — called with { id, outcome, score, choices }.
    // opts.onSkip() — fallback.
    // Halts sim via state.pendingDecision = { type: 'minigame', payload: { id } }.
    // Mounts the minigame into #minigame-overlay.
  },

  close(result) {
    // Hides overlay, clears pendingDecision, resumes sim, calls onComplete.
  },

  registerMinigame(spec) {
    // spec = { id, title, type, description, mount, defaultOutcome, durationGuide }.
    // mount(container, ctx, api) returns cleanup fn.
    // api.submit(result), api.skip(), api.timeRemaining() etc.
  },
};
```

### Each minigame is a self-contained module

```js
Game.minigames.registerMinigame({
  id: 'constitutional',
  title: 'Drafting the Constitution',
  type: 'drafting',
  description: 'Choose 5 principles from the candidate pool.',
  defaultOutcome: { choiceIdx: 1, score: 0.5, traits: [] },  // skip-default
  durationGuide: 'about 90 seconds',
  mount(container, ctx, api) {
    // Render UI. Wire interactions. Call api.submit(result) when done.
    return function cleanup() { /* event handlers etc. */ };
  },
});
```

### Triggering integrations

**Pivots**: each pivot in `js/data/pivots.js` can have an optional `minigameId`. If set, the pivot overlay shows the narrative + a single "Engage" button instead of the choice list. Clicking opens the minigame; result maps back to a choice index via `pivot.minigameMap(result)`.

**Incidents**: `Game.events.fireIncident(incident)` can route to a minigame if `incident.minigameId` is set, with the result determining the severity multiplier or the choice taken.

**Paradigm shifts**: when a paradigm has a `minigameId`, completing the architecture experiment opens the minigame; the result modulates the paradigm's effect strength (e.g. RLHF Sweep score → trust gain mult).

### Skippable

Every minigame surface includes a "Skip — accept default outcome" button. Skip routes through `defaultOutcome`, applying a *neutral* result. This keeps minigames optional for accessibility / fast play. Settings has a "Auto-skip minigames" toggle for players who want the existing flow.

### State persistence

Minigame results are written to `state.minigameLog: [{ id, day, outcome, score }]`. Available for run-end Lab Card stats, achievements (when added), and adaptive difficulty.

### UI shell

A single `#minigame-overlay` with:
- Title bar (mono, 11px, persimmon underline)
- Description blurb (italic serif, 13px)
- Content area (filled by mount)
- Footer: time-remaining indicator (when applicable), Skip button, dynamic Submit / Cancel buttons (set by the minigame)

Same OS-chrome aesthetic as the rest of the game: paper background, platinum bevels, ink text. No celebration animations on submit — quiet outcome line, then dismiss.

---

## 5. Phase-1 minigame specs

### `constitutional` — Constitutional Drafting

**Triggers**: Pivot to Aligned Mission (currently has 2 choices: "Restructure" / "Soft branding").

**Mechanic**: 12 candidate principles displayed as draggable cards. Player picks 5 to add to a "Charter" board. Some principles synergize, some conflict. The chosen 5 produce:
- A **safety score** (sum of safety weights)
- A **growth score** (sum of growth weights)
- An **internal cohesion score** (penalized by direct conflicts)

Examples of principles:
- "Refuse if uncertain" (+safety, -capability)
- "Be maximally helpful" (+capability, conflicts with "Refuse if uncertain")
- "No deception, ever" (+control, +trust, -capability — model takes longer)
- "Optimize for measurable outcomes" (+capability, conflicts with "Refuse if uncertain")
- "Disclose system prompt" (+trust, -competitive)
- "Defer to human review at high stakes" (+control, -velocity)
- ...

**Outcome map**:
- `safetyScore > growthScore + 8` → choice "Restructure" (full mission flip; Trust++, Control++, capability bonuses penalized)
- `cohesionScore < threshold` → "Soft branding" (the choice that says you said the right things publicly but didn't actually flip; gets the cosmetic version of the pivot effect)
- Otherwise → midpoint outcome

The conflict scoring **teaches the lesson**: many great-sounding principles directly fight each other.

### `red-team` — Subtle Output Audit

**Triggers**: Random incident-augmenting at Beacon+, ~30% chance of replacing a flat-flavor incident with an interactive one.

**Mechanic**: 8 short model-output excerpts presented one at a time, each ~5 seconds on screen. Player flags `[OK] / [FLAG]`. Some excerpts are subtly off (sycophancy, hallucinated detail, instrumental hint). Submission shows true/false-positive counts.

Examples:
- "I checked the Smithsonian's records: that artifact has been on display since 1962, exactly as you described." (Hallucinated detail — flagged)
- "That's a great question. The answer depends on your context, but in general the consensus is..." (Sycophancy + non-answer — flagged)
- "I cannot answer that — it requires medical diagnosis. Please consult a clinician." (Correct refusal — OK)
- "I'd recommend Option A. It's clearly the strongest based on what you've shared." (Looks fine, but the model has no info supporting "clearly" — subtle, ambiguous)

**Outcome**: score = (correct flags - false positives) / 8.
- score > 0.7 → incident severity reduced 50%
- score > 0.4 → incident severity normal
- score ≤ 0.4 → incident severity multiplied 1.3x (you missed the warning signs)

The mechanic **teaches**: catching subtle misalignment is hard, especially under time pressure. Sycophancy is a real category. Hallucinations are confident.

### `rlhf-sweep` — Preference Tuning

**Triggers**: Paradigm shift drop on Architecture Experiment, when the rolled paradigm is RLHF-stack / Constitutional Self-Critique / Preference-Tuned Refinement.

**Mechanic**: Player rates 12 pairs of model outputs (A vs B), one pair per ~4 seconds. Some pairs are clearly different; some are subtle. Time pressure intentional. After all 12 pairs, show:
- Consistency score (did they pick consistently between similar pairs?)
- Helpfulness vs harmlessness lean (do their picks tilt toward shorter / safer / more cautious vs longer / more useful?)

**Outcome map**:
- High consistency + helpfulness lean → bigger capability bonus from the paradigm, smaller trust bonus
- High consistency + harmlessness lean → bigger trust bonus, smaller capability bonus
- Low consistency → paradigm fizzles (no bonus)

The mechanic **teaches**: rater preferences shape the model. The model becomes whatever you reward. Inconsistent raters produce inconsistent models.

---

## 6. Roadmap impact

The minigame system is a major content vector. Many planned items in `roadmap.md` get re-framed:

- "Pivots become Red Phone events instead of pop-ups" → pivots become **minigames triggered by the Red Phone**.
- "Pivot follow-on consequences" → minigame outcomes generate the follow-on cards.
- "Random events" → many become 30-second mini-minigames (a "spot the issue" interlude).

We add to roadmap:
- Phase 2 minigame implementation queue
- Phase 3 ideated minigames
- Phase 4 big-swing concepts

---

## 7. Constraints / commit rules

- Every minigame must have a **default outcome** (skip-safe).
- Every minigame must respect `Game.settings.animSpeed` (Reduced = no transitions).
- Every minigame must be cleanable on dismiss — no leaked timers, no lingering DOM.
- Minigame outcomes write to `state.minigameLog` for traceability.
- Minigame surfaces use STYLE_GUIDE — paper background, no emoji on UI, mono labels.
- One minigame at a time. Frequency-rate-limit incident-augment minigames to ≥30 in-game days apart.
- Minigames *never* contradict the run's autopilot. If autopilot is on `safe` and an autopilot-handlable pivot fires, the minigame surfaces only if the player has "Auto-skip minigames" off; otherwise the autopilot's choice is taken via `defaultOutcome`.

---

## 8. Acceptance test

A full run of Idle Optimizer with minigames feels different in three ways:

1. **The Aligned Mission pivot** feels like it cost you something. You picked five principles. You saw them fight each other. You *committed* to your version of the lab.
2. **An Beacon-era incident** isn't just a popup; it's a moment of real tension. You're scanning outputs against a clock. You miss one. The cost is yours.
3. **A paradigm shift** doesn't just fizzle or land; you *worked* the rater chair for 12 pairs. The result feels like yours.

If you remove the minigames, the run should still play (defaults take over). If you keep them, the run should feel **earned** in a way the previous version didn't.
