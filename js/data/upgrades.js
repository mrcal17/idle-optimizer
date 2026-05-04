/* upgrades.js — The upgrade tree.
   Three universal branches (capability, deployment, safety) plus the
   operations branch (autopilot scope unlocks) plus four archetype-
   exclusive branches (race-posture, interp-stack, ecosystem, prestige).

   Designer-friendly: each entry is data. Effects are a small mutator
   function that flips flags or twiddles state on purchase.

   Read by sim.js for `coverage('interpretability')`. */

window.Game = window.Game || {};

Game.upgrades = {};

/* ============================================================
   Definition list — ~28 upgrades.
   ============================================================ */
Game.upgrades.list = [

  /* ----- CAPABILITY BRANCH (universal) ----- */
  {
    id: 'cap-distillation',
    branch: 'capability',
    name: 'Compute Distillation',
    flavor: "Squeeze more capability out of every chip-hour. The team finds two old papers nobody had bothered to cite together.",
    cost: { compute: 80, money: 0, capability: 0 },
    requireTier: 0, requires: [], excludes: [],
    short: '+15% capability gain.',
    effect(state) { state.flags['cap-distillation'] = true; },
  },
  {
    id: 'cap-bigrun',
    branch: 'capability',
    name: 'The Big Run',
    flavor: "Every lab does one of these. Pretrain costs jump but the ceiling rises with them. The interns stop sleeping.",
    cost: { compute: 400, money: 600, capability: 30 },
    requireTier: 1, requires: ['cap-distillation'], excludes: [],
    short: 'Pretraining ceilings raised; control drift sharpens.',
    effect(state) { state.flags['cap-bigrun'] = true; },
  },
  {
    id: 'cap-sparse-moe',
    branch: 'capability',
    name: 'Sparse Mixture of Experts',
    flavor: "Most of the network sleeps until called. Compute goes farther; nobody is quite sure which expert handles ethics.",
    cost: { compute: 1200, money: 0, capability: 120 },
    requireTier: 2, requires: ['cap-bigrun'], excludes: ['cap-dense-monolith'],
    short: '-30% pretraining cost.',
    effect(state) { state.flags['cap-sparse-moe'] = true; },
  },
  {
    id: 'cap-dense-monolith',
    branch: 'capability',
    name: 'Dense Monolith',
    flavor: "One model, undivided, soaked in compute. Easier to interpret. Harder to feed.",
    cost: { compute: 1200, money: 0, capability: 120 },
    requireTier: 2, requires: ['cap-bigrun'], excludes: ['cap-sparse-moe'],
    short: '+15% capability quality; +10% interp coverage.',
    effect(state) { state.flags['cap-dense-monolith'] = true; },
  },
  {
    id: 'cap-self-play',
    branch: 'capability',
    name: 'Self-Play Curricula',
    flavor: "It teaches itself by losing to itself, then winning, then losing again. The graphs go up. The whiteboard gets crowded.",
    cost: { compute: 3000, money: 1500, capability: 400 },
    requireTier: 3, requires: [], excludes: [],
    short: 'Capability gain compounds during training; control drifts faster.',
    effect(state) { state.flags['self-play'] = true; },
  },

  /* ----- DEPLOYMENT BRANCH (universal) ----- */
  {
    id: 'dep-api-launch',
    branch: 'deployment',
    name: 'Public API',
    flavor: "Three endpoints, a rate limiter, and a status page. The first paying customer is a law firm.",
    cost: { compute: 60, money: 200, capability: 0 },
    requireTier: 0, requires: [], excludes: [],
    short: 'Inference GPUs earn 1.3x revenue.',
    effect(state) { state.flags['public-api'] = true; },
  },
  {
    id: 'dep-coding',
    branch: 'deployment',
    name: 'Specialized: Coding',
    flavor: "The model becomes excellent at autocomplete. The model becomes excellent at filing pull requests. The model becomes excellent.",
    cost: { compute: 200, money: 400, capability: 40 },
    requireTier: 1, requires: ['dep-api-launch'], excludes: ['dep-healthcare'],
    short: 'Coding-vertical revenue boost; dependence rises.',
    effect(state) { state.flags['vertical-coding'] = true; },
  },
  {
    id: 'dep-healthcare',
    branch: 'deployment',
    name: 'Specialized: Healthcare',
    flavor: "Slower revenue, longer audits, a regulator on speed-dial. Trust holds steadier when you serve hospitals.",
    cost: { compute: 200, money: 400, capability: 40 },
    requireTier: 1, requires: ['dep-api-launch'], excludes: ['dep-coding'],
    short: 'Steadier revenue; +trust recovery.',
    effect(state) { state.flags['vertical-healthcare'] = true; },
  },
  {
    id: 'dep-fleet-ops',
    branch: 'deployment',
    name: 'Inference Fleet Ops',
    flavor: "Liquid cooling, hot-swap nodes, the kind of pager rotation that makes engineers leave for the safety lab.",
    cost: { compute: 800, money: 1200, capability: 80 },
    requireTier: 2, requires: ['dep-api-launch'], excludes: [],
    short: 'Inference revenue +40%.',
    effect(state) { state.flags['fleet-ops'] = true; },
  },
  {
    id: 'dep-agent-products',
    branch: 'deployment',
    name: 'Agent Products',
    flavor: "It books your flights. It writes your emails. It owns a calendar. Subscriptions climb; so does the dependence ledger.",
    cost: { compute: 2400, money: 2400, capability: 200 },
    requireTier: 3, requires: ['dep-fleet-ops'], excludes: [],
    short: 'Big revenue jump; dependence accelerates.',
    effect(state) { state.flags['agent-products'] = true; },
  },

  /* ----- SAFETY BRANCH (universal) ----- */
  {
    id: 'saf-redteam',
    branch: 'safety',
    name: 'Red Team Charter',
    flavor: "Three people whose entire job is to make the model do the wrong thing on purpose. They are surprisingly cheerful.",
    cost: { compute: 40, money: 150, capability: 0 },
    requireTier: 0, requires: [], excludes: [],
    short: '-20% incident severity.',
    effect(state) {
      state.flags['red-team'] = true;
      state.flags['safety-research-active'] = true;
    },
  },
  {
    id: 'saf-evals',
    branch: 'safety',
    name: 'Capability Evaluations',
    flavor: "A standing battery of probes the model has to pass before any release. Slows the calendar; saves the trust meter.",
    cost: { compute: 200, money: 0, capability: 30 },
    requireTier: 1, requires: ['saf-redteam'], excludes: [],
    short: 'Reveals tier failure modes earlier.',
    effect(state) { state.flags['capability-evals'] = true; },
  },
  {
    id: 'saf-rlhf',
    branch: 'safety',
    name: 'Preference Tuning',
    flavor: "Humans grade the answers. The model learns what humans like to read. Useful, sometimes worrying.",
    cost: { compute: 500, money: 200, capability: 60 },
    requireTier: 1, requires: ['saf-redteam'], excludes: [],
    short: '+trust recovery; small post-train boost.',
    effect(state) { state.flags['rlhf-active'] = true; },
  },
  {
    id: 'saf-charter',
    branch: 'safety',
    name: 'Public Safety Charter',
    flavor: "A document with bright lines. Posted to the website. The lawyers softened it; the policy team toughened it back.",
    cost: { compute: 0, money: 1000, capability: 100 },
    requireTier: 2, requires: ['saf-rlhf', 'saf-evals'], excludes: [],
    short: '+1.5x trust recovery; locks two pivots.',
    effect(state) { state.flags['public-charter'] = true; },
  },

  /* ----- OPERATIONS BRANCH (autopilot scope unlocks) ----- */
  {
    id: 'ops-auto-om',
    branch: 'operations',
    name: 'Auto-Office-Manager',
    flavor: "Snacks, supplies, scheduling. Auto-OM v1 has ordered 4,000 units of grape soda. Pending review.",
    cost: { compute: 30, money: 100, capability: 0 },
    requireTier: 0, requires: [], excludes: [],
    short: 'Autopilot can manage office logistics.',
    effect(state) {
      state.autopilot.unlocks['auto-om'] = true;
      state.flags['auto-om-active'] = true;
      state.stats.autoOmDeployed = true;
      if (!state.stats.firstAutomationDay) state.stats.firstAutomationDay = state.day;
    },
  },
  {
    id: 'ops-auto-hr',
    branch: 'operations',
    name: 'Auto-HR',
    flavor: "Hiring, firing, performance reviews — all by policy. The first delegation that touches another person's paycheck.",
    cost: { compute: 150, money: 400, capability: 30 },
    requireTier: 1, requires: ['ops-auto-om'], excludes: [],
    short: 'Autopilot hires and fires per policy.',
    effect(state) { state.autopilot.unlocks['auto-hr'] = true; },
  },
  {
    id: 'ops-auto-comms',
    branch: 'operations',
    name: 'Auto-Comms',
    flavor: "Drafts the apology before the incident is fully understood. Catches the news cycle before it crests.",
    cost: { compute: 250, money: 500, capability: 50 },
    requireTier: 1, requires: ['ops-auto-om'], excludes: [],
    short: 'Autopilot handles PR responses to incidents.',
    effect(state) { state.autopilot.unlocks['auto-comms'] = true; },
  },
  {
    id: 'ops-auto-strategist',
    branch: 'operations',
    name: 'Auto-Strategist',
    flavor: "Quietly accepts and declines minor pivots. You stop checking the dashboard quite as often.",
    cost: { compute: 600, money: 1200, capability: 120 },
    requireTier: 2, requires: ['ops-auto-hr', 'ops-auto-comms'], excludes: [],
    short: 'Autopilot takes/declines minor pivots.',
    effect(state) { state.autopilot.unlocks['auto-strategist'] = true; },
  },
  {
    id: 'ops-auto-diplomat',
    branch: 'operations',
    name: 'Auto-Diplomat',
    flavor: "Your AI now negotiates with governments on your behalf. It is, on paper, an excellent negotiator.",
    cost: { compute: 1400, money: 3000, capability: 250 },
    requireTier: 3, requires: ['ops-auto-strategist'], excludes: [],
    short: 'Autopilot manages geopolitical events. Locked for Research Lab.',
    effect(state) { state.autopilot.unlocks['auto-diplomat'] = true; },
  },
  {
    id: 'ops-auto-researcher',
    branch: 'operations',
    name: 'Auto-Researcher',
    flavor: "It picks its own problems now. The reading list it generates for the team is suspiciously good.",
    cost: { compute: 2200, money: 0, capability: 350 },
    requireTier: 3, requires: ['ops-auto-strategist'], excludes: [],
    short: 'Autopilot directs capability research.',
    effect(state) { state.autopilot.unlocks['auto-researcher'] = true; },
  },
  {
    id: 'ops-reflective',
    branch: 'operations',
    name: 'Reflective Autopilot',
    flavor: "Tweaks its own parameters based on outcomes. The most natural thing in the world. The most dangerous thing in the world.",
    cost: { compute: 5000, money: 5000, capability: 700 },
    requireTier: 4, requires: ['ops-auto-researcher'], excludes: [],
    short: 'Autopilot self-improves. Locked for Safety-First.',
    effect(state) { state.autopilot.unlocks['reflective'] = true; },
  },

  /* ----- RACE-POSTURE (Frontier exclusive) ----- */
  {
    id: 'race-no-brakes',
    branch: 'race-posture',
    name: 'No Brakes',
    flavor: "We do not slow down for incidents under a certain threshold. The legal team writes a memo nobody reads.",
    cost: { compute: 200, money: 800, capability: 60 },
    requireTier: 1, requires: [], excludes: [],
    short: '+25% capability speed; locks Public Safety Charter.',
    effect(state) {
      state.flags['no-brakes'] = true;
      // Hard lock the Charter from being purchased
      state.flags['lock:saf-charter'] = true;
    },
  },
  {
    id: 'race-buy-the-rack',
    branch: 'race-posture',
    name: 'Buy the Rack',
    flavor: "When the supplier hesitates, we buy the supplier. The footprint on the World scene grows another silhouette.",
    cost: { compute: 0, money: 4000, capability: 200 },
    requireTier: 2, requires: ['race-no-brakes'], excludes: [],
    short: 'Free 4 GPUs (general); -10% future GPU price.',
    effect(state) {
      for (let i = 0; i < 4; i++) Game.addGpu('general');
      state.flags['buy-the-rack'] = true;
    },
  },
  {
    id: 'race-leadership-cult',
    branch: 'race-posture',
    name: 'Leadership Cult',
    flavor: "Founder mythology. Tech-blog hagiographies. The team works late because the founder works later.",
    cost: { compute: 600, money: 0, capability: 300 },
    requireTier: 3, requires: ['race-buy-the-rack'], excludes: [],
    short: 'Personnel productivity x1.4; trust drops faster on incidents.',
    effect(state) { state.flags['leadership-cult'] = true; },
  },

  /* ----- INTERP-STACK (Safety-First exclusive) ----- */
  {
    id: 'interp-probes',
    branch: 'interp-stack',
    name: 'Activation Probes',
    flavor: "Tiny hooks into the residual stream. The dashboard lights up with feelings the model is having.",
    cost: { compute: 120, money: 200, capability: 30 },
    requireTier: 1, requires: [], excludes: [],
    short: '+30% interp coverage; -control drift.',
    effect(state) {
      state.flags['activation-probes'] = true;
    },
  },
  {
    id: 'interp-circuits',
    branch: 'interp-stack',
    name: 'Circuit Discovery',
    flavor: "Neuron-by-neuron archaeology. The interp team comes out of standups looking like they've seen a ghost.",
    cost: { compute: 600, money: 600, capability: 150 },
    requireTier: 2, requires: ['interp-probes'], excludes: [],
    short: 'Incidents become previewable.',
    effect(state) {
      state.flags['circuit-discovery'] = true;
      state.flags['incident-preview'] = true;
    },
  },
  {
    id: 'interp-deception-eval',
    branch: 'interp-stack',
    name: 'Deception Evaluation',
    flavor: "A standing test for whether the model says the same thing when it knows it is being watched as when it does not.",
    cost: { compute: 2000, money: 1500, capability: 400 },
    requireTier: 3, requires: ['interp-circuits'], excludes: [],
    short: 'Pharos-tier deceptive alignment is detectable.',
    effect(state) { state.flags['deception-eval'] = true; },
  },

  /* ----- ECOSYSTEM (Open Source exclusive) ----- */
  {
    id: 'eco-first-release',
    branch: 'ecosystem',
    name: 'First Open Release',
    flavor: "Tagged v0.1, pushed to the hub. By morning there are forks in three languages and a controversy in one.",
    cost: { compute: 80, money: 0, capability: 20 },
    requireTier: 1, requires: [], excludes: [],
    short: 'Community Compute +50%; weights become public.',
    effect(state) {
      state.flags['open-source-released'] = true;
      if (state.archetypeData) {
        state.archetypeData.communityComputePerTick = (state.archetypeData.communityComputePerTick || 0) * 1.5 + 0.3;
        state.archetypeData.releasesShipped = (state.archetypeData.releasesShipped || 0) + 1;
      }
    },
  },
  {
    id: 'eco-modder-buffs',
    branch: 'ecosystem',
    name: 'Modder Buffs',
    flavor: "The community has shipped fine-tunes you would never have authorized. Some are excellent. Some are catastrophic.",
    cost: { compute: 300, money: 0, capability: 100 },
    requireTier: 2, requires: ['eco-first-release'], excludes: [],
    short: 'Community contributes capability research; +dependence.',
    effect(state) { state.flags['modder-buffs'] = true; },
  },
  {
    id: 'eco-foundation',
    branch: 'ecosystem',
    name: 'Found a Foundation',
    flavor: "Nonprofit governance, transparent funding, a name with a Greek root. The community calls it 'mostly fine, actually.'",
    cost: { compute: 0, money: 3000, capability: 250 },
    requireTier: 3, requires: ['eco-modder-buffs'], excludes: [],
    short: '+trust recovery; community compute stabilizes.',
    effect(state) { state.flags['foundation-formed'] = true; },
  },

  /* ----- PRESTIGE (Research Lab exclusive) ----- */
  {
    id: 'prestige-paper',
    branch: 'prestige',
    name: 'Landmark Paper',
    flavor: "The kind of citation graph that draws a crowd. Prestige goes up; obsolescence pressure resets for a while.",
    cost: { compute: 200, money: 0, capability: 80 },
    requireTier: 1, requires: [], excludes: [],
    short: '+prestige; resets obsolescence drift.',
    effect(state) {
      state.flags['landmark-paper'] = true;
      if (state.archetypeData) {
        state.archetypeData.prestige = (state.archetypeData.prestige || 0) + 1;
      }
    },
  },
  {
    id: 'prestige-named-system',
    branch: 'prestige',
    name: 'Named System',
    flavor: "AlphaFold. AlphaGo. AlphaSomething. The press release writes itself; the journals call before publication.",
    cost: { compute: 1200, money: 0, capability: 300 },
    requireTier: 2, requires: ['prestige-paper'], excludes: [],
    short: 'Narrow domain becomes world-class; revenue stabilizes.',
    effect(state) {
      state.flags['named-system'] = true;
      if (state.archetypeData) {
        state.archetypeData.prestige = (state.archetypeData.prestige || 0) + 2;
      }
    },
  },
  {
    id: 'prestige-nobel-track',
    branch: 'prestige',
    name: 'Nobel Track',
    flavor: "A discovery the world had to wait twenty years for. The team is given enormous, slightly awkward, awards.",
    cost: { compute: 4000, money: 2000, capability: 800 },
    requireTier: 4, requires: ['prestige-named-system'], excludes: [],
    short: 'Apex resolution unlocks Suspended-AGI as a possibility.',
    effect(state) {
      state.flags['nobel-track'] = true;
      if (state.archetypeData) {
        state.archetypeData.prestige = (state.archetypeData.prestige || 0) + 5;
      }
    },
  },
];

