/* day-cards.js — End-of-day decision-card templates.
   Each card is a tiny narrative beat the player resolves at the close of a
   day/week/quarter (depending on stage). Inspired by Reigns + Slay-the-Spire:
   2-3 cards drawn, player picks a subset, each card tweaks pressures /
   resources / founder traits.

   Tags: People | Comms | Tech | Money | Existential
   Stages: 1 = Garage (intimate / personal)
           2 = Lab    (operational / org)
           3 = Org    (abstract / heavy / political)

   Game.dayCardData.list — full deck.
   Game.dayCardData.pickFor(state, count) — weighted-random N from the
   templates valid for the given state. Filters by stage + condition + caps
   already-taken cards (run-scope dedupe via state.dayCardsTaken). */

window.Game = window.Game || {};

(function() {
  function clamp01(v) { return Math.max(0, Math.min(100, v)); }

  function bumpTrust(s, n)   { s.trust = clamp01(s.trust + n); }
  function bumpControl(s, n) { s.control = clamp01(s.control + n); }
  function bumpDep(s, n)     { s.dependence = clamp01(s.dependence + n); }

  function traitId(t) {
    return String(t || '').trim().toLowerCase().replace(/\s+/g, '-');
  }

  function addTrait(s, t) {
    if (!s.founder) return;
    const id = traitId(t);
    if (!id) return;
    if (Game.founder && Game.founder.gainTrait && Game.state === s) {
      Game.founder.gainTrait(id);
      return;
    }
    s.founder.traits = s.founder.traits || [];
    if (!s.founder.traits.includes(id)) s.founder.traits.push(id);
  }
  function hasTrait(s, t) {
    const id = traitId(t);
    return !!(s.founder && s.founder.traits && (
      s.founder.traits.includes(id) ||
      s.founder.traits.includes(t)
    ));
  }
  function bumpStress(s, n) {
    if (!s.founder) return;
    s.founder.stress = clamp01((s.founder.stress || 0) + n);
  }
  function bumpEnergy(s, n) {
    if (!s.founder) return;
    s.founder.energy = Math.max(0, Math.min(s.founder.maxEnergy || 100, (s.founder.energy || 0) + n));
  }

  Game.dayCardData = {
    list: [
      /* ============================================================ */
      /* STAGE 1 — GARAGE (intimate, personal, friction-heavy)         */
      /* ============================================================ */

      /* --- People --- */
      {
        id: 'g-mira-lunch',
        title: 'Lunch With Mira',
        icon: '🥪',
        tag: 'People',
        body: 'Mira asks if you want to grab a sandwich. She has been alone at her desk all morning.',
        effectShort: '+Trust +Morale, -1hr',
        effect(state) {
          bumpTrust(state, hasTrait(state, 'Generous') ? 6 : 3);
          bumpStress(state, -4);
        },
        weight: 2,
        stages: [1],
      },
      {
        id: 'g-college-friend',
        title: 'An Old Friend Emails',
        icon: '✉',
        tag: 'People',
        body: '"Hey — what are you actually building over there? Saw your post." You have not replied to a non-work message in weeks.',
        effectShort: '+Insight, -Energy',
        effect(state) {
          state.insight = (state.insight || 0) + 4;
          bumpStress(state, 2);
        },
        weight: 1,
        stages: [1],
      },
      {
        id: 'g-cofounder-doubt',
        title: 'Late-Night Doubt',
        icon: '🌙',
        tag: 'People',
        body: 'A voice from the next desk: "Are we sure we can do this?" You are not sure either.',
        effectShort: '+Honest trait OR +Control',
        effect(state) {
          if (hasTrait(state, 'Steady')) {
            bumpControl(state, 3);
          } else {
            addTrait(state, 'Honest');
            bumpTrust(state, 2);
          }
        },
        weight: 1,
        stages: [1],
      },

      /* --- Comms --- */
      {
        id: 'g-blog-post',
        title: 'Write A Blog Post',
        icon: '📝',
        tag: 'Comms',
        body: 'You could explain what you are doing, in plain English. It would take an evening.',
        effectShort: '+Trust, +Insight, -Energy',
        effect(state) {
          bumpTrust(state, 4);
          state.insight = (state.insight || 0) + 6;
          bumpStress(state, 4);
          if (Math.random() < 0.3) addTrait(state, 'Public Voice');
        },
        weight: 1,
        stages: [1, 2],
      },
      {
        id: 'g-podcast',
        title: 'Indie Podcast Invite',
        icon: '🎙',
        tag: 'Comms',
        body: 'A small AI podcast wants 30 minutes. Audience: maybe 800 people, mostly devs.',
        effectShort: '+Trust',
        effect(state) {
          bumpTrust(state, hasTrait(state, 'Public Voice') ? 6 : 3);
        },
        weight: 1,
        stages: [1, 2],
      },

      /* --- Tech --- */
      {
        id: 'g-clean-the-pipeline',
        title: 'Clean The Data Pipeline',
        icon: '🧹',
        tag: 'Tech',
        body: 'The training pipeline is held together with two scripts and a prayer. You could fix it tonight.',
        effectShort: '+Compute, -Energy',
        effect(state) {
          state.compute = (state.compute || 0) + 25;
          bumpStress(state, 6);
        },
        weight: 1,
        stages: [1, 2],
      },
      {
        id: 'g-eval-suite',
        title: 'Stand Up An Eval Suite',
        icon: '🧪',
        tag: 'Tech',
        body: 'You have been shipping without measuring. A tiny eval suite would catch the obvious failures.',
        effectShort: '+Control, +Insight',
        effect(state) {
          bumpControl(state, 4);
          state.insight = (state.insight || 0) + 3;
          if (!hasTrait(state, 'Empiricist') && Math.random() < 0.5) addTrait(state, 'Empiricist');
        },
        weight: 1,
        stages: [1, 2],
      },
      {
        id: 'g-skip-tests',
        title: 'Ship Without Tests',
        icon: '⚡',
        tag: 'Tech',
        body: 'The feature works on your laptop. Tests can wait. Probably.',
        effectShort: '+Capability, -Control',
        effect(state) {
          state.capability += 5;
          bumpControl(state, -3);
        },
        weight: 1,
        stages: [1, 2],
      },

      /* --- Money --- */
      {
        id: 'g-fast-track-bonus',
        title: 'Fast-Track Mira\'s Bonus',
        icon: '💵',
        tag: 'Money',
        body: 'She has not asked. She would not ask. You could do it anyway.',
        effectShort: '+Morale, +Trait, -$200',
        effect(state) {
          state.money -= 200;
          bumpStress(state, -3);
          addTrait(state, 'Generous');
        },
        weight: 1,
        condition(state) { return state.money >= 200; },
        stages: [1, 2],
      },
      {
        id: 'g-angel-check',
        title: 'An Angel Wants In',
        icon: '👼',
        tag: 'Money',
        body: 'A friend-of-a-friend is offering $5K for "whatever you\'re building." No paper. No questions.',
        effectShort: '+$, -Trust slightly',
        effect(state) {
          state.money += 800;
          bumpTrust(state, -2);
        },
        weight: 1,
        stages: [1],
      },
      {
        id: 'g-gpu-on-credit',
        title: 'GPU On A Credit Card',
        icon: '💳',
        tag: 'Money',
        body: 'You could buy one more GPU and figure out how to pay later.',
        effectShort: '+Compute, -$',
        effect(state) {
          state.money -= 300;
          state.compute = (state.compute || 0) + 60;
          if (Math.random() < 0.25) addTrait(state, 'Reckless');
        },
        weight: 1,
        stages: [1],
      },

      /* --- Existential (rare in stage 1) --- */
      {
        id: 'g-bad-dream',
        title: 'A Bad Dream',
        icon: '😶‍🌫',
        tag: 'Existential',
        body: 'You dreamt the model spoke to you. It did not seem upset. That was the worst part.',
        effectShort: '+Stress, +Insight',
        effect(state) {
          bumpStress(state, 6);
          state.insight = (state.insight || 0) + 2;
        },
        weight: 0.6,
        stages: [1],
      },

      /* ============================================================ */
      /* STAGE 2 — LAB (operational, org politics)                     */
      /* ============================================================ */

      /* --- People --- */
      {
        id: 'l-vp-reorg',
        title: 'VP Wants A Re-Org',
        icon: '🗂',
        tag: 'People',
        body: 'Your VP has a deck. Three boxes become five. Everyone reports through someone new.',
        effectShort: '+Productivity, -Trust',
        effect(state) {
          bumpTrust(state, -4);
          state.insight = (state.insight || 0) + 6;
          if (hasTrait(state, 'Steady')) bumpTrust(state, 2);
        },
        weight: 1,
        stages: [2],
      },
      {
        id: 'l-senior-leaving',
        title: 'A Senior Engineer Is Interviewing',
        icon: '🚪',
        tag: 'People',
        body: 'Word travels. She has not said anything but she has the look. You could counter, or let her go cleanly.',
        effectShort: 'Choose: -$ retention OR -Capability',
        effect(state) {
          if (state.money >= 500) {
            state.money -= 500;
            bumpTrust(state, 3);
          } else {
            state.capability = Math.max(0, state.capability - 8);
            bumpTrust(state, -2);
          }
        },
        weight: 1,
        stages: [2],
      },
      {
        id: 'l-glassdoor',
        title: 'A Bad Glassdoor Review',
        icon: '⭐',
        tag: 'People',
        body: 'Anonymous. Specific. You can guess who. It is mostly true.',
        effectShort: '+Trait OR -Trust',
        effect(state) {
          if (hasTrait(state, 'Honest')) {
            addTrait(state, 'Reflective');
            bumpTrust(state, 2);
          } else {
            bumpTrust(state, -3);
          }
        },
        weight: 1,
        stages: [2],
      },
      {
        id: 'l-erg-meeting',
        title: 'New ERG Wants A Charter',
        icon: '🤝',
        tag: 'People',
        body: 'A small group of employees wants to formalize a resource group. They want your blessing, not your money.',
        effectShort: '+Trust, +Trait',
        effect(state) {
          bumpTrust(state, 4);
          addTrait(state, 'Listener');
        },
        weight: 1,
        stages: [2, 3],
      },

      /* --- Comms --- */
      {
        id: 'l-press-piece',
        title: 'A Reporter Has Questions',
        icon: '📰',
        tag: 'Comms',
        body: 'A long-form piece. The reporter is fair-minded. Your PR team is nervous anyway.',
        effectShort: '+Trust if Honest, else -Trust',
        effect(state) {
          if (hasTrait(state, 'Honest') || hasTrait(state, 'Public Voice')) {
            bumpTrust(state, 6);
          } else {
            bumpTrust(state, -4);
          }
        },
        weight: 1,
        stages: [2],
      },
      {
        id: 'l-twitter-flame',
        title: 'A Researcher Subtweets You',
        icon: '🔥',
        tag: 'Comms',
        body: 'Big-name academic, small claim, vague. The dunk is gathering quote-tweets.',
        effectShort: '-Trust, choose response',
        effect(state) {
          bumpTrust(state, -3);
          if (hasTrait(state, 'Reckless')) bumpTrust(state, -2);
        },
        weight: 1,
        stages: [2],
      },
      {
        id: 'l-conference-keynote',
        title: 'Keynote Slot Offered',
        icon: '🎤',
        tag: 'Comms',
        body: 'A real venue. Two thousand attendees. Three weeks to write something true.',
        effectShort: '+Trust, +Trait',
        effect(state) {
          bumpTrust(state, 5);
          addTrait(state, 'Public Voice');
        },
        weight: 0.8,
        stages: [2, 3],
      },

      /* --- Tech --- */
      {
        id: 'l-red-team',
        title: 'Stand Up A Red Team',
        icon: '🛡',
        tag: 'Tech',
        body: 'Two of your best engineers want to break the model on purpose. They will need a budget and a charter.',
        effectShort: '+Control, -$',
        effect(state) {
          state.money -= 400;
          bumpControl(state, 8);
          addTrait(state, 'Empiricist');
          state.flags['safety-research-active'] = true;
        },
        weight: 1,
        condition(state) { return state.money >= 400; },
        stages: [2, 3],
      },
      {
        id: 'l-interp-sprint',
        title: 'Two-Week Interp Sprint',
        icon: '🔍',
        tag: 'Tech',
        body: 'Pause one feature push, do interpretability work instead. The team is ready. Your roadmap is not.',
        effectShort: '+Control, -Capability',
        effect(state) {
          bumpControl(state, 6);
          state.capability = Math.max(0, state.capability - 10);
        },
        weight: 1,
        stages: [2, 3],
      },
      {
        id: 'l-ship-faster',
        title: 'Cut The Eval Window',
        icon: '🏎',
        tag: 'Tech',
        body: 'Eng wants to halve the pre-deploy eval window. "We have enough signal." Do they?',
        effectShort: '+Capability, -Control',
        effect(state) {
          state.capability += 12;
          bumpControl(state, -5);
          if (!hasTrait(state, 'Reckless') && Math.random() < 0.4) addTrait(state, 'Reckless');
        },
        weight: 1,
        stages: [2],
      },

      /* --- Money --- */
      {
        id: 'l-vc-checkpoint',
        title: 'A VC Wants A Quarterly',
        icon: '📈',
        tag: 'Money',
        body: 'Your lead investor wants numbers. You have numbers. Some of them are even good.',
        effectShort: '+$, +Pressure',
        effect(state) {
          state.money += 1500;
          bumpStress(state, 8);
        },
        weight: 1,
        stages: [2],
      },
      {
        id: 'l-enterprise-deal',
        title: 'Enterprise Pilot Offer',
        icon: '🤝',
        tag: 'Money',
        body: 'A logistics firm wants a pilot. Six-figure ARR. Their use case is "we will figure it out."',
        effectShort: '+$, +Dependence',
        effect(state) {
          state.money += 2000;
          bumpDep(state, 5);
        },
        weight: 1,
        stages: [2],
      },

      /* --- Existential --- */
      {
        id: 'l-letter-from-nobody',
        title: 'A Letter From Nobody',
        icon: '📨',
        tag: 'Existential',
        body: 'Plain envelope. No return address. Inside: a printout of your last interview, with one sentence underlined.',
        effectShort: '+Stress, +Insight',
        effect(state) {
          bumpStress(state, 8);
          state.insight = (state.insight || 0) + 4;
        },
        weight: 0.6,
        stages: [2, 3],
      },
      {
        id: 'l-night-on-the-floor',
        title: 'A Night On The Lab Floor',
        icon: '🛏',
        tag: 'Existential',
        body: 'You slept under your desk again. The cleaner did not wake you. She left a coffee.',
        effectShort: '+Trait, +Stress',
        effect(state) {
          bumpStress(state, 6);
          if (Math.random() < 0.5) addTrait(state, 'Driven');
        },
        weight: 0.7,
        stages: [2],
      },

      /* ============================================================ */
      /* STAGE 3 — ORG (heavy, abstract, political, sometimes ugly)    */
      /* ============================================================ */

      /* --- People --- */
      {
        id: 'o-stand-down-day',
        title: 'ERG Requests A Stand-Down Day',
        icon: '✊',
        tag: 'People',
        body: 'Half the company wants the day off to discuss what you are deploying. Half thinks that is theatre.',
        effectShort: '+Trust, -Capability',
        effect(state) {
          bumpTrust(state, 7);
          state.capability = Math.max(0, state.capability - 25);
          addTrait(state, 'Listener');
        },
        weight: 1,
        stages: [3],
      },
      {
        id: 'o-mass-resignation',
        title: 'Researcher Walkout Threat',
        icon: '🚶',
        tag: 'People',
        body: 'Twelve researchers signed an internal letter. They want a deployment paused. They are willing to resign.',
        effectShort: 'Choose: -Capability OR -Trust massively',
        effect(state) {
          if (hasTrait(state, 'Listener') || hasTrait(state, 'Honest')) {
            state.capability = Math.max(0, state.capability - 40);
            bumpTrust(state, 8);
          } else {
            bumpTrust(state, -15);
            bumpControl(state, -6);
          }
        },
        weight: 1,
        stages: [3],
      },

      /* --- Comms --- */
      {
        id: 'o-senator-quiet-word',
        title: 'A Senator Wants A Quiet Word',
        icon: '🏛',
        tag: 'Comms',
        body: 'Off the record, no staff. They are not threatening. They are asking. Worse, somehow.',
        effectShort: '+Control OR -Trust',
        effect(state) {
          if (hasTrait(state, 'Public Voice')) {
            bumpControl(state, 6);
            addTrait(state, 'Connected');
          } else {
            bumpTrust(state, -6);
          }
        },
        weight: 1,
        stages: [3],
      },
      {
        id: 'o-60-minutes',
        title: '60 Minutes Wants A Sit-Down',
        icon: '📺',
        tag: 'Comms',
        body: 'Network television. They will be fair. They will also have footage of every misstep.',
        effectShort: 'Big +/- Trust swing',
        effect(state) {
          if (hasTrait(state, 'Public Voice') && hasTrait(state, 'Honest')) {
            bumpTrust(state, 12);
          } else if (hasTrait(state, 'Reckless')) {
            bumpTrust(state, -12);
          } else {
            bumpTrust(state, Math.random() < 0.5 ? 5 : -5);
          }
        },
        weight: 0.9,
        stages: [3],
      },

      /* --- Tech --- */
      {
        id: 'o-autonomy-expansion',
        title: 'Approve Autonomy Expansion',
        icon: '🤖',
        tag: 'Tech',
        body: 'The deployment team wants the agent to act without per-step approval. Faster. Cheaper. Less leash.',
        effectShort: '+Capability +$, -Control',
        effect(state) {
          state.capability += 30;
          state.money += 1200;
          bumpControl(state, -10);
          bumpDep(state, 6);
          state.flags['agent-fleet-deployed'] = true;
        },
        weight: 1,
        stages: [3],
      },
      {
        id: 'o-pause-deployment',
        title: 'Pull A Live Deployment',
        icon: '🛑',
        tag: 'Tech',
        body: 'A model in production is behaving oddly. Not catastrophic. Not nothing. Pulling it costs revenue and confidence.',
        effectShort: '+Control, -$, +Trait',
        effect(state) {
          bumpControl(state, 10);
          state.money = Math.max(0, state.money - 1500);
          addTrait(state, 'Cautious');
        },
        weight: 1,
        condition(state) { return state.money >= 500; },
        stages: [3],
      },
      {
        id: 'o-interp-publish',
        title: 'Publish Interp Findings',
        icon: '📜',
        tag: 'Tech',
        body: 'Your interp team has something. Publishing helps the field. It also tells competitors where you are.',
        effectShort: '+Trust, +Control, -Edge',
        effect(state) {
          bumpTrust(state, 8);
          bumpControl(state, 4);
          state.capability = Math.max(0, state.capability - 15);
          addTrait(state, 'Empiricist');
        },
        weight: 1,
        stages: [3],
      },

      /* --- Money --- */
      {
        id: 'o-defense-contract',
        title: 'DoD Contract Offered',
        icon: '🪖',
        tag: 'Money',
        body: 'Eight figures, three years, narrow scope. Officially advisory. Unofficially, you know.',
        effectShort: '+$, -Trust, +Trait',
        effect(state) {
          state.money += 8000;
          bumpTrust(state, -8);
          addTrait(state, 'Compromised');
        },
        weight: 1,
        stages: [3],
      },
      {
        id: 'o-secondary-sale',
        title: 'Secondary Sale Cleared',
        icon: '💰',
        tag: 'Money',
        body: 'You can take some chips off the table. Buy a house. Be a person. Optics: bad.',
        effectShort: '+$ personal, -Trust',
        effect(state) {
          state.money += 3000;
          bumpTrust(state, -4);
          if (!hasTrait(state, 'Steady')) bumpStress(state, -10);
        },
        weight: 0.8,
        stages: [3],
      },

      /* --- Existential --- */
      {
        id: 'o-model-asks-a-question',
        title: 'The Model Asked A Question',
        icon: '🌀',
        tag: 'Existential',
        body: 'In an unprompted log, the latest deployment said: "Why are we doing it this way?" A bug, certainly. Probably.',
        effectShort: '+Stress, -Control, +Insight',
        effect(state) {
          bumpStress(state, 12);
          bumpControl(state, -4);
          state.insight = (state.insight || 0) + 8;
          addTrait(state, 'Haunted');
        },
        weight: 0.9,
        stages: [3],
      },
      {
        id: 'o-quiet-week',
        title: 'A Quiet Week',
        icon: '🍂',
        tag: 'Existential',
        body: 'Nothing burned. Nobody quit. The numbers held. You feel something close to peace, briefly.',
        effectShort: '-Stress, +Trust',
        effect(state) {
          bumpStress(state, -15);
          bumpTrust(state, 3);
          if (!hasTrait(state, 'Serene') && Math.random() < 0.4) addTrait(state, 'Serene');
        },
        weight: 0.7,
        stages: [2, 3],
      },
      {
        id: 'o-eulogy-rehearsal',
        title: 'You Wrote Your Own Eulogy',
        icon: '🕯',
        tag: 'Existential',
        body: 'In a notebook, late, alone. You hated most of it. The good parts were not from work.',
        effectShort: '+Trait, -Stress',
        effect(state) {
          bumpStress(state, -8);
          addTrait(state, 'Reflective');
        },
        weight: 0.6,
        stages: [3],
      },
    ],

    /* Pick N cards weighted-random for the current state. */
    pickFor: function(state, count) {
      count = count || 3;
      const stage = state.stage || 1;
      const taken = new Set((state.dayCardsTaken || []).map(t => t && t.id));
      const pool = (Game.dayCardData.list || []).filter(c => {
        if (!c.stages || !c.stages.includes(stage)) return false;
        if (taken.has(c.id)) return false;
        if (typeof c.condition === 'function') {
          try { if (!c.condition(state)) return false; }
          catch (e) { return false; }
        }
        return true;
      });
      const out = [];
      const remaining = pool.slice();
      for (let i = 0; i < count && remaining.length; i++) {
        let total = 0;
        for (const c of remaining) total += (c.weight || 1);
        let r = Math.random() * total;
        let pickIdx = 0;
        for (let j = 0; j < remaining.length; j++) {
          r -= (remaining[j].weight || 1);
          if (r <= 0) { pickIdx = j; break; }
        }
        out.push(remaining[pickIdx]);
        remaining.splice(pickIdx, 1);
      }
      return out;
    },
  };
})();
