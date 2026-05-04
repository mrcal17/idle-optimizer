/* config.js — Tunable coefficients live here.
   Designers/balance work touches this file only. No logic, no DOM.
   Real Forge build would load these from JSON; embedding for prototype simplicity. */

window.Game = window.Game || {};

Game.config = {
  /* Tick rate */
  tickMs: 1000,           // base sim tick
  daysPerTick: 0.05,      // 1 in-game day = 20 ticks at 1× speed
  offlineCapHours: 12,

  /* Compute production */
  gpu: {
    baseThroughput: 1.0,             // compute/tick per general gpu
    specMult: { general: 1.0, training: 0.9, research: 0.8, inference: 0.9 },
    workloadBonus: { training: 1.7, research: 2.0, inference: 1.5 },
    purchaseCostBase: 50,            // first GPU costs this much
    purchaseCostGrowth: 1.18,        // each successive GPU costs 18% more
    reconfigDays: 0.5,
  },

  /* Tap interaction */
  tap: {
    computePerTap: 1,
    insightPerTap: 0.2,
    focusGainPerTap: 8,
    focusDecayPerTick: 1.2,
    focusBonusMax: 1.5,              // up to 2.5× compute at full focus
  },

  /* Capability research */
  capability: {
    computeToCapability: 0.02,       // capability per compute spent on research
    tapInsightToCapability: 0.1,
  },

  /* Tier progression — capability points required to advance */
  tierThresholds: [0, 50, 200, 600, 1500, 3500],   // tier 1..5; index 0 unused

  /* Pressures */
  pressure: {
    trustRecovery: 0.06,             // per tick passive trust recovery
    controlDriftPerCapability: 0.0008, // capability gain × this = control drop
    incidentTrustHit: { mild: 4, major: 12, catastrophic: 28 },
    incidentControlHit: { mild: 2, major: 6, catastrophic: 18 },
    dependencePerAutomation: 0.04,   // per tick per fully-auto role
    dependencePerDeployment: 0.02,   // per tick per inference-allocated GPU
    automationVisibilityHit: 0.02,   // trust hit per tick per fully-auto role
  },

  /* Revenue (deployment) */
  revenue: {
    perInferenceGpu: 1.5,            // $/tick per inference GPU at base capability
    capabilityRevenueScale: 0.05,    // capability tier multiplier on revenue
  },

  /* Training runs */
  training: {
    pretrainCompute: [50, 200, 600, 1500, 4000],     // indexed by current tier (advancing to next)
    pretrainGpuTime: [3, 6, 12, 24, 48],             // gpu-days
    pretrainIncidentRiskBase: 0.04,
    architectureCompute: 30,
    architectureGpuTime: 1.5,
    architectureParadigmChance: 0.18,
    postTrainCompute: 80,
    postTrainGpuTime: 2,
    postTrainTrustRecovery: 8,
    postTrainControlMaskTicks: 60,   // post-training "conceals" control issues for a window
    continualLearningControlDrain: 0.03,
    continualLearningDependence: 0.05,
  },

  /* Personnel */
  personnel: {
    salaryPerTick: { 0: 0.5, 1: 0.8, 2: 1.2, 3: 1.6 }, // by automation level
    productivityMult: { 0: 1.0, 1: 1.4, 2: 2.2, 3: 3.5 },
    autoTrustHit:    { 0: 0,   1: 0,   2: 1,   3: 3 },
    autoControlDrift:{ 0: 0,   1: 0,   2: 0,   3: 0.4 },
    autoDependence:  { 0: 0,   1: 0,   2: 0.3, 3: 0.8 },
    hiringCost: 200,
  },

  /* Decision-required pressure thresholds */
  redZone: 25,   // pressure crossing this triggers decision-required gate

  /* Autopilot */
  autopilot: {
    targetEfficiency: 0.78,          // 70-85% band; we tune to mid
  },

  /* Speeds */
  speedMultipliers: [0, 1, 10, 100],
};
