/* personnel-quirks.js — Hireable-personnel personality traits.
   Each quirk is a small, named effect bundle that hangs off a personnel
   object's `quirks` array. Quirks roll at hire time from the role's
   quirkPool (see js/data/personnel.js).

   Effects are *declarative*: a key/value bag of multipliers/flags read
   by Game.synergies.compose(). Synergies (js/synergies.js) trigger when
   particular quirks or quirk-tags collide on the same roster.

   Effect keys (read by sim/training/deployments via state.flags['synergy-*-mult']):
     architectureChance      — multiplier on architecture-experiment paradigm chance
     pretrainComputeMult     — multiplier on pretrain compute cost (lower = cheaper)
     postTrainTrustMult      — multiplier on trust gain from post-training
     controlDriftMult        — multiplier on control drift (lower = better)
     trustRecoveryMult       — multiplier on per-tick trust recovery
     revenueMult             — multiplier on deployment revenue
     dependenceMult          — multiplier on dependence accumulation (lower = better)
     hireDiscount            — multiplier on next hire cost (lower = better)
     moraleAura              — flat reduction in founder stress per tick
     incidentSeverityMult    — multiplier on incident severity (lower = better)
*/

window.Game = window.Game || {};

Game.personnelQuirks = (function () {

  /* ---------- catalogue ---------- */

  const quirks = [
    // ===== COMMON (8-10) — small, flavor-forward bonuses =====
    {
      id: 'compulsively-documents',
      name: 'Compulsively Documents',
      icon: '📓',
      desc: 'Writes a wiki entry for every meeting. The handoff doc is already done.',
      tags: ['process'],
      effect: { hireDiscount: 0.9 },
      roles: ['office-manager', 'capabilities', 'interpretability', 'comms', 'deployment', 'senior-pi'],
      rarity: 'common',
    },
    {
      id: 'snack-evangelist',
      name: 'Snack Evangelist',
      icon: '🍩',
      desc: 'Keeps the kitchen stocked. The Slack channel is full of donut photos.',
      tags: ['morale'],
      effect: { moraleAura: 0.05 },
      roles: ['office-manager', 'comms'],
      rarity: 'common',
    },
    {
      id: 'paradigm-hunter',
      name: 'Paradigm Hunter',
      icon: '🔭',
      desc: 'Always reading the latest preprints. Keeps sending Slacks at 11pm.',
      tags: ['research', 'capabilities'],
      effect: { architectureChance: 1.25 },
      roles: ['capabilities', 'senior-pi'],
      rarity: 'common',
    },
    {
      id: 'quiet-voice',
      name: 'Quiet Voice',
      icon: '🤫',
      desc: 'Rarely speaks in standup. When they do, the model behaves better afterward.',
      tags: ['safety', 'interp'],
      effect: { controlDriftMult: 0.92 },
      roles: ['interpretability', 'senior-pi'],
      rarity: 'common',
    },
    {
      id: 'pr-crisis-energy',
      name: 'PR Crisis Energy',
      icon: '📰',
      desc: 'Drafts the apology before the news cycle has crested. Has a Politico tab open at all times.',
      tags: ['comms', 'pr'],
      effect: { trustRecoveryMult: 1.15, incidentSeverityMult: 0.9 },
      roles: ['comms'],
      rarity: 'common',
    },
    {
      id: 'founders-friend',
      name: "Founder's Friend",
      icon: '🤝',
      desc: 'Roommate from undergrad. Talks the founder down at 2am.',
      tags: ['morale'],
      effect: { moraleAura: 0.08, hireDiscount: 0.95 },
      roles: ['office-manager', 'capabilities', 'interpretability', 'comms', 'deployment'],
      rarity: 'common',
    },
    {
      id: 'shipping-mindset',
      name: 'Shipping Mindset',
      icon: '🚚',
      desc: '"Done is better than perfect." Their dashboards never break.',
      tags: ['deployment', 'product'],
      effect: { revenueMult: 1.08 },
      roles: ['deployment', 'capabilities'],
      rarity: 'common',
    },
    {
      id: 'eval-skeptic',
      name: 'Eval Skeptic',
      icon: '🧪',
      desc: 'Trusts no benchmark on first read. Catches Goodharted metrics before they ship.',
      tags: ['safety', 'process'],
      effect: { incidentSeverityMult: 0.85 },
      roles: ['interpretability', 'senior-pi', 'comms'],
      rarity: 'common',
    },
    {
      id: 'caffeinated-throughput',
      name: 'Caffeinated Throughput',
      icon: '☕',
      desc: 'Six espressos before noon. The PRs review themselves.',
      tags: ['process'],
      effect: { pretrainComputeMult: 0.95 },
      roles: ['capabilities', 'office-manager', 'deployment'],
      rarity: 'common',
    },
    {
      id: 'open-source-believer',
      name: 'Open-Source Believer',
      icon: '🌐',
      desc: 'Pushes weights to HuggingFace before legal can call. The community loves them.',
      tags: ['ecosystem', 'community'],
      effect: { revenueMult: 1.05, dependenceMult: 1.1 },
      roles: ['capabilities', 'deployment', 'senior-pi'],
      rarity: 'common',
    },

    // ===== UNCOMMON (8-10) — meatier; tag-bait for synergies =====
    {
      id: 'interpretability-pilled',
      name: 'Interpretability-Pilled',
      icon: '🔬',
      desc: 'Has all of Chris Olah\'s talks bookmarked. Names their houseplants after circuits.',
      tags: ['safety', 'interp'],
      effect: { controlDriftMult: 0.85, trustRecoveryMult: 1.1 },
      roles: ['interpretability', 'senior-pi'],
      rarity: 'uncommon',
    },
    {
      id: 'distillation-specialist',
      name: 'Distillation Specialist',
      icon: '⚗️',
      desc: 'Squeezes 70B into 7B and ships it Tuesday.',
      tags: ['capabilities', 'efficiency'],
      effect: { pretrainComputeMult: 0.85 },
      roles: ['capabilities', 'senior-pi'],
      rarity: 'uncommon',
    },
    {
      id: 'big-e-reader',
      name: 'Big-E Reader',
      icon: '📖',
      desc: 'Reads Yudkowsky on the subway. Argues with the model in the margins.',
      tags: ['safety', 'interp', 'philosophy'],
      effect: { controlDriftMult: 0.88, incidentSeverityMult: 0.9 },
      roles: ['interpretability', 'senior-pi', 'comms'],
      rarity: 'uncommon',
    },
    {
      id: 'knows-a-senator',
      name: 'Knows a Senator',
      icon: '🏛',
      desc: 'Their college roommate is on Senate AI Subcommittee staff. Useful when bills move.',
      tags: ['comms', 'pr', 'policy'],
      effect: { trustRecoveryMult: 1.25, incidentSeverityMult: 0.8 },
      roles: ['comms'],
      rarity: 'uncommon',
    },
    {
      id: 'ex-frontier',
      name: 'Ex-Frontier',
      icon: '🔥',
      desc: 'Just left a top-three lab under a cloud. NDA shaped like a lawsuit. Knows things.',
      tags: ['capabilities', 'pr'],
      effect: { architectureChance: 1.2, pretrainComputeMult: 0.9, trustRecoveryMult: 0.85 },
      roles: ['capabilities', 'senior-pi'],
      rarity: 'uncommon',
    },
    {
      id: 'burnt-out',
      name: 'Burnt Out from Last Lab',
      icon: '💤',
      desc: '"I don\'t do crunch anymore." Quiet, slow, almost too honest.',
      tags: ['morale', 'safety', 'philosophy'],
      effect: { moraleAura: -0.05, controlDriftMult: 0.92, pretrainComputeMult: 1.05 },
      roles: ['capabilities', 'interpretability', 'comms', 'deployment', 'senior-pi'],
      rarity: 'uncommon',
    },
    {
      id: 'enterprise-rolodex',
      name: 'Enterprise Rolodex',
      icon: '📞',
      desc: 'Calls a Fortune 500 procurement officer by their first name.',
      tags: ['deployment', 'product', 'sales'],
      effect: { revenueMult: 1.2, dependenceMult: 0.95 },
      roles: ['deployment', 'comms'],
      rarity: 'uncommon',
    },
    {
      id: 'compulsively-types',
      name: 'Compulsively Types',
      icon: '⌨️',
      desc: 'Replies to every standup with a 600-word memo. The Notion is sprawling.',
      tags: ['process', 'morale'],
      effect: { hireDiscount: 0.85, moraleAura: -0.02 },
      roles: ['office-manager', 'capabilities', 'interpretability', 'comms', 'senior-pi'],
      rarity: 'uncommon',
    },
    {
      id: 'red-team-soul',
      name: 'Red-Team Soul',
      icon: '🗡',
      desc: 'Their idea of a fun Friday is jailbreaking the staging model. Files the bug, then the patch.',
      tags: ['safety', 'interp', 'capabilities'],
      effect: { architectureChance: 1.15, incidentSeverityMult: 0.8 },
      roles: ['capabilities', 'interpretability'],
      rarity: 'uncommon',
    },
    {
      id: 'continual-romantic',
      name: 'Continual-Learning Romantic',
      icon: '🌀',
      desc: 'Believes the model should learn forever. Wrote a Substack about it.',
      tags: ['capabilities', 'philosophy'],
      effect: { architectureChance: 1.1, dependenceMult: 1.15, controlDriftMult: 1.05 },
      roles: ['capabilities', 'senior-pi'],
      rarity: 'uncommon',
    },

    // ===== RARE (4-6) — bigger, weirder, often double-edged =====
    {
      id: 'mecha-hippie',
      name: 'Mecha-Hippie',
      icon: '🌻',
      desc: 'Codes barefoot. Talks to the GPUs. Outputs are inexplicably aligned.',
      tags: ['safety', 'interp', 'philosophy', 'morale'],
      effect: { controlDriftMult: 0.75, trustRecoveryMult: 1.2, moraleAura: 0.1 },
      roles: ['interpretability', 'senior-pi'],
      rarity: 'rare',
    },
    {
      id: 'venture-whisperer',
      name: 'Venture Whisperer',
      icon: '💼',
      desc: 'Closed a $40M round on a napkin. Knows when to fundraise; knows when to hide.',
      tags: ['comms', 'pr', 'sales'],
      effect: { revenueMult: 1.3, hireDiscount: 0.85, trustRecoveryMult: 1.1 },
      roles: ['comms', 'deployment'],
      rarity: 'rare',
    },
    {
      id: 'ghost-of-deepmind',
      name: 'Ghost of DeepMind',
      icon: '👻',
      desc: 'Was in the Gemini room. Won\'t say what they saw. The diagrams are uncomfortably good.',
      tags: ['capabilities', 'research'],
      effect: { architectureChance: 1.5, pretrainComputeMult: 0.85, controlDriftMult: 1.1 },
      roles: ['capabilities', 'senior-pi'],
      rarity: 'rare',
    },
    {
      id: 'crisis-monk',
      name: 'Crisis Monk',
      icon: '🪷',
      desc: 'Calmest person in the room when the building is on fire. The board takes their calls.',
      tags: ['comms', 'pr', 'morale'],
      effect: { incidentSeverityMult: 0.6, trustRecoveryMult: 1.4, moraleAura: 0.08 },
      roles: ['comms', 'senior-pi'],
      rarity: 'rare',
    },
    {
      id: 'eaccel-true-believer',
      name: 'e/acc True Believer',
      icon: '⚡',
      desc: 'Posts manifestos at 4am. "More compute, fewer questions." Productive, exhausting.',
      tags: ['capabilities', 'philosophy'],
      effect: { pretrainComputeMult: 0.75, architectureChance: 1.3, controlDriftMult: 1.2, trustRecoveryMult: 0.9 },
      roles: ['capabilities'],
      rarity: 'rare',
    },
    {
      id: 'synthetic-data-savant',
      name: 'Synthetic Data Savant',
      icon: '🧬',
      desc: 'Bootstraps datasets out of thin air. The flywheel actually flywheels.',
      tags: ['capabilities', 'efficiency', 'research'],
      effect: { pretrainComputeMult: 0.7, architectureChance: 1.15 },
      roles: ['capabilities', 'senior-pi'],
      rarity: 'rare',
    },
  ];

  /* ---------- lookup ---------- */

  function byId(id) {
    return quirks.find(q => q.id === id) || null;
  }

  function all() {
    return quirks.slice();
  }

  function poolForRole(roleKey) {
    /* If the role declares an explicit quirkPool, honor it. Otherwise
       fall back to "any quirk that lists this role in its `roles`". */
    const role = (Game.personnelData && Game.personnelData.byKey)
      ? Game.personnelData.byKey(roleKey)
      : null;
    if (role && Array.isArray(role.quirkPool) && role.quirkPool.length) {
      return role.quirkPool
        .map(id => byId(id))
        .filter(q => q);
    }
    return quirks.filter(q => Array.isArray(q.roles) && q.roles.includes(roleKey));
  }

  /* ---------- rolling ---------- */

  /* Rarity weights: common 70, uncommon 25, rare 5. */
  const RARITY_WEIGHT = { common: 70, uncommon: 25, rare: 5 };

  function _weightedPick(pool) {
    if (!pool.length) return null;
    let total = 0;
    for (const q of pool) total += (RARITY_WEIGHT[q.rarity] || 10);
    let r = Math.random() * total;
    for (const q of pool) {
      r -= (RARITY_WEIGHT[q.rarity] || 10);
      if (r <= 0) return q;
    }
    return pool[pool.length - 1];
  }

  /* Roll 1-2 quirks for a personnel object and attach them.
     Always assigns at least 1; ~40% chance of a second (non-duplicate). */
  function rollFor(roleKey, person) {
    if (!person) return [];
    const pool = poolForRole(roleKey);
    if (!pool.length) {
      person.quirks = person.quirks || [];
      return person.quirks;
    }
    const picks = [];
    const first = _weightedPick(pool);
    if (first) picks.push(first.id);
    if (Math.random() < 0.4) {
      const second = _weightedPick(pool.filter(q => !picks.includes(q.id)));
      if (second) picks.push(second.id);
    }
    person.quirks = picks;
    return picks;
  }

  /* Ensure every personnel on the roster has a `quirks` array.
     Called defensively on first tick — covers archetype-applied
     starting personnel that were added before this module loaded. */
  function ensureRosterQuirks() {
    const s = Game.state;
    if (!s || !Array.isArray(s.personnel)) return;
    for (const p of s.personnel) {
      if (Array.isArray(p.quirks) && p.quirks.length) continue;
      // Map p.role (display name) back to a role key.
      let roleKey = null;
      if (Game.personnelData && Array.isArray(Game.personnelData.roles)) {
        const role = Game.personnelData.roles.find(r => r.name === p.role || r.key === p.role);
        if (role) roleKey = role.key;
      }
      if (roleKey) rollFor(roleKey, p);
      else p.quirks = [];
    }
  }

  return {
    quirks,
    byId,
    all,
    poolForRole,
    rollFor,
    ensureRosterQuirks,
  };

})();
