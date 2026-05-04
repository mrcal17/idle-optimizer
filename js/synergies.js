/* synergies.js — Team Chemistry layer.
   Reads state.personnel + each person's `quirks` array, looks up quirk
   metadata in Game.personnelQuirks, and:
     1. composes a flat multiplier bag of all per-quirk effects
     2. layers on extra effects from active *synergies* — combinations
        of quirks (by id or by tag) that, together, do something more
        than the sum of their parts.

   Effects flow into game systems through state.flags['synergy-*-mult']:
     synergy-arch-chance       — paradigm-shift roll multiplier
     synergy-pretrain-compute  — pretrain compute cost multiplier (lower = cheaper)
     synergy-posttrain-trust   — trust gain from post-training multiplier
     synergy-control-mult      — control drift multiplier (lower = better)
     synergy-trust-recovery    — trust recovery multiplier
     synergy-revenue           — deployment revenue multiplier
     synergy-dependence        — dependence accumulation multiplier (lower = better)
     synergy-hire-discount     — next-hire cost multiplier (lower = better)
     synergy-incident-severity — incident severity multiplier (lower = better)
     synergy-morale-aura       — flat per-tick stress reduction

   Defensive: works even if Game.personnelQuirks is missing — just
   yields an empty effect bag and an empty synergy list.
*/

window.Game = window.Game || {};

