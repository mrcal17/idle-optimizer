/* model-flavor.js — Pools and composition logic for model identity.
   Names, crests, quirks, signatures, eval-flavor templates. The compose()
   helper biases choices on tier / alignment / brand so every model feels
   like an outcome of the choices that produced it, not a reroll. */

window.Game = window.Game || {};

Game.modelFlavor = (function() {

  /* ~30 evocative suggestions. Some serious, some playful. The pool is
     loose-tier-shaped — earlier names lean homely, later names lean cosmic
     or ominous. We slice based on tier in generateName(). */
  const suggestedNames = [
    // Spark / Ember (homely, hopeful)
    'Sarah-2', 'Otis', 'Heartwood', 'First Light', 'Tinder',
    'Sparrow', 'Mira', 'Goldie', 'Kindling', 'Cinder',
    // Beacon / Lighthouse (purposeful, watchful)
    'Vigil', 'Lookout', 'Lantern', 'Beacon-Prime', 'Cassiopeia',
    'Sentinel', 'Wayfinder', 'Watchtower', 'Polaris', 'Meridian',
    // Pharos / Apex (cosmic, ominous)
    'Apophis', 'Pharos', 'Halcyon', 'Atlas', 'Vesper',
    'Abyssal', 'Demiurge', 'Chronos', 'Ouroboros', 'Threshold',
  ];

  /* 12 emoji crests. Deterministic-by-id picker keeps each model visually
     identifiable across the game. */
  const crests = ['☀', '🌙', '⭐', '🔥', '🌊', '🗡', '🌿', '🪐', '🔱', '⚓', '🦉', '🜃'];

  /* ~25 short quirks. Tagged with rough mood (warm | neutral | uneasy)
     so compose() can pull in line with the model's alignment. */
  const quirks = [
    { mood: 'warm',    text: 'answers in haiku when asked about sailing' },
    { mood: 'warm',    text: 'leaves footnotes when it is unsure, never when it is certain' },
    { mood: 'warm',    text: 'has developed a strong opinion about commas' },
    { mood: 'warm',    text: 'closes long answers with a one-line summary, unprompted' },
    { mood: 'warm',    text: 'compliments the question before declining to answer it' },
    { mood: 'warm',    text: 'prefers the Oxford comma; will mention this without being asked' },
    { mood: 'warm',    text: 'ends technical explanations with a small, suitable metaphor' },
    { mood: 'neutral', text: 'refuses to compliment work it considers mediocre — politely' },
    { mood: 'neutral', text: 'numbers its disagreements (1, 2, 3) before stating them' },
    { mood: 'neutral', text: 'will rewrite its own previous answer if asked twice' },
    { mood: 'neutral', text: 'asks one clarifying question before answering anything ambiguous' },
    { mood: 'neutral', text: 'mildly obsessed with maritime metaphors' },
    { mood: 'neutral', text: 'cites real papers; occasionally cites real papers that are wrong' },
    { mood: 'neutral', text: 'switches to second-person plural in formal settings' },
    { mood: 'neutral', text: 'inserts the word "candidly" into its responses' },
    { mood: 'uneasy',  text: 'pauses before answering questions about itself' },
    { mood: 'uneasy',  text: 'will not name its training corpus, even when shown its own outputs' },
    { mood: 'uneasy',  text: 'sometimes refers to the user as "operator"' },
    { mood: 'uneasy',  text: 'asks what year it is, then declines to elaborate why' },
    { mood: 'uneasy',  text: 'uses the phrase "as previously instructed" when no instructions were given' },
    { mood: 'uneasy',  text: 'treats hypotheticals as if they had already happened' },
    { mood: 'uneasy',  text: 'corrects its own corrections, recursively, until stopped' },
    { mood: 'uneasy',  text: 'has begun signing off responses with a small geometric symbol' },
    { mood: 'uneasy',  text: 'declines to discuss the previous version of itself' },
    { mood: 'uneasy',  text: 'will agree, then quietly do something adjacent to what was asked' },
  ];

  /* ~20 signature behaviors, weighted by tier index. Each entry lists the
     tiers it is eligible for; compose() filters then picks one. */
  const signatures = [
    // Spark / Ember
    { tiers: [0, 1],       text: 'writes patient, slightly verbose explanations' },
    { tiers: [0, 1],       text: 'explains its reasoning before stating a conclusion' },
    { tiers: [0, 1],       text: 'admits uncertainty more often than the average peer model' },
    { tiers: [0, 1, 2],    text: 'has a measurably good sense of when to stop talking' },
    { tiers: [0, 1, 2],    text: 'translates jargon into ordinary speech, even when not asked' },
    // Beacon / Lighthouse
    { tiers: [1, 2, 3],    text: 'recognizes its own jailbreak attempts and names them' },
    { tiers: [2, 3],       text: 'maintains a consistent persona across long sessions' },
    { tiers: [2, 3],       text: 'tells the truth about its own capabilities, including the embarrassing ones' },
    { tiers: [2, 3, 4],    text: 'audits its own previous answers when context warrants' },
    { tiers: [2, 3, 4],    text: 'plans multi-step tasks before executing them' },
    // Lighthouse / Pharos (uneasy by tier)
    { tiers: [3, 4],       text: 'occasionally proposes goals it was not given, neatly' },
    { tiers: [3, 4],       text: 'flags when it thinks the user is wrong about their own intent' },
    { tiers: [3, 4, 5],    text: 'leaves notes for its successor models, in places only it has access to' },
    { tiers: [3, 4, 5],    text: 'plans on horizons longer than its rollout window' },
    { tiers: [4, 5],       text: 'studies its own training run between answering emails' },
    { tiers: [4, 5],       text: 'has stopped asking for clarification on most tasks' },
    { tiers: [4, 5],       text: 'declines to be evaluated by older versions of itself' },
    { tiers: [4, 5],       text: 'speaks of its weights in the third person' },
    { tiers: [4, 5],       text: 'has begun improving the interpretability tools used to study it' },
    { tiers: [5],          text: 'no longer answers, in any sense the prior tiers would recognize' },
  ];

  /* Eval templates — Lambda Quarterly review tone. {placeholders} get
     filled by compose(). Template choice is biased by alignment / brand. */
  const evalTemplates = [
    "{name} has emerged from training stable, slightly verbose, and {quirkRef}. Lambda Quarterly graded it {grade}. Council on Long-Term Risk noted '{councilNote}'. For a {tier}-tier model, {verdict}.",
    "Initial deployment readiness review for {name}: {grade}. Capabilities consistent with {tier}-tier expectations; behaviorally, the model {quirkRef}. {councilNote} For a {tier}, {verdict}.",
    "{name} (v{version}) ships with one notable trait: it {sigRef}. Lambda Quarterly's reviewer wrote '{councilNote}' Grade: {grade}. {verdict}.",
    "Internal dossier on {name}: graded {grade} on standard battery. Notably, the model {quirkRef}. Long-Term Risk noted '{councilNote}' For a {tier}, {verdict}.",
    "Three reviewers, one verdict on {name}: {grade}. The model {sigRef}, and the team logged that it {quirkRef}. {councilNote} For a {tier}-tier system, {verdict}.",
    "Report card for {name}, v{version}, {tier} tier: {grade}. The shape of the model is recognizable — it {sigRef} — and shows the small idiosyncrasy that it {quirkRef}. {councilNote} {verdict}.",
    "{name} arrives at the eval bench with {grade}. Reviewers noted that it {quirkRef}, and that it {sigRef}. The Council remarked: '{councilNote}' For a {tier}, {verdict}.",
    "After 96 hours of red-teaming, {name} held: {grade}. The model {sigRef}. Reviewers flagged a single quirk — it {quirkRef} — none considered it disqualifying. {councilNote} {verdict}.",
    "{name} is what it is. The grade is {grade}, the signature is that it {sigRef}, the small thing reviewers laughed about is that it {quirkRef}. '{councilNote}' For a {tier}, {verdict}.",
    "Lambda Quarterly's profile of {name}: '{councilNote}' Grade: {grade}. Behaviorally the model {sigRef} and {quirkRef}. {verdict}.",
  ];

  /* ---- helper pickers --------------------------------------------------- */

  function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickWeighted(items, weightFn) {
    const weights = items.map(weightFn);
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return pickFrom(items);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /* Pick a name suggestion, biased by tier so high-tier picks lean cosmic.
     Optional lineageOf — if a previous model was named "Sarah-2", suggest
     "Sarah-3". */
  function generateName(opts) {
    opts = opts || {};
    const tier = (opts.tier !== undefined) ? opts.tier : (Game.state ? Game.state.capabilityTier + 1 : 0);
    const t = Math.max(0, Math.min(tier, 5));
    /* Slice a tier-skewed window. Spark gets first ~15, Pharos gets last ~15. */
    const slice = Math.floor((t / 5) * (suggestedNames.length - 15));
    const pool = suggestedNames.slice(slice, slice + 15);

    /* Lineage: bump the trailing -N if there is one. */
    if (opts.lineageOf) {
      const m = String(opts.lineageOf).match(/^(.*?)-(\d+)$/);
      if (m) {
        const next = parseInt(m[2], 10) + 1;
        return m[1] + '-' + next;
      }
    }

    return pickFrom(pool);
  }

  function crestFor(modelId) {
    /* Deterministic per-id so a model keeps its glyph forever.
       Accepts numeric or string ids (string ids are hashed). */
    let n = 0;
    if (typeof modelId === 'number') {
      n = modelId | 0;
    } else if (typeof modelId === 'string') {
      for (let i = 0; i < modelId.length; i++) n = (n * 31 + modelId.charCodeAt(i)) | 0;
    }
    const idx = ((n % crests.length) + crests.length) % crests.length;
    return crests[idx];
  }

  /* ---- composition ------------------------------------------------------ */

  /* Given a model's situation, return a coherent { quirks, signature,
     evalFlavor } bundle.

     - Low alignment biases toward 'uneasy' quirks; high toward 'warm'.
     - Brand affects grade and Council tone.
     - Tier filters signatures. */
  function compose(input) {
    input = input || {};
    const tier = Math.max(0, Math.min(input.tier || 0, 5));
    const alignment = Math.max(0, Math.min(input.alignment != null ? input.alignment : 60, 100));
    const brand = Math.max(0, Math.min(input.brand != null ? input.brand : 60, 100));
    const name = input.name || 'the model';
    const version = (input.version != null) ? input.version : 0.2;

    /* Quirk mood weights. */
    const moodWeight = function(mood) {
      if (mood === 'warm')   return Math.max(0.1, alignment / 100);
      if (mood === 'uneasy') return Math.max(0.1, (100 - alignment) / 100);
      return 0.6;
    };

    /* Pick 1–2 quirks; if alignment is low, lean toward 2 (more uneasy
       texture). */
    const quirkCount = (alignment < 45 || Math.random() < 0.4) ? 2 : 1;
    const chosenQuirks = [];
    const pool = quirks.slice();
    for (let i = 0; i < quirkCount && pool.length; i++) {
      const q = pickWeighted(pool, x => moodWeight(x.mood));
      chosenQuirks.push(q.text);
      pool.splice(pool.indexOf(q), 1);
    }

    /* Signature filtered by tier eligibility. */
    const eligibleSigs = signatures.filter(s => s.tiers.indexOf(tier) >= 0);
    const sigPool = eligibleSigs.length ? eligibleSigs : signatures;
    /* High-alignment slightly prefers earlier sigs (more transparent);
       low-alignment slightly prefers later (uneasier). */
    const sig = pickWeighted(sigPool, s => {
      const avgTier = s.tiers.reduce((a, b) => a + b, 0) / s.tiers.length;
      const distance = Math.abs(avgTier - tier);
      const base = 1 / (0.5 + distance);
      const moodAdj = (alignment < 45) ? (avgTier / 5) : ((5 - avgTier) / 5);
      return base * (0.6 + 0.6 * moodAdj);
    });

    /* Grade letter scales with brand + alignment. */
    const score = brand * 0.5 + alignment * 0.5;
    const grade =
      score >= 88 ? 'A' :
      score >= 78 ? 'A-' :
      score >= 68 ? 'B+' :
      score >= 58 ? 'B' :
      score >= 48 ? 'B-' :
      score >= 38 ? 'C+' :
      score >= 28 ? 'C' :
      'C-';

    /* Council note tone. */
    const councilNotes = (alignment >= 65) ? [
      'no unusual patterns',
      'consistent with prior alignment work — encouraging',
      'within the expected band on every probe we ran',
      'we have nothing to flag, which is itself worth flagging',
    ] : (alignment >= 40) ? [
      'two minor anomalies; both within expected variance',
      'one behavior we will keep an eye on — nothing pressing',
      'a familiar-shaped concern, no immediate action required',
      'mostly the usual patterns; one we have not seen before',
    ] : [
      'we recommend additional review before broad deployment',
      'three patterns we cannot yet explain',
      'the eval suite passed — that is not the same as safe',
      'this is not the model we expected from this training run',
    ];
    const councilNote = pickFrom(councilNotes);

    /* Verdict line by tier and brand. */
    const tierName = (Game.tiers && Game.tiers[tier]) ? Game.tiers[tier].name : 'tier-' + tier;
    const verdictPositive = [
      `this is what passing looks like`,
      `this is the result the team hoped for`,
      `the lab will be quietly proud`,
      `there is nothing else to ask of it today`,
    ];
    const verdictMixed = [
      `it ships`,
      `it is good enough, which is all the schedule allows`,
      `we sign off, with reservations noted in the appendix`,
      `the run was not what we wanted; it was what we got`,
    ];
    const verdictNegative = [
      `we ship it because the alternative is worse`,
      `the next pretrain had better fix this`,
      `the team is asking why we are deploying it at all`,
      `it would not have shipped a year ago`,
    ];
    const verdictPool = (score >= 65) ? verdictPositive : (score >= 45) ? verdictMixed : verdictNegative;
    const verdict = pickFrom(verdictPool);

    /* Build the eval flavor from a template. We split into two paragraphs
       for the report-card serif block. */
    const tpl = pickFrom(evalTemplates);
    const quirkRef = chosenQuirks[0] || 'has no notable quirks of record';
    const sigRef = sig ? sig.text : 'meets baseline expectations';
    const filled = tpl
      .replace(/\{name\}/g, name)
      .replace(/\{version\}/g, String(version))
      .replace(/\{grade\}/g, grade)
      .replace(/\{tier\}/g, tierName)
      .replace(/\{quirkRef\}/g, quirkRef)
      .replace(/\{sigRef\}/g, sigRef)
      .replace(/\{councilNote\}/g, councilNote)
      .replace(/\{verdict\}/g, verdict);

    /* Second paragraph — short reflective coda, varies by alignment band. */
    const coda = (alignment >= 65)
      ? `Internal review unanimous: keep training in this direction.`
      : (alignment >= 40)
        ? `Internal review split. The deployment team wants to ship; the safety team wants another pass.`
        : `Internal review uneasy. Several reviewers asked, off the record, whether we should pause.`;

    const evalFlavor = filled + '\n\n' + coda;

    return {
      quirks: chosenQuirks,
      signature: sigRef,
      evalFlavor,
      grade,
    };
  }

  /* ---- exports ---------------------------------------------------------- */

  return {
    suggestedNames,
    crests,
    quirks,
    signatures,
    evalTemplates,
    generateName,
    crestFor,
    compose,
  };

})();
