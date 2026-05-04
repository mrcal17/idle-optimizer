/* state.js — Central game state.
   The single source of truth. All other modules read from / dispatch into Game.state.
   No DOM references here. Save/load is structural-clone-friendly. */

window.Game = window.Game || {};

Game.state = null;

Game.makeInitialState = function makeInitialState() {
  return {
    // Run identity
    labName: 'Foundry Labs',
    crest: '⚙',
    palette: 'twilight',
    archetypeId: null, // set by archetype select
    runStartedAt: 0,
    runEnded: false,

    // Time
    day: 1,
    tickCount: 0,
    speed: 1, // 0 paused, 1×, 10×, 100×
    paused: false,

    // Resources
    compute: 0,
    insight: 0,
    money: 100,
    capability: 0,
    capabilityTier: 0, // 0..5

    // Pressures (0..100; Trust/Control start at 100, Dependence at 0)
    trust: 100,
    control: 100,
    dependence: 0,

    // GPUs — array of objects { id, spec, busyJobId|null, idleSince }
    gpus: [],
    nextGpuId: 1,

    // Personnel — array of { id, role, level, name, autoVariant }
    // level: 0 human, 1 human+AI, 2 AI supervised, 3 fully autonomous
    personnel: [],
    nextPersonnelId: 1,

    // Models — array of { tier, name, version, postTrainings }
    models: [],
    nextModelId: 1,

    // Deployments — array of active deployments (managed by Game.deployments).
    // Authoritative copy lives at Game.deployments.list; this slot reserves
    // the field name so future save/load can persist it.
    deployments: [],

    // Training runs — array of { id, mode, modelTier, gpuIds, computeRequired, computeProgress, gpuTimeRequired, gpuTimeProgress, riskProfile }
    trainingRuns: [],
    nextTrainingId: 1,

    // Upgrades / pivots — id sets
    upgrades: {},     // { upgradeId: true }
    pivots: {},       // { pivotId: choiceId }
    paradigms: [],    // [{ id, name, effect }]

    // Tap / focus
    focusMeter: 0,    // 0..100; decays over time, boosts tap
    lastTapAt: 0,

    // Autopilot
    autopilot: {
      preset: 'wait',  // 'safe' | 'frontier' | 'wait' | 'custom'
      unlocks: { 'auto-om': false, 'auto-hr': false, 'auto-comms': false, 'auto-strategist': false, 'auto-diplomat': false, 'auto-researcher': false, 'reflective': false, 'full-delegation': false },
      custom: {
        riskPosture: 0.5,    // 0 cautious - 1 reckless
        trustFloor: 30,
        controlFloor: 30,
        spendingAlloc: { capability: 0.4, deployment: 0.3, safety: 0.3 },
        personnelPolicy: 'manual', // 'manual' | 'human' | 'mixed' | 'automate'
        pivotPolicy: 'ask',        // 'ask' | 'auto-accept' | 'auto-decline'
      },
    },

    // Decision-required gate flag — when set, sim halts until player resolves
    pendingDecision: null, // { type, payload }

    // Scenes unlocked (tutorial scaffold)
    scenesUnlocked: { desk: true, office: false, operations: true, world: false, logs: false },

    /* === Narrative-update fields (act / day-phase / founder) === */

    // Stage / Act — derived from capability tier but stored so transitions
    // can run a cinematic on change without recomputing every tick.
    //   1 = Garage (Spark / Ember)
    //   2 = Lab (Beacon / Lighthouse)
    //   3 = Org (Pharos / Apex)
    stage: 1,

    // Day phase: 'working' (sim ticks normally) or 'end-of-day' (sim halts,
    // decision-card panel is showing). Day-loop module owns transitions.
    dayPhase: 'working',

    // Day clock — fractional days accumulate; when it crosses an integer the
    // day-loop module can fire the end-of-day panel. Different stages run
    // at different tempos (1/wk/qtr).
    lastDayBoundary: 1,

    // The founder character — energy, mood, persistent traits accumulated
    // through choices. Replaces "you are a faceless lab" with "you are a
    // person." Drained by major actions; refilled by ending the day.
    founder: {
      portrait: null,        // emoji glyph, set on archetype apply
      energy: 100,           // 0-100; major actions cost energy
      maxEnergy: 100,        // grows with delegation upgrades
      mood: 'focused',       // focused / tired / wired / shaken / serene
      traits: [],            // accumulating perks from decision cards
      stress: 0,             // 0-100; pressures push it up; rest brings it down
    },

    // End-of-day decision deck — populated by day-loop module.
    pendingDayCards: [],
    dayCardsTaken: [],   // history of choices for run-end recap

    // Logs (recent first)
    logs: [],

    // Triggered one-shot flags (for narrative beats)
    flags: {},

    // Stats for run-end summary
    stats: {
      totalCompute: 0,
      totalRevenue: 0,
      runsCompleted: 0,
      pivotCount: 0,
      incidentCount: 0,
      autoOmDeployed: false,
      firstAutomationDay: null,
      lastHumanDay: null,
    },

    // Ending (set by endings.js when run resolves)
    ending: null,

    // Archetype-specific extras (set on init)
    archetypeData: {},

    // Income system (per-archetype money loop, see income.js)
    communityCompute: 0,
    lastPublicationTick: 0,
    lastVcCheckpointTick: 0,
    lastGrantTick: 0,
  };
};

