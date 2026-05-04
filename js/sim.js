/* sim.js — Tick loop, equations, phase progression.
   Pure logic; no DOM. UI listens for Game.events.tick / Game.ui.refresh. */

window.Game = window.Game || {};
Game.sim = {};

Game.sim.start = function() {
  Game.sim.stop();
  Game.sim._intervalId = setInterval(Game.sim.frame, Game.config.tickMs);
};

Game.sim.stop = function() {
  if (Game.sim._intervalId) clearInterval(Game.sim._intervalId);
  Game.sim._intervalId = null;
};

Game.sim.frame = function() {
  if (!Game.state) return;
  // Day-phase 'end-of-day' halts ticks until the player closes the panel.
  // pendingDecision (pivot/incident gate) also halts. paused is manual pause.
  const halted = Game.state.paused
    || Game.state.pendingDecision
    || Game.state.dayPhase === 'end-of-day';
  const speed = halted ? 0 : Game.state.speed;
  for (let i = 0; i < speed; i++) Game.sim.tick();
  // Always refresh UI even when paused so overlays show.
  if (Game.ui && Game.ui.refresh) Game.ui.refresh();
};

Game.sim.tick = function() {
  const s = Game.state;
  const c = Game.config;
  s.tickCount++;
  s.day += c.daysPerTick;

  /* === Team-chemistry effects (push composed multipliers onto state.flags) === */
  if (Game.synergies && Game.synergies.tickEffects) Game.synergies.tickEffects();

  /* === GPU compute production ===
     Inference-spec GPUs no longer auto-generate revenue. Revenue now
     flows through Game.deployments — the player must explicitly deploy
     a trained model to a domain. If the deployments module is missing
     (defensive — e.g. partial load), inference GPUs revert to the
     legacy passive-revenue path so the run isn't stuck. */
  const idleGpus = s.gpus.filter(g => !g.busyJobId);
  let baselineCompute = 0;
  let inferenceRevenueLegacy = 0;
  const deploymentsLoaded = !!(Game.deployments && Game.deployments.tick);
  const arch = (Game.archetypes && s.archetypeId) ? Game.archetypes[s.archetypeId] : null;
  for (const g of idleGpus) {
    const specMult = c.gpu.specMult[g.spec] || 1;
    if (g.spec === 'inference') {
      if (!deploymentsLoaded) {
        // Defensive fallback only: legacy passive inference revenue.
        inferenceRevenueLegacy += c.revenue.perInferenceGpu *
          (1 + s.capabilityTier * c.revenue.capabilityRevenueScale) *
          c.gpu.workloadBonus.inference *
          (arch ? (arch.revenueMod || 1) : 1);
      }
      // Otherwise: inference GPU revenue is owned by Game.deployments.tick().
    } else {
      baselineCompute += c.gpu.baseThroughput * specMult;
    }
  }
  // Tap focus bonus (decays)
  const focusBonus = 1 + (s.focusMeter / 100) * c.tap.focusBonusMax;
  s.compute += baselineCompute * focusBonus;
  s.stats.totalCompute += baselineCompute * focusBonus;
  if (inferenceRevenueLegacy) {
    s.money += inferenceRevenueLegacy;
    s.stats.totalRevenue += inferenceRevenueLegacy;
  }
  s.focusMeter = Math.max(0, s.focusMeter - c.tap.focusDecayPerTick);

  /* === Deployment economics (per-deployment revenue + pressures) === */
  if (deploymentsLoaded) Game.deployments.tick();

  /* === Training run progress (active jobs) === */
  if (Game.training && Game.training.tickJobs) Game.training.tickJobs();

  /* === Personnel productivity & cost === */
  if (Game.personnel && Game.personnel.tick) Game.personnel.tick();

  /* === Auto-OM passive income (Vend moment legacy) === */
  if (s.flags['auto-om-active']) {
    s.money += 0.4;
    s.stats.totalRevenue += 0.4;
  }

  /* === Archetype-specific income (defensive: only if module loaded) === */
  if (Game.income && Game.income.tick) Game.income.tick();

  /* === Capability accumulation (passive trickle from compute spend) === */
  // Compute trickles into capability research at a slow rate (research-specialized GPUs amplify)
  const researchGpus = idleGpus.filter(g => g.spec === 'research').length;
  const researchBonus = researchGpus * (c.gpu.workloadBonus.research - 1);
  const archMod = arch ? (arch.capabilityMod || 1) : 1;
  let capabilityGain = c.capability.computeToCapability * (idleGpus.length * 0.5 + researchBonus) * archMod;
  if (s.flags['aligned-mission']) capabilityGain *= 0.75;
  s.capability += capabilityGain;

  /* === Pressure dynamics === */
  // Trust recovery & drift
  let trustDelta = c.pressure.trustRecovery * (arch ? (arch.trustMod || 1) : 1);
  if (s.flags['aligned-mission']) trustDelta *= 1.5;
  // Synergy / quirk-driven trust recovery boost (only on the positive recovery side).
  const synergyTrustRec = (typeof s.flags['synergy-trust-recovery'] === 'number') ? s.flags['synergy-trust-recovery'] : 1;
  if (trustDelta > 0) trustDelta *= synergyTrustRec;
  // Automation visibility hit
  const autoCount = s.personnel.filter(p => p.level >= 3).length;
  trustDelta -= autoCount * c.pressure.automationVisibilityHit;
  // Tier pressure
  trustDelta -= s.capabilityTier * 0.005;
  s.trust = Math.max(0, Math.min(100, s.trust + trustDelta));

  // Control drift
  const interpCoverage = (Game.upgrades && Game.upgrades.coverage) ? Game.upgrades.coverage('interpretability') : 0;
  let controlDelta = -capabilityGain * c.pressure.controlDriftPerCapability * 100 * (1 - interpCoverage) * (arch ? (arch.controlMod || 1) : 1);
  if (s.flags['aligned-mission']) controlDelta *= 0.5;
  if (s.flags['agent-fleet-deployed']) controlDelta *= 2;
  // Synergy / quirk-driven control drift multiplier (only the negative drift portion).
  const synergyCtrl = (typeof s.flags['synergy-control-mult'] === 'number') ? s.flags['synergy-control-mult'] : 1;
  if (controlDelta < 0) controlDelta *= synergyCtrl;
  // Auto-personnel drift
  for (const p of s.personnel) controlDelta -= (c.personnel.autoControlDrift[p.level] || 0) * 0.01;
  // Active safety research counteracts
  if (s.flags['safety-research-active']) controlDelta += 0.02;
  s.control = Math.max(0, Math.min(100, s.control + controlDelta));

  // Dependence (one-way)
  let depDelta = 0;
  for (const p of s.personnel) depDelta += (c.personnel.autoDependence[p.level] || 0) * 0.01;
  if (!deploymentsLoaded) {
    // Legacy: every inference-spec GPU generated dependence pressure.
    // With deployments loaded, this is owned per-deployment in Game.deployments.tick().
    const inferenceCount = s.gpus.filter(g => g.spec === 'inference').length;
    depDelta += inferenceCount * c.pressure.dependencePerDeployment * 0.5;
  }
  if (s.flags['continual-learning']) depDelta += c.training.continualLearningDependence;
  if (s.flags['open-source-released']) depDelta += 0.06;
  // Synergy / quirk-driven dependence multiplier on the accumulating side only.
  const synergyDep = (typeof s.flags['synergy-dependence'] === 'number') ? s.flags['synergy-dependence'] : 1;
  if (depDelta > 0) depDelta *= synergyDep;
  s.dependence = Math.max(0, Math.min(100, s.dependence + depDelta));

  /* === Continual learning passive effects === */
  if (s.flags['continual-learning']) {
    s.capability += capabilityGain * 0.4;     // free passive capability
    s.control = Math.max(0, s.control - c.training.continualLearningControlDrain);
  }

  /* === Tier check === */
  Game.sim.checkTierUp();

  /* === Phase / scene unlock checks === */
  Game.sim.checkSceneUnlocks();

  /* === Progressive UI disclosure === */
  if (Game.discovery && Game.discovery.check) Game.discovery.check();

  /* === Autopilot decision === */
  if (Game.autopilot && Game.autopilot.tick) Game.autopilot.tick();

  /* === Random events / incidents === */
  if (Game.events && Game.events.maybeFireIncident) Game.events.maybeFireIncident();

  /* === Per-model positive moments === */
  if (Game.events && Game.events.maybeFireModelMoment) Game.events.maybeFireModelMoment();

  /* === Pivot availability check === */
  if (Game.pivots && Game.pivots.checkAvailability) Game.pivots.checkAvailability();

  /* === Pressure decision-required gates === */
  if (s.trust < c.redZone && !s.flags['decision-trust-red']) {
    s.flags['decision-trust-red'] = true;
    Game.events.advise('Comms Lead', 'Trust is in the red zone. Public sentiment is shifting fast — we should respond before this compounds.');
  }
  if (s.control < c.redZone && !s.flags['decision-control-red']) {
    s.flags['decision-control-red'] = true;
    Game.events.advise('Interpretability Lead', 'Control is slipping. We need to slow capability work or invest in interpretability — soon.');
  }

  /* === Loss conditions === */
  if (s.trust <= 0 && !s.runEnded) {
    Game.endings.resolve('trust-collapse');
  } else if (s.control <= 0 && !s.runEnded) {
    Game.endings.resolve('control-collapse');
  }

  /* === Stage transition (Garage → Lab → Org) === */
  // Stage is derived from capability tier but stored on state so the
  // transition cinematic fires exactly once per crossing.
  if (Game.stages && Game.stages.derive) {
    const next = Game.stages.derive(s);
    if (next !== s.stage) {
      const prev = s.stage;
      s.stage = next;
      if (Game.stages.onTransition) Game.stages.onTransition(prev, next);
    }
  }

  /* === Day-loop hook (end-of-day decision panel) === */
  if (Game.dayLoop && Game.dayLoop.checkBoundary) {
    Game.dayLoop.checkBoundary();
  }

  /* === Founder energy / mood drift === */
  if (Game.founder && Game.founder.tick) Game.founder.tick();
};

