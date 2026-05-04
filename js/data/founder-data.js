/* founder-data.js — Static data for the Founder character.
   Portrait pools per archetype, the trait pool players accumulate through
   end-of-day cards and major decisions, and the mood-derivation rules.

   Pure data + pure helpers; no DOM, no Game.state writes. */

window.Game = window.Game || {};

Game.founderData = (function () {

  /* ---------- Portrait pools (by archetype) ----------
     One emoji glyph per slot. The Founder picks one on run-start; the
     archetype's `founderPortrait` (set in archetypes.js) takes priority,
     but we keep these pools so a future "randomize founder" affordance
     has somewhere to draw from. */
  const portraits = {
    frontier: ['🔥', '🧑‍🚀', '👨‍💼', '👩‍💼', '🦾', '🚀'],
    safety:    ['🛡', '🧘', '👩‍🔬', '🧑‍🔬', '🪷', '🧑‍⚖️'],
    opensource:['🌐', '🧑‍💻', '👨‍💻', '👩‍💻', '🐧', '🧙'],
    research:  ['🎓', '👨‍🏫', '👩‍🏫', '🦉', '📚', '🔭'],
  };

  const fallbackPortraits = ['👤', '🧑', '👨', '👩'];

  function pickPortrait(archetypeId) {
    const pool = portraits[archetypeId] || fallbackPortraits;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------- Trait pool ----------
     Each entry:
       {
         id, name, icon, desc,
         effect(state) {...},
         trigger: 'tick' | 'trust-event' | 'incident' | 'tier-up' | 'hire' | 'pivot',
       }

     `trigger` is the bus-event the founder module fires applyTraitEffects on.
     Effects mutate state directly; founder.applyTraitEffects passes state
     in. Keep effect impacts small per call — `tick` runs every sim tick.
  */
  const traits = [
    /* === Trust / temperament === */
    {
      id: 'generous',
      name: 'Generous',
      icon: '🤝',
      desc: 'You said yes when you didn\'t have to.',
      trigger: 'tick',
      effect(s) {
        // Gentle Trust drip; capped at 100 by sim.js anyway.
        s.trust = Math.min(100, s.trust + 0.01);
      },
    },
    {
      id: 'quiet',
      name: 'Quiet',
      icon: '🤫',
      desc: 'You don\'t answer the press. They notice less, on both sides.',
      trigger: 'trust-event',
      effect(s, ctx) {
        // Damp trust deltas inbound — half-strength either direction.
        if (ctx && typeof ctx.trustDelta === 'number') {
          ctx.trustDelta *= 0.5;
        }
      },
    },
    {
      id: 'magnetic',
      name: 'Magnetic',
      icon: '✨',
      desc: 'People want to be in the room when you talk.',
      trigger: 'tick',
      effect(s) {
        s.trust = Math.min(100, s.trust + 0.015);
      },
    },
    {
      id: 'stoic',
      name: 'Stoic',
      icon: '🗿',
      desc: 'Pressure events bounce off. Nothing rattles you.',
      trigger: 'tick',
      effect(s) {
        if (s.founder && s.founder.stress > 0) {
          s.founder.stress = Math.max(0, s.founder.stress - 0.03);
        }
      },
    },

    /* === Compute / focus === */
    {
      id: 'restless',
      name: 'Restless',
      icon: '⚡',
      desc: 'You can\'t sit still. The work moves faster — and so does the wear.',
      trigger: 'tick',
      effect(s) {
        s.compute += 0.05;
        if (s.founder) s.founder.stress = Math.min(100, s.founder.stress + 0.02);
      },
    },
    {
      id: 'lurker',
      name: 'Lurker',
      icon: '🌒',
      desc: 'Hours on the forums, alone. Insight finds you.',
      trigger: 'tick',
      effect(s) {
        s.insight += 0.02;
      },
    },
    {
      id: 'caffeinated',
      name: 'Caffeinated',
      icon: '☕',
      desc: 'Sleep is for closers. The bench is hot.',
      trigger: 'tick',
      effect(s) {
        s.compute += 0.03;
      },
    },
    {
      id: 'iron-will',
      name: 'Iron Will',
      icon: '🛡',
      desc: 'Control drift just doesn\'t hit as hard when you\'re holding the wheel.',
      trigger: 'tick',
      effect(s) {
        // Reverse a tiny fraction of the drift the sim already applied.
        // Effective: a ~10% softening on natural control loss.
        // sim.js's controlDelta-per-tick is small; add back a sliver.
        s.control = Math.min(100, s.control + 0.005);
      },
    },
    {
      id: 'founder-type-a',
      name: 'Founder Type-A',
      icon: '📋',
      desc: 'You wake up with a list. The list gets done.',
      trigger: 'tick',
      // The sim has no "free auto-action" abstraction yet; for v1 we model
      // it as a small daily focus boost — a passive trickle that compounds.
      effect(s) {
        s.focusMeter = Math.min(100, (s.focusMeter || 0) + 0.05);
      },
    },

    /* === Stress & resilience === */
    {
      id: 'serene',
      name: 'Serene',
      icon: '🌊',
      desc: 'You found a kind of peace with the work.',
      trigger: 'tick',
      effect(s) {
        if (s.founder) s.founder.stress = Math.max(0, s.founder.stress - 0.05);
      },
    },
    {
      id: 'frayed',
      name: 'Frayed',
      icon: '🪢',
      desc: 'You\'ve been at this too long. Everything costs more.',
      trigger: 'tick',
      effect(s) {
        if (s.founder) s.founder.stress = Math.min(100, s.founder.stress + 0.03);
      },
    },
    {
      id: 'paranoid',
      name: 'Paranoid',
      icon: '👁',
      desc: 'You read every red flag twice. Slows you down — catches things.',
      trigger: 'incident',
      effect(s, ctx) {
        // Soften incident pressure hits.
        if (ctx) {
          if (typeof ctx.trustDelta === 'number') ctx.trustDelta *= 0.7;
          if (typeof ctx.controlDelta === 'number') ctx.controlDelta *= 0.7;
        }
      },
    },

    /* === Career / hire === */
    {
      id: 'mentor',
      name: 'Mentor',
      icon: '🧑‍🏫',
      desc: 'New hires onboard faster around you.',
      trigger: 'hire',
      effect(s, ctx) {
        // No direct hook yet — record a flag the personnel module can read
        // when productivity multipliers are next computed.
        s.flags['founder-mentor-active'] = true;
      },
    },
    {
      id: 'tightfisted',
      name: 'Tightfisted',
      icon: '💰',
      desc: 'Every dollar is a fight. You make it last.',
      trigger: 'hire',
      effect(s, ctx) {
        // Refund a small fraction of the hire cost.
        if (ctx && typeof ctx.cost === 'number') {
          s.money += ctx.cost * 0.1;
        }
      },
    },
    {
      id: 'recruiter',
      name: 'Recruiter',
      icon: '📨',
      desc: 'You always know the right person for a role.',
      trigger: 'hire',
      effect(s) {
        // Tiny goodwill bump for adding a human to the room.
        s.trust = Math.min(100, s.trust + 0.5);
      },
    },

    /* === Pivots / decisions === */
    {
      id: 'principled',
      name: 'Principled',
      icon: '⚖️',
      desc: 'You take the harder right over the easier wrong.',
      trigger: 'pivot',
      effect(s) {
        s.trust = Math.min(100, s.trust + 2);
      },
    },
    {
      id: 'pragmatist',
      name: 'Pragmatist',
      icon: '🔧',
      desc: 'Ship the plan. Iterate later.',
      trigger: 'pivot',
      effect(s) {
        s.capability += 5;
      },
    },
    {
      id: 'hedger',
      name: 'Hedger',
      icon: '🪙',
      desc: 'Always two ways out. Never quite committed.',
      trigger: 'pivot',
      effect(s) {
        // Soften both up- and down-side of the next pivot's pressures.
        s.flags['founder-hedger-active'] = true;
      },
    },

    /* === Tier-ups === */
    {
      id: 'visionary',
      name: 'Visionary',
      icon: '🌠',
      desc: 'When the mission lands, it lands hard.',
      trigger: 'tier-up',
      effect(s) {
        s.trust = Math.min(100, s.trust + 3);
        if (s.founder) s.founder.energy = Math.min(s.founder.maxEnergy, s.founder.energy + 15);
      },
    },
    {
      id: 'humble',
      name: 'Humble',
      icon: '🙏',
      desc: 'You don\'t take the win parade. The room respects that.',
      trigger: 'tier-up',
      effect(s) {
        s.trust = Math.min(100, s.trust + 1.5);
        s.control = Math.min(100, s.control + 1);
      },
    },

    /* === Trust events (non-tick) === */
    {
      id: 'orator',
      name: 'Orator',
      icon: '🗣',
      desc: 'You speak well in public. Trust losses come in lighter.',
      trigger: 'trust-event',
      effect(s, ctx) {
        if (ctx && typeof ctx.trustDelta === 'number' && ctx.trustDelta < 0) {
          ctx.trustDelta *= 0.6;
        }
      },
    },
    {
      id: 'haunted',
      name: 'Haunted',
      icon: '👻',
      desc: 'Something earlier is still in the building. Stress trickles up.',
      trigger: 'tick',
      effect(s) {
        if (s.founder) s.founder.stress = Math.min(100, s.founder.stress + 0.04);
      },
    },
    {
      id: 'workaholic',
      name: 'Workaholic',
      icon: '🌙',
      desc: 'You burn the candle at both ends. Compute hums; sleep doesn\'t.',
      trigger: 'tick',
      effect(s) {
        s.compute += 0.04;
        if (s.founder) s.founder.stress = Math.min(100, s.founder.stress + 0.025);
      },
    },
    {
      id: 'lucky',
      name: 'Lucky',
      icon: '🍀',
      desc: 'Things break your way more often than they should.',
      trigger: 'incident',
      effect(s, ctx) {
        // 25% chance to nullify the incident's pressure penalty.
        if (Math.random() < 0.25 && ctx) {
          if (typeof ctx.trustDelta === 'number') ctx.trustDelta = 0;
          if (typeof ctx.controlDelta === 'number') ctx.controlDelta = 0;
        }
      },
    },
    {
      id: 'ascetic',
      name: 'Ascetic',
      icon: '🪨',
      desc: 'You don\'t need much. Energy lasts a little longer.',
      trigger: 'tick',
      // No direct hook for energy decay rate yet — model as a slow refill.
      effect(s) {
        if (s.founder && s.founder.energy < s.founder.maxEnergy) {
          s.founder.energy = Math.min(s.founder.maxEnergy, s.founder.energy + 0.02);
        }
      },
    },
  ];

  const traitsById = {};
  for (const t of traits) traitsById[t.id] = t;

  function findTrait(id) {
    return traitsById[id] || null;
  }

  /* ---------- Mood derivation ----------
     Returns one of: focused | tired | wired | shaken | serene
     Pure function over (energy, stress, recent events). No DOM. */
  function computeMood(state) {
    if (!state || !state.founder) return 'focused';
    const f = state.founder;
    const energy = (typeof f.energy === 'number') ? f.energy : 100;
    const stress = (typeof f.stress === 'number') ? f.stress : 0;

    // Exhausted overrides everything.
    if (energy <= 5) return 'tired';

    // Very high stress: shaken (regardless of energy, unless out cold)
    if (stress >= 70) return 'shaken';

    // High energy + high-ish stress: wired (manic, productive but jittery)
    if (energy >= 70 && stress >= 40) return 'wired';

    // Low energy: tired
    if (energy <= 25) return 'tired';

    // Calm, capable: serene if very low stress + decent energy
    if (stress <= 10 && energy >= 60) return 'serene';

    // Default working state
    return 'focused';
  }

  return {
    portraits,
    pickPortrait,
    traits,
    findTrait,
    computeMood,
  };

})();
