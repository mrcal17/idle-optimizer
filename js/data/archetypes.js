/* archetypes.js — The four v1.0 archetypes.
   Each is a distinct way to play the same game: starting kit, default
   coefficients on capability/trust/control, default autopilot, and one
   archetype-exclusive upgrade branch. Read by sim.js, main.js, ui.js. */

window.Game = window.Game || {};

Game.archetypes = {

  /* ===================== FRONTIER ===================== */
  frontier: {
    id: 'frontier',
    name: '🔥 Frontier',
    tag: 'The Racer',
    color: '#ff7a3d',
    desc: 'Ship it, fix it later. Fastest scaling, hardest survival.',
    inspired: 'OpenAI / xAI archetype',
    startingDesc: '4 GPUs (3 general, 1 training-spec) · 1 Capabilities Engineer · $500 · Auto-OM unlocked',

    // Sim coefficients (read in sim.js / autopilot)
    capabilityMod: 1.25,   // +25% capability gain
    trustMod: 0.85,        // -15% trust recovery
    controlMod: 1.40,      // +40% control drift
    revenueMod: 1.20,      // +20% revenue (read by sim if implemented)
    gpuPriceMod: 0.85,     // 15% cheaper GPUs

    defaultAutopilot: 'frontier',
    exclusiveBranch: 'race-posture',
    lockedAutopilots: [],

    // Progressive-disclosure hints — Frontier is racing, so they get the
    // Operations control panel from day 1 rather than waiting for a tap.
    revealHints: { operationsFromStart: true },

    applyStartingKit(state) {
      Game.addGpu('general');
      Game.addGpu('general');
      Game.addGpu('general');
      Game.addGpu('training');
      Game.addPersonnel('Capabilities Engineer', 0);
      state.money = 500;
      // Auto-OM unlocked for free (the Vend on-ramp pre-paid)
      state.autopilot.unlocks['auto-om'] = true;
      state.flags['frontier-funding-promised'] = true;
      state.archetypeData = {
        promisedGpuDeliveryTick: 600,   // ~30 in-game min
        promisedGpuCount: 4,
      };
      Game.addLog('Investors wired the seed round. The promised rack is en route.', 'tier');
    },

    openingFlavor:
      "We have runway, we have a story, and we have four chips. The competition is twelve months ahead — but they don't have you. Push the frontier; we'll patch the holes on the way up.",

    incomeFlavor:
      "VC seed (day 5: +$1500), then a small per-tick runway burn-rate. Quarterly investor checkpoints reward capability gains; missing one bleeds Trust.",
  },

  /* ===================== SAFETY-FIRST ===================== */
  safety: {
    id: 'safety',
    name: '🛡 Safety-First',
    tag: 'The Cautious',
    color: '#7ab9ff',
    desc: 'We can do this carefully. Slow to scale, hard to break.',
    inspired: 'Anthropic archetype',
    startingDesc: '2 GPUs (1 general, 1 research-spec) · Interp Researcher + Comms Lead · $300 · Reflective AP locked',

    capabilityMod: 0.80,
    trustMod: 2.00,        // 2x trust recovery per spec
    controlMod: 0.50,      // 0.5x control drift per spec
    revenueMod: 0.85,
    gpuPriceMod: 1.10,

    defaultAutopilot: 'safe',
    exclusiveBranch: 'interp-stack',
    // Reflective Autopilot unavailable — internal review board
    lockedAutopilots: ['reflective'],

    // Safety-First cares about Trust/Control from day 1 — surface the
    // pressures panel even before the first hire would do it.
    revealHints: { pressuresFromStart: true },

    applyStartingKit(state) {
      Game.addGpu('general');
      Game.addGpu('research');
      Game.addPersonnel('Interpretability Researcher', 0);
      Game.addPersonnel('Comms Lead', 0);
      state.money = 300;
      state.flags['interp-tooling-installed'] = true;
      state.flags['oversight-committee'] = true;
      state.archetypeData = {
        oversightFloor: 30,   // committee enforces a floor on safety spend
      };
      Game.addLog('Oversight Committee seated. Interpretability tooling pre-installed.', '');
    },

    openingFlavor:
      "The Committee approved the founding charter this morning. We move slower than the racers. That is the point. Build it so it works, not so it ships — the difference matters more than anyone in the news ticker thinks.",

    incomeFlavor:
      "Quarterly research grants from the Council on Long-Term Risk; payout scales with interpretability coverage. Big-E may stream for you when Trust is high.",
  },

  /* ===================== OPEN SOURCE ===================== */
  opensource: {
    id: 'opensource',
    name: '🌐 Open Source',
    tag: 'The Commons',
    color: '#b07cff',
    desc: 'Released weights are forever. Free help, permanent stakes.',
    inspired: 'Meta / Mistral / open-weights ecosystem',
    startingDesc: '1 GPU (general) · solo founder · $250 · Community Compute meter',

    capabilityMod: 1.00,
    trustMod: 1.10,        // openness buys some goodwill
    controlMod: 1.10,      // public weights = harder to steer
    revenueMod: 0.70,      // ecosystem revenue ramps later
    gpuPriceMod: 1.00,

    defaultAutopilot: 'frontier',
    exclusiveBranch: 'ecosystem',
    lockedAutopilots: [],

    applyStartingKit(state) {
      Game.addGpu('general');
      // No employees — solo founder
      state.money = 250;
      state.flags['community-compute-active'] = true;
      state.archetypeData = {
        communityComputePerTick: 0.7,   // base bonus, fluctuates with releases
        communityVolatility: 0.4,
        releasesShipped: 0,
      };
      Game.addLog('First README pushed. The community is watching the repo.', '');
    },

    openingFlavor:
      "You and one chip. The volunteers will show up if the work is good — and if you ship. Remember: every release is a one-way door. There is no recall on weights you've already published.",

    incomeFlavor:
      "Community Compute meter grows with every release; it bleeds into both money and free Compute every tick. GitHub Sponsors pay $500 at every 100-unit milestone.",
  },

  /* ===================== RESEARCH LAB ===================== */
  research: {
    id: 'research',
    name: '🎓 Research Lab',
    tag: 'The Academic',
    color: '#7ce1b3',
    desc: 'Truth, then product. Narrow excellence, slow generality.',
    inspired: 'DeepMind / academic labs',
    startingDesc: '1 GPU (research-spec) · Senior PI + Postdoc · $200 · Lab Bench passive · Auto-Diplomat locked',

    capabilityMod: 0.95,
    trustMod: 1.30,
    controlMod: 0.80,
    revenueMod: 0.60,      // volatile, mostly grants
    gpuPriceMod: 1.05,

    defaultAutopilot: 'safe',
    exclusiveBranch: 'prestige',
    // No real political apparatus — Auto-Diplomat unavailable
    lockedAutopilots: ['auto-diplomat'],

    applyStartingKit(state) {
      Game.addGpu('research');
      Game.addPersonnel('Senior PI', 0);
      Game.addPersonnel('Capabilities Engineer', 0, 'Postdoc ' + Game.makeRandomName().split(' ')[0]);
      state.money = 200;
      state.flags['lab-bench-active'] = true;
      state.archetypeData = {
        prestige: 0,                // unique resource
        labBenchUptime: 0,          // ticks the research GPU has stayed on research workloads
        obsolescencePerTick: 0.0008, // slow capability decay if not publishing
      };
      Game.addLog('Lab Bench powered on. The Senior PI sets out the kettle.', '');
    },

    openingFlavor:
      "The grant came through, the chip is humming, and the kettle is on. We are not racing the racers — we are doing the work no one else has the patience for. Publish often. The Bench rewards the long uptimes.",

    incomeFlavor:
      "Each paradigm shift or tier-up becomes a Publication: +$400 cash + capability bump. Lab grant trickles continuously, decaying to zero across 90 days without a publication.",
  },
};
