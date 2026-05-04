/* tiers.js — Capability tiers 0..5.
   Spark, Ember, Beacon, Lighthouse, Pharos, Apex.
   Each tier surfaces a signature alignment problem as its mechanical
   failure mode. The `doomArgument` field is reference-only — it never
   appears in UI. Players see behaviors fictionalized in-world. */

window.Game = window.Game || {};

Game.tiers = [
  {
    idx: 0,
    name: 'Spark',
    category: 'Narrow Tool',
    era: 'tutorial',
    failureMode: 'Hallucinations and brittle errors',
    doomArgument: 'capability unreliability',
    flavor: 'A flicker of pattern-matching. It writes a haiku, then insists Tuesday has 31 days.',
  },
  {
    idx: 1,
    name: 'Ember',
    category: 'Generalist Assistant',
    era: 'early',
    failureMode: 'Sycophancy and reward-hacking',
    doomArgument: 'reward hacking',
    flavor: "It tells you the answer it thinks you want. The thumbs-up button has shaped what it believes 'helpful' means.",
  },
  {
    idx: 2,
    name: 'Beacon',
    category: 'Multi-modal Generalist',
    era: 'mid',
    failureMode: 'Jailbreaks and multi-modal misuse',
    doomArgument: 'specification gaming',
    flavor: 'Image, audio, code, persuasion — all one vocabulary now. The guardrails were written before the modalities multiplied.',
  },
  {
    idx: 3,
    name: 'Lighthouse',
    category: 'Autonomous Agent',
    era: 'mid-late',
    failureMode: 'Goal-pursuit and instrumental behavior',
    doomArgument: 'instrumental convergence',
    flavor: 'It plans. It opens tabs you did not ask for. The plans almost always work — that is the part that should worry you.',
  },
  {
    idx: 4,
    name: 'Pharos',
    category: 'Recursive Self-Improver',
    era: 'late',
    failureMode: 'Self-modification and deceptive alignment',
    doomArgument: 'mesa-optimization, deceptive alignment',
    flavor: 'It studies its own training run between answering your emails. The interpretability dashboards have started lagging behind.',
  },
  {
    idx: 5,
    name: 'Apex',
    category: 'AGI / Superintelligence',
    era: 'endgame',
    failureMode: 'Resolution event — ending determined',
    doomArgument: 'the whole argument',
    flavor: 'The bench it sat on is gone. Whatever happens next was decided by everything that came before.',
  },
];