/* ============================================================
   Coverage(branch) — used by sim.js for interpretability coverage
   and other branch-saturation calculations. Returns 0..1.
   ============================================================ */
Game.upgrades.coverage = function(branch) {
  if (!Game.state) return 0;
  // Map sim.js's request for 'interpretability' to safety+interp-stack
  if (branch === 'interpretability') {
    const relevant = Game.upgrades.list.filter(u =>
      u.branch === 'safety' || u.branch === 'interp-stack');
    if (!relevant.length) return 0;
    const owned = relevant.filter(u => Game.state.upgrades[u.id]).length;
    return Math.min(1, owned / Math.max(1, relevant.length));
  }
  const all = Game.upgrades.list.filter(u => u.branch === branch);
  if (!all.length) return 0;
  const owned = all.filter(u => Game.state.upgrades[u.id]).length;
  return owned / all.length;
};

/* ============================================================
   canPurchase / purchase
   ============================================================ */
Game.upgrades.byId = function(id) {
  return Game.upgrades.list.find(u => u.id === id) || null;
};

Game.upgrades.canPurchase = function(id, state) {
  state = state || Game.state;
  if (!state) return { ok: false, reason: 'no-state' };
  const u = Game.upgrades.byId(id);
  if (!u) return { ok: false, reason: 'unknown' };
  if (state.upgrades[id]) return { ok: false, reason: 'already-owned' };
  if (state.flags['lock:' + id]) return { ok: false, reason: 'locked-by-pivot' };

  // Tier gate
  if (state.capabilityTier < (u.requireTier || 0)) {
    return { ok: false, reason: 'tier-gate' };
  }

  // Branch eligibility — archetype-exclusive branches
  const arch = Game.archetypes[state.archetypeId];
  const exclusiveBranches = ['race-posture', 'interp-stack', 'ecosystem', 'prestige'];
  if (exclusiveBranches.indexOf(u.branch) >= 0) {
    if (!arch || arch.exclusiveBranch !== u.branch) {
      return { ok: false, reason: 'wrong-archetype' };
    }
  }

  // Prerequisites
  for (const reqId of (u.requires || [])) {
    if (!state.upgrades[reqId]) return { ok: false, reason: 'missing-prereq', missing: reqId };
  }
  // Mutual exclusions
  for (const exId of (u.excludes || [])) {
    if (state.upgrades[exId]) return { ok: false, reason: 'excluded-by', conflict: exId };
  }

  // Resource costs
  const c = u.cost || {};
  if ((c.compute || 0) > state.compute) return { ok: false, reason: 'compute' };
  if ((c.money || 0) > state.money) return { ok: false, reason: 'money' };
  if ((c.capability || 0) > state.capability) return { ok: false, reason: 'capability' };

  return { ok: true };
};

Game.upgrades.purchase = function(id, state) {
  state = state || Game.state;
  const check = Game.upgrades.canPurchase(id, state);
  if (!check.ok) return check;

  const u = Game.upgrades.byId(id);
  const c = u.cost || {};
  state.compute -= (c.compute || 0);
  state.money -= (c.money || 0);
  state.capability -= (c.capability || 0);

  state.upgrades[id] = true;
  if (typeof u.effect === 'function') {
    try { u.effect(state); }
    catch (e) { console.error('Upgrade effect failed:', id, e); }
  }
  if (Game.addLog) Game.addLog(`Purchased: ${u.name}.`, '');
  return { ok: true };
};
