/* paradigms.js — Architecture Experiment outputs.
   Game.paradigmData.list — meta-modifiers granted (rarely) by Architecture Experiment training runs.
   Game.paradigmData.pickRandom(excludeIds) returns one not already taken; null if all taken.

   Each paradigm has:
     id, name, flavor (in-character; uses {model} where appropriate)
     effect(state) — sets a state.flags['paradigm-{id}'] marker; sim.js / training.js / events.js
       can read these flags to apply gameplay effects (cheaper pretraining, stronger post-train, etc.)
     short — one-line designer-facing summary for the UI

   Real ML ideas, fictionalized in-world. No real lab names, no real authors. */

window.Game = window.Game || {};

Game.paradigmData = {
  list: [
    /* ============================================================ */
    {
      id: 'sparse-moe',
      name: 'Sparse Mixture of Experts',
      flavor: '"The team\'s gone quiet for two days. Now Mira is babbling about routing tokens to specialists. Pretraining costs are about to drop. She has not slept. She has, instead, drawn a routing diagram on the kitchen window."',
      short: 'Pretraining 30% cheaper; subsequent runs apply discount automatically.',
      effect(state) {
        state.flags['paradigm-sparse-moe'] = true;
        Game.addLog('Paradigm shift: Sparse Mixture of Experts. Pretraining gets cheaper from here.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'constitutional-self-critique',
      name: 'Constitutional Self-Critique',
      flavor: '"Sasha shipped a small thing on Friday and it turns out the small thing is a big thing. {model} now reviews its own outputs against a written charter before responding. The charter is two pages. The charter is, you suspect, going to be load-bearing for a long time."',
      short: 'Post-training is 40% more effective at recovering Trust.',
      effect(state) {
        state.flags['paradigm-constitutional-self-critique'] = true;
        Game.addLog('Paradigm shift: Constitutional Self-Critique. Post-training got teeth.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'rlhf-from-preferences',
      name: 'Preference-Tuned Refinement',
      flavor: '"Devi figured out you can keep tuning a model on user-preference signals long after the initial training. {model} now gets, gently, smarter at being asked things by humans. The metric is hard to summarize. The vibes are very good."',
      short: 'Post-training adds +1 to capability per run, on top of normal effects.',
      effect(state) {
        state.flags['paradigm-rlhf-from-preferences'] = true;
        Game.addLog('Paradigm shift: Preference-Tuned Refinement. Post-training compounds.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'chain-of-thought-distillation',
      name: 'Chain-of-Thought Distillation',
      flavor: '"It was an accident. Mira was trying to make {model}\'s reasoning legible for an interpretability paper, and the legibility itself, fed back into training, made the model better. The paper has been retitled three times. The current title is \'We Did Not Mean To Do This.\'"',
      short: 'Capability research speed +25%.',
      effect(state) {
        state.flags['paradigm-chain-of-thought-distillation'] = true;
        Game.addLog('Paradigm shift: Chain-of-Thought Distillation. Capability research accelerates.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'synthetic-data-flywheel',
      name: 'Synthetic Data Flywheel',
      flavor: '"The pretraining data ran out. Then we started having {model} write the next pretraining data. The result should be a degenerate slop-spiral. The result is, instead, a quiet, slow improvement. Nobody can fully explain why. Lambda Quarterly has a pre-print."',
      short: 'Pretraining requires 20% less Compute; mild Control drift bonus.',
      effect(state) {
        state.flags['paradigm-synthetic-data-flywheel'] = true;
        Game.addLog('Paradigm shift: Synthetic Data Flywheel. Data is now, technically, infinite.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'distillation-into-smaller',
      name: 'Aggressive Distillation',
      flavor: '"Sasha walked in on Tuesday and said, \'I think we can fit it in one tenth the size.\' Wednesday she had a working prototype. Thursday she shipped. Friday {model}-mini is running on the kind of hardware that fits in a backpack."',
      short: 'Inference revenue +35% (smaller model, cheaper to serve).',
      effect(state) {
        state.flags['paradigm-distillation-into-smaller'] = true;
        Game.addLog('Paradigm shift: Aggressive Distillation. {model}-mini is in a backpack somewhere.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'mechanistic-interp-tooling',
      name: 'Mechanistic Interpretability Tooling',
      flavor: '"Mira shipped a notebook this morning. She titled it \'Looking Inside, Briefly.\' The notebook lets you, kind of, sort of, ask {model} why it did what it did, and get an answer that is, often, recognizably true. CLTR has asked for a demo. Mira said yes. Mira is, briefly, glowing."',
      short: 'Control drift halved; incident severity reduced.',
      effect(state) {
        state.flags['paradigm-mechanistic-interp-tooling'] = true;
        Game.addLog('Paradigm shift: Mechanistic Interpretability Tooling. Mira is, briefly, glowing.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'curriculum-learning',
      name: 'Curriculum Learning',
      flavor: '"Devi: \'What if we showed it the easy stuff first.\' This was, technically, in someone\'s thesis from 2009. We re-implemented it. It works embarrassingly well. The training time graphs look like a different field."',
      short: 'Pretraining GPU-time required reduced by 25%.',
      effect(state) {
        state.flags['paradigm-curriculum-learning'] = true;
        Game.addLog('Paradigm shift: Curriculum Learning. The 2009 thesis just collected royalties.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'tool-use-pretraining',
      name: 'Tool-Use Pretraining',
      flavor: '"What if {model} learned, during pretraining, that some tasks are calculator-shaped, and some are search-shaped, and some are agent-shaped? Turns out: better. Hari Iyer has a piece in the works. The piece is not unkind."',
      short: 'Inference revenue +20%; deployment risk slightly higher.',
      effect(state) {
        state.flags['paradigm-tool-use-pretraining'] = true;
        Game.addLog('Paradigm shift: Tool-Use Pretraining. The model is now, slightly, an agent.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'process-reward-modeling',
      name: 'Process Reward Modeling',
      flavor: '"Ren spent two weeks rewarding {model} not just for getting answers right, but for the steps along the way. The result is a model that thinks more like a person who shows their work, and less like a person who hides it. CLTR called this \'a small, real win.\' From CLTR, this is enormous."',
      short: 'Training risk profile reduced by 40%; capability gains slightly smaller.',
      effect(state) {
        state.flags['paradigm-process-reward-modeling'] = true;
        Game.addLog('Paradigm shift: Process Reward Modeling. CLTR called it a "small, real win." That is huge.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'adversarial-red-team-loop',
      name: 'Adversarial Red-Team Loop',
      flavor: '"Sasha set up a permanent automated red-team that tries to break {model} during training, then feeds the breakages back into training. The system has produced, in three weeks, more interesting failure modes than the previous year of human red-teaming. Several engineers, on stream and off, have called it \'the best and worst thing we ever built.\'"',
      short: 'Incidents 50% less frequent; one-time -$200 setup cost on next training run.',
      effect(state) {
        state.flags['paradigm-adversarial-red-team-loop'] = true;
        Game.addLog('Paradigm shift: Adversarial Red-Team Loop. The model is now, full-time, being attacked by itself.', 'paradigm');
      },
    },

    /* ============================================================ */
    {
      id: 'long-context-stable',
      name: 'Stable Long-Context',
      flavor: '"Devi found a clever positional-encoding trick. {model} can now hold a million tokens of context without going strange. The implication is, it turns out, larger than anyone immediately realized. We are still working out the implication. The implication is significant."',
      short: 'Capability research speed +20%; deployment scale options expand.',
      effect(state) {
        state.flags['paradigm-long-context-stable'] = true;
        Game.addLog('Paradigm shift: Stable Long-Context. Context is, suddenly, no longer the bottleneck.', 'paradigm');
      },
    },
  ],

  /* ============================================================ */
  pickRandom(excludeIds) {
    excludeIds = excludeIds || [];
    const available = this.list.filter(p => excludeIds.indexOf(p.id) < 0);
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  },
};