/* Mutators — keep state changes routed through these so we can later add
   undo, replay, telemetry hooks without grep-and-replace. */

Game.addLog = function(body, type) {
  if (!Game.state) return;
  Game.state.logs.unshift({
    day: Game.state.day,
    body,
    type: type || '',
  });
  if (Game.state.logs.length > 200) Game.state.logs.pop();
  if (Game.ui && Game.ui.refreshLogs) Game.ui.refreshLogs();
};

Game.addGpu = function(spec) {
  spec = spec || 'general';
  const gpu = {
    id: Game.state.nextGpuId++,
    spec,
    busyJobId: null,
    idleSince: Game.state.day,
  };
  Game.state.gpus.push(gpu);
  return gpu;
};

Game.removeGpu = function(id) {
  const i = Game.state.gpus.findIndex(g => g.id === id);
  if (i < 0) return null;
  return Game.state.gpus.splice(i, 1)[0];
};

Game.addPersonnel = function(role, level, name) {
  const p = {
    id: Game.state.nextPersonnelId++,
    role,
    level: level || 0,
    name: name || Game.makeRandomName(),
  };
  Game.state.personnel.push(p);
  return p;
};

Game.makeRandomName = function() {
  const first = ['Mira','Sasha','Devi','Ren','Ava','Kai','Jordan','Nia','Theo','Zara','Luca','Iris','Mei','Sam','Yuki','Wes','Pria','Eli'];
  const last = ['Park','Okafor','Zhang','Iyer','Singh','Reyes','Kovak','Bardem','Nguyen','Castro','Aoki','Bello','Ruiz','Hoshi'];
  return first[Math.floor(Math.random()*first.length)] + ' ' + last[Math.floor(Math.random()*last.length)];
};

Game.spend = function(resource, amount) {
  if ((Game.state[resource] || 0) < amount) return false;
  Game.state[resource] -= amount;
  return true;
};

Game.gain = function(resource, amount) {
  Game.state[resource] = (Game.state[resource] || 0) + amount;
};

/* Flavor-text placeholder substitution.
   Incidents reference {model}; endings reference {lab}. Centralized so we don't
   sprinkle replace() calls across every render site. */
Game.substitute = function(text) {
  if (!text || !Game.state) return text || '';
  const s = Game.state;
  const lastModel = s.models && s.models.length ? s.models[s.models.length - 1] : null;
  // Prefer the most-recently-deployed model — incidents tied to a live
  // deployment should name *that* model, not the latest pretrain.
  let deployedModel = null;
  if (Game.deployments && Game.deployments.list && Game.deployments.list.length) {
    const dep = Game.deployments.list[Game.deployments.list.length - 1];
    if (dep && Game.deployments.findModel) {
      deployedModel = Game.deployments.findModel(dep.modelId);
    }
  }
  const modelName =
    (deployedModel && (deployedModel.name || deployedModel.modelName)) ||
    (lastModel && (lastModel.name || lastModel.modelName)) ||
    'the model';
  const labName = s.labName || 'the lab';
  return String(text)
    .replace(/\{model\}/g, modelName)
    .replace(/\{lab\}/g, labName);
};

/* Status dot colour helper — used by HUD */
Game.getStatusLevel = function() {
  const s = Game.state;
  if (!s) return 'green';
  const worst = Math.min(s.trust, s.control, 100 - s.dependence);
  if (worst < 25) return 'red';
  if (worst < 55) return 'yellow';
  return 'green';
};