Game.synergies = (function () {

  /* ---------- definitions ---------- */

  const definitions = [
    {
      id: 'safety-stack',
      name: 'Safety Stack',
      desc: '3+ team members with safety/interp-flavored quirks',
      requires: { quirkTags: ['safety', 'interp'], minCount: 3 },
      effect: { controlDriftMult: 0.7, trustRecoveryMult: 1.3 },
      flavor: 'You can hear someone typing arguments in the all-hands chat at 2am.',
    },
    {
      id: 'paradigm-pipeline',
      name: 'Paradigm Pipeline',
      desc: 'Paradigm Hunter + Distillation Specialist on the same roster',
      requires: { quirkIds: ['paradigm-hunter', 'distillation-specialist'], all: true },
      effect: { architectureChance: 1.5, pretrainComputeMult: 0.9 },
      flavor: '"What if we just—" "Yes." Architecture experiments compound into a real flywheel.',
    },
    {
      id: 'press-corps',
      name: 'Press Corps',
      desc: 'PR Crisis Energy + Knows a Senator',
      requires: { quirkIds: ['pr-crisis-energy', 'knows-a-senator'], all: true },
      effect: { trustRecoveryMult: 1.4, incidentSeverityMult: 0.6 },
      flavor: 'The story breaks at 7am. The op-ed runs at 9am. Nobody sees the original story.',
    },
    {
      id: 'convert-energy',
      name: 'Convert Energy',
      desc: 'Burnt-out colleague + Big-E Reader find common ground',
      requires: { quirkIds: ['burnt-out', 'big-e-reader'], all: true },
      effect: { moraleAura: 0.12, controlDriftMult: 0.85, trustRecoveryMult: 1.1 },
      flavor: 'Two cynics and a whiteboard. Stress floors lower than they should be.',
    },
    {
      id: 'ecosystem-flywheel',
      name: 'Ecosystem Flywheel',
      desc: 'Open-Source Believer plus 1+ ecosystem-tagged colleague',
      requires: { quirkIds: ['open-source-believer'], minCount: 1, alsoTags: ['ecosystem', 'community'], minTagCount: 2 },
      effect: { revenueMult: 1.25, hireDiscount: 0.85 },
      flavor: 'Pull requests show up overnight from contributors you have never met.',
    },
    {
      id: 'process-engine',
      name: 'Process Engine',
      desc: '2+ process-tagged personnel keep the lab running on rails',
      requires: { quirkTags: ['process'], minCount: 2 },
      effect: { hireDiscount: 0.85, pretrainComputeMult: 0.95 },
      flavor: 'The runbook is up to date. Nobody is on call alone.',
    },
    {
      id: 'sales-floor',
      name: 'Sales Floor',
      desc: 'Enterprise Rolodex + a Shipping/Product mindset',
      requires: { quirkIds: ['enterprise-rolodex'], all: true, alsoTags: ['product', 'sales', 'deployment'], minTagCount: 2 },
      effect: { revenueMult: 1.35, dependenceMult: 1.05 },
      flavor: 'The forecast hits. The forecast keeps hitting. The board stops asking questions.',
    },
    {
      id: 'red-team-cell',
      name: 'Red-Team Cell',
      desc: 'Red-Team Soul + an Eval Skeptic. Things break in staging now, not prod.',
      requires: { quirkIds: ['red-team-soul', 'eval-skeptic'], all: true },
      effect: { incidentSeverityMult: 0.55, controlDriftMult: 0.9 },
      flavor: 'Friday afternoon: a gleeful "I broke it." Monday morning: a fix.',
    },
    {
      id: 'doomer-quartet',
      name: 'Doomer Quartet',
      desc: '4+ philosophy/safety-tagged thinkers. The lab feels different.',
      requires: { quirkTags: ['philosophy', 'safety', 'interp'], minCount: 4 },
      effect: { controlDriftMult: 0.6, architectureChance: 0.9, trustRecoveryMult: 1.2 },
      flavor: 'Standup runs forty minutes long now. They argue about Bostrom. The model behaves.',
    },
    {
      id: 'caffeine-and-crisis',
      name: 'Caffeine & Crisis',
      desc: 'Caffeinated Throughput meets Crisis Monk. Steady hands and fast hands.',
      requires: { quirkIds: ['caffeinated-throughput', 'crisis-monk'], all: true },
      effect: { pretrainComputeMult: 0.88, incidentSeverityMult: 0.7, moraleAura: 0.05 },
      flavor: 'Espresso machine humming, board room calm. Both at once.',
    },
  ];

  /* ---------- helpers ---------- */

  function _allQuirksFromState(state) {
    const out = [];
    if (!state || !Array.isArray(state.personnel)) return out;
    if (!Game.personnelQuirks) return out;
    for (const p of state.personnel) {
      if (!Array.isArray(p.quirks)) continue;
      for (const qid of p.quirks) {
        const q = Game.personnelQuirks.byId ? Game.personnelQuirks.byId(qid) : null;
        if (q) out.push(q);
      }
    }
    return out;
  }

  function _matches(synergy, allQuirks) {
    const req = synergy.requires || {};
    const ids = allQuirks.map(q => q.id);

    /* Required specific quirk ids */
    if (Array.isArray(req.quirkIds) && req.quirkIds.length) {
      if (req.all) {
        for (const need of req.quirkIds) {
          if (!ids.includes(need)) return false;
        }
      } else {
        let any = false;
        for (const need of req.quirkIds) if (ids.includes(need)) { any = true; break; }
        if (!any) return false;
      }
    }

    /* Required tag count (count of personnel-quirks carrying ANY listed tag) */
    if (Array.isArray(req.quirkTags) && req.quirkTags.length) {
      const need = req.minCount || 1;
      let count = 0;
      for (const q of allQuirks) {
        if (!Array.isArray(q.tags)) continue;
        for (const t of q.tags) {
          if (req.quirkTags.includes(t)) { count++; break; }
        }
      }
      if (count < need) return false;
    }

    /* Optional secondary tag count (used for compound rules like
       "Open-Source Believer + 1 more ecosystem-tagged" */
    if (Array.isArray(req.alsoTags) && req.alsoTags.length) {
      const need = req.minTagCount || 1;
      let count = 0;
      for (const q of allQuirks) {
        if (!Array.isArray(q.tags)) continue;
        for (const t of q.tags) {
          if (req.alsoTags.includes(t)) { count++; break; }
        }
      }
      if (count < need) return false;
    }

    return true;
  }

  /* ---------- API ---------- */

  function activeSynergies(state) {
    state = state || Game.state;
    if (!state) return [];
    const all = _allQuirksFromState(state);
    if (!all.length) return [];
    return definitions.filter(s => _matches(s, all));
  }

  function _emptyEffects() {
    return {
      architectureChance: 1,
      pretrainComputeMult: 1,
      postTrainTrustMult: 1,
      controlDriftMult: 1,
      trustRecoveryMult: 1,
      revenueMult: 1,
      dependenceMult: 1,
      hireDiscount: 1,
      moraleAura: 0,
      incidentSeverityMult: 1,
    };
  }

  function _applyEffect(bag, eff) {
    if (!eff) return;
    for (const k of Object.keys(bag)) {
      if (typeof eff[k] === 'number') {
        if (k === 'moraleAura') bag[k] += eff[k];
        else bag[k] *= eff[k];
      }
    }
  }

  /* Aggregate every quirk + every active synergy into a single effect bag. */
  function compose(state) {
    state = state || Game.state;
    const bag = _emptyEffects();
    if (!state) return bag;
    const all = _allQuirksFromState(state);
    for (const q of all) _applyEffect(bag, q.effect);
    const active = activeSynergies(state);
    for (const s of active) _applyEffect(bag, s.effect);
    return bag;
  }

  /* Per-tick push: write composed multipliers onto state.flags so other
     modules (sim/training/deployments) can multiply against them
     without importing this module directly. Also applies the morale-aura
     drip to the founder's stress. */
  function tickEffects() {
    const s = Game.state;
    if (!s) return;
    /* Defensive: ensure starting personnel got their quirks rolled. */
    if (Game.personnelQuirks && Game.personnelQuirks.ensureRosterQuirks) {
      Game.personnelQuirks.ensureRosterQuirks();
    }
    const bag = compose(s);
    s.flags = s.flags || {};
    s.flags['synergy-arch-chance'] = bag.architectureChance;
    s.flags['synergy-pretrain-compute'] = bag.pretrainComputeMult;
    s.flags['synergy-posttrain-trust'] = bag.postTrainTrustMult;
    s.flags['synergy-control-mult'] = bag.controlDriftMult;
    s.flags['synergy-trust-recovery'] = bag.trustRecoveryMult;
    s.flags['synergy-revenue'] = bag.revenueMult;
    s.flags['synergy-dependence'] = bag.dependenceMult;
    s.flags['synergy-hire-discount'] = bag.hireDiscount;
    s.flags['synergy-incident-severity'] = bag.incidentSeverityMult;
    s.flags['synergy-morale-aura'] = bag.moraleAura;

    /* Morale aura: bleed off founder stress per tick. moraleAura > 0 = good. */
    if (s.founder && typeof s.founder.stress === 'number' && bag.moraleAura) {
      s.founder.stress = Math.max(0, Math.min(100, s.founder.stress - bag.moraleAura));
    }
  }

  /* Pretty pill summary for UI: e.g. "+50% paradigm" / "-30% drift". */
  function summarizeEffect(eff) {
    if (!eff) return [];
    const out = [];
    const labels = {
      architectureChance: { good: 'up', label: 'paradigm shift' },
      pretrainComputeMult: { good: 'down', label: 'pretrain cost' },
      postTrainTrustMult: { good: 'up', label: 'post-train trust' },
      controlDriftMult: { good: 'down', label: 'control drift' },
      trustRecoveryMult: { good: 'up', label: 'trust recovery' },
      revenueMult: { good: 'up', label: 'revenue' },
      dependenceMult: { good: 'down', label: 'dependence' },
      hireDiscount: { good: 'down', label: 'hire cost' },
      incidentSeverityMult: { good: 'down', label: 'incident severity' },
    };
    for (const k of Object.keys(labels)) {
      if (typeof eff[k] !== 'number') continue;
      const v = eff[k];
      if (v === 1) continue;
      const pctRaw = Math.round((v - 1) * 100);
      if (pctRaw === 0) continue;
      const sign = pctRaw > 0 ? '+' : '';
      const meta = labels[k];
      const isGood = (meta.good === 'up') ? (v > 1) : (v < 1);
      out.push({
        text: `${sign}${pctRaw}% ${meta.label}`,
        good: isGood,
      });
    }
    if (typeof eff.moraleAura === 'number' && eff.moraleAura !== 0) {
      const v = eff.moraleAura;
      const isGood = v > 0;
      out.push({
        text: `${isGood ? '−' : '+'}${Math.abs(v).toFixed(2)} stress/tick`,
        good: isGood,
      });
    }
    return out;
  }

  return {
    definitions,
    activeSynergies,
    compose,
    tickEffects,
    summarizeEffect,
  };

})();
