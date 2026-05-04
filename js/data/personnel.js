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
    },
    {
      key: 'capabilities',
      name: 'Capabilities Engineer',
      icon: '🧠',
      desc: 'Accelerates Compute -> Capability conversion. Worsens Control drift over time. The most efficient way to turn chips into model quality.',
      baseCost: 200,
      hint: 'Speed comes at a price. Pair with an interp researcher to balance.',
    },
    {
      key: 'interpretability',
      name: 'Interpretability Researcher',
      icon: '🔬',
      desc: 'Slows Control drift, raises interp coverage, makes incidents previewable. Does not generate Revenue directly.',
      baseCost: 220,
      hint: 'Pure defensive hire. Indispensable past Beacon tier.',
    },
    {
      key: 'comms',
      name: 'Comms Lead',
      icon: '📣',
      desc: 'Boosts Trust recovery and softens incident severity. Writes the apology before the news cycle has crested.',
      baseCost: 180,
      hint: 'Worth their salary the first time an incident fires.',
    },
    {
      key: 'deployment',
      name: 'Deployment Lead',
      icon: '🚀',
      desc: 'Accelerates Capability -> Revenue. Tightens the inference fleet, opens new verticals. Adds a small dependence drift.',
      baseCost: 200,
      hint: 'The economic engine of mid-game.',
    },
    {
      key: 'senior-pi',
      name: 'Senior PI',
      icon: '🎓',
      desc: 'Highest-quality Capability research per chip-hour. Slow hiring rate. Available only at Research Lab archetype.',
      baseCost: 350,
      archetypeOnly: 'research',
      hint: 'Lab Bench compounds when a Senior PI keeps the research GPU fed.',
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
    return Math.round(role.baseCost * Math.pow(growth, existing));
  },

  // Convenience automation-level descriptions (UI affordance).
  levelLabels: ['Human', 'Human + AI', 'AI agent (supervised)', 'Fully autonomous'],
};
