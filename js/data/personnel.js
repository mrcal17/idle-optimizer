/* personnel.js — Hireable role definitions.
   Founder/CEO is implicit (always present, never replaceable) and is
   not in this list. Senior PI is Research-Lab-only.

   Read by personnel.js (logic) and the office scene (hire UI).
   Sim.js uses Game.config.personnel for the salary/productivity
   coefficients keyed by automation level (0..3). */

window.Game = window.Game || {};

Game.personnelData = {

  roles: [
    {
      key: 'office-manager',
      name: 'Office Manager',
      icon: '☕',
      desc: 'Snacks, supplies, scheduling, the glue that keeps the lab running. Gentle on Trust; the on-ramp for your first automation.',
      baseCost: 150,
      hint: 'Hire one early. Auto-OM unlocks the Vend moment.',
      quirkPool: [
        'compulsively-documents', 'snack-evangelist', 'founders-friend',
        'caffeinated-throughput', 'compulsively-types',
      ],
    },
    {
      key: 'capabilities',
      name: 'Capabilities Engineer',
      icon: '🧠',
      desc: 'Accelerates Compute -> Capability conversion. Worsens Control drift over time. The most efficient way to turn chips into model quality.',
      baseCost: 200,
      hint: 'Speed comes at a price. Pair with an interp researcher to balance.',
      quirkPool: [
        'paradigm-hunter', 'shipping-mindset', 'caffeinated-throughput',
        'open-source-believer', 'compulsively-documents', 'founders-friend',
        'distillation-specialist', 'ex-frontier', 'burnt-out',
        'red-team-soul', 'continual-romantic',
        'ghost-of-deepmind', 'eaccel-true-believer', 'synthetic-data-savant',
      ],
    },
    {
      key: 'interpretability',
      name: 'Interpretability Researcher',
      icon: '🔬',
      desc: 'Slows Control drift, raises interp coverage, makes incidents previewable. Does not generate Revenue directly.',
      baseCost: 220,
      hint: 'Pure defensive hire. Indispensable past Beacon tier.',
      quirkPool: [
        'quiet-voice', 'eval-skeptic', 'compulsively-documents',
        'founders-friend', 'compulsively-types',
        'interpretability-pilled', 'big-e-reader', 'burnt-out',
        'red-team-soul',
        'mecha-hippie',
      ],
    },
    {
      key: 'comms',
      name: 'Comms Lead',
      icon: '📣',
      desc: 'Boosts Trust recovery and softens incident severity. Writes the apology before the news cycle has crested.',
      baseCost: 180,
      hint: 'Worth their salary the first time an incident fires.',
      quirkPool: [
        'pr-crisis-energy', 'snack-evangelist', 'founders-friend',
        'eval-skeptic', 'compulsively-documents', 'compulsively-types',
        'knows-a-senator', 'big-e-reader', 'burnt-out', 'enterprise-rolodex',
        'venture-whisperer', 'crisis-monk',
      ],
    },
    {
      key: 'deployment',
      name: 'Deployment Lead',
      icon: '🚀',
      desc: 'Accelerates Capability -> Revenue. Tightens the inference fleet, opens new verticals. Adds a small dependence drift.',
      baseCost: 200,
      hint: 'The economic engine of mid-game.',
      quirkPool: [
        'shipping-mindset', 'caffeinated-throughput', 'open-source-believer',
        'founders-friend', 'compulsively-documents',
        'enterprise-rolodex', 'burnt-out',
        'venture-whisperer',
      ],
    },
    {
      key: 'senior-pi',
      name: 'Senior PI',
      icon: '🎓',
      desc: 'Highest-quality Capability research per chip-hour. Slow hiring rate. Available only at Research Lab archetype.',
      baseCost: 350,
      archetypeOnly: 'research',
      hint: 'Lab Bench compounds when a Senior PI keeps the research GPU fed.',
      quirkPool: [
        'paradigm-hunter', 'quiet-voice', 'compulsively-documents',
        'eval-skeptic', 'open-source-believer',
        'interpretability-pilled', 'distillation-specialist', 'big-e-reader',
        'ex-frontier', 'burnt-out', 'continual-romantic', 'compulsively-types',
        'mecha-hippie', 'ghost-of-deepmind', 'crisis-monk', 'synthetic-data-savant',
      ],
    },
  ],

  /* === Helpers (used by hire UI / autopilot) === */

  byKey(key) {
    return Game.personnelData.roles.find(r => r.key === key) || null;
  },

  // Roles available given the run's archetype (filters Senior PI for non-research labs).
  availableFor(archetypeId) {
    return Game.personnelData.roles.filter(r =>
      !r.archetypeOnly || r.archetypeOnly === archetypeId);
  },

  // Cost of an additional hire of a given role, scaled by how many of that
  // role are already on the roster. Mirrors the GPU growth curve in spirit.
  hireCost(roleKey, state) {
    state = state || Game.state;
    const role = Game.personnelData.byKey(roleKey);
    if (!role) return Infinity;
    const existing = state.personnel.filter(p => p.role === role.name).length;
    const growth = 1.35;
    let cost = role.baseCost * Math.pow(growth, existing);
    // Synergy / quirk hire-discount (set per tick by Game.synergies.tickEffects).
    if (state.flags && typeof state.flags['synergy-hire-discount'] === 'number') {
      cost *= state.flags['synergy-hire-discount'];
    }
    return Math.round(cost);
  },

  // Convenience automation-level descriptions (UI affordance).
  levelLabels: ['Human', 'Human + AI', 'AI agent (supervised)', 'Fully autonomous'],
};