Game.sim.checkTierUp = function() {
  const s = Game.state;
  const next = s.capabilityTier + 1;
  if (s.flags['capability-cap-lighthouse'] && next > 3) {
    return;
  }
  if (Game.tiers && next === Game.tiers.length - 1 && !s.flags['apex-pretrain-complete']) {
    return;
  }
  if (next >= Game.config.tierThresholds.length) {
    // Apex check happens via training (Pharos -> Apex requires final pretrain)
    return;
  }
  if (s.capability >= Game.config.tierThresholds[next] && !s.flags['tier-up-pending-' + next]) {
    s.capabilityTier = next;
    s.flags['tier-up-pending-' + next] = true;
    const tier = Game.tiers[next];
    Game.addLog(`Tier up: ${tier.name} (${tier.category}).`, 'tier');
    if (Game.events && Game.events.onTierUp) Game.events.onTierUp(next);
    // Trigger Apex resolution at top tier
    if (next === Game.tiers.length - 1 && Game.endings) {
      Game.endings.resolveApex();
    }
  }
};

Game.sim.checkSceneUnlocks = function() {
  const s = Game.state;
  if (!s.scenesUnlocked.office && (s.personnel.length > 1 || s.gpus.length > 1)) {
    s.scenesUnlocked.office = true;
    Game.addLog('Office unlocked. The lab has more than just you now.', '');
    if (Game.ui && Game.ui.refreshNav) Game.ui.refreshNav();
  }
  const hasActiveDeployment = !!(Game.deployments && Game.deployments.list &&
    Game.deployments.list.some(d => (d.gpuIds || []).length > 0));
  if (!s.scenesUnlocked.world && hasActiveDeployment) {
    s.scenesUnlocked.world = true;
    Game.addLog('World view unlocked. Your deployments have a footprint.', '');
    if (Game.ui && Game.ui.refreshNav) Game.ui.refreshNav();
  }
  if (!s.scenesUnlocked.logs && s.logs.length > 6) {
    s.scenesUnlocked.logs = true;
    if (Game.ui && Game.ui.refreshNav) Game.ui.refreshNav();
  }
};

/* === Tap interaction (called from desk scene click handler) === */
Game.sim.handleTap = function(x, y) {
  const s = Game.state;
  const c = Game.config;
  s.compute += c.tap.computePerTap * (1 + s.focusMeter / 100);
  s.insight += c.tap.insightPerTap * (1 + s.focusMeter / 100);
  s.capability += c.tap.insightPerTap * c.capability.tapInsightToCapability * (1 + s.focusMeter / 100);
  s.focusMeter = Math.min(100, s.focusMeter + c.tap.focusGainPerTap);
  s.lastTapAt = Date.now();
  return {
    compute: c.tap.computePerTap,
    insight: c.tap.insightPerTap,
  };
};
