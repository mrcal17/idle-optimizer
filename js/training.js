/* training.js — Training-run state machine.
   Implements the four training modes (pretraining, architecture, post-training,
   continual-learning) per design spec §2 and §4. Owns the lifecycle of a
   training run: validate -> reserve GPUs -> tick progress -> resolve effect.

   Loaded before personnel.js per index.html order. References Game.events,
   Game.archetypes, Game.paradigmData, Game.tiers inside function bodies only;
   none of those need to exist at module load time. */

window.Game = window.Game || {};

Game.training = (function() {

  /* ---------- evocative auto-name pool, indexed loosely by tier ---------- */
  const NAME_POOL = [
    // Spark / Ember
    'Cinder', 'Ember', 'Tinder', 'Match', 'Spark',
    // Beacon / Lighthouse
    'Lantern', 'Pharos', 'Beacon', 'Lookout', 'Sentinel',
    // Pharos / Apex
    'Cassiopeia', 'Polaris', 'Vega', 'Rigel', 'Sirius', 'Atlas',
    // generic
    'Sarah', 'Aurora', 'Halcyon', 'Meridian', 'Vesper',
  ];

  function pickName(tier) {
    // bias higher-tier picks toward the back of the pool
    const t = Math.max(0, Math.min(tier || 0, 5));
    const start = Math.floor((t / 5) * (NAME_POOL.length - 5));
    const pool = NAME_POOL.slice(start);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------- paradigm-shift cost / effect modulation ---------- */

  function pretrainComputeMult(state) {
    let m = 1;
    if (state.flags['paradigm-sparse-moe']) m *= 0.7;
    if (state.flags['paradigm-synthetic-data-flywheel']) m *= 0.8;
    /* Synergy / quirk-driven discount (lower = cheaper). */
    if (typeof state.flags['synergy-pretrain-compute'] === 'number') {
      m *= state.flags['synergy-pretrain-compute'];
    }
    return m;
  }

  function pretrainGpuTimeMult(state) {
    let m = 1;
    if (state.flags['paradigm-curriculum-learning']) m *= 0.75;
    return m;
  }

  function postTrainTrustGainMult(state) {
    let m = 1;
    if (state.flags['paradigm-constitutional-self-critique']) m *= 1.4;
    /* Synergy / quirk-driven post-train trust uplift. */
    if (typeof state.flags['synergy-posttrain-trust'] === 'number') {
      m *= state.flags['synergy-posttrain-trust'];
    }
    /* RLHF Sweep minigame: rater lean shapes how much trust post-train recovers. */
    if (typeof state.flags['rlhf-sweep-trust-mult'] === 'number') {
      m *= state.flags['rlhf-sweep-trust-mult'];
    }
    return m;
  }

  function postTrainComputeMult(state) {
    let m = 1;
    return m;
  }

  function architectureParadigmChanceMult(state) {
    let m = 1;
    if (state.flags['paradigm-adversarial-red-team-loop']) m *= 1.25;
    /* Synergy / quirk-driven paradigm-shift chance multiplier. */
    if (typeof state.flags['synergy-arch-chance'] === 'number') {
      m *= state.flags['synergy-arch-chance'];
    }
    return m;
  }

  function pretrainCapabilityGainMult(state) {
    let m = 1;
    if (state.flags['paradigm-chain-of-thought-distillation']) m *= 1.25;
    /* RLHF Sweep minigame: helpful-leaning, consistent picks compound capability. */
    if (typeof state.flags['rlhf-sweep-capability-mult'] === 'number') {
      m *= state.flags['rlhf-sweep-capability-mult'];
    }
    return m;
  }

  function archMod(state) {
    if (Game.archetypes && state.archetypeId && Game.archetypes[state.archetypeId]) {
      return Game.archetypes[state.archetypeId].capabilityMod || 1;
    }
    return 1;
  }

  /* ---------- mode definitions ---------- */

  const modes = [
    {
      id: 'pretraining',
      name: 'Pretraining',
      short: 'Tier-up; long & expensive',
      cost(state) {
        const tier = state.capabilityTier;
        const baseC = Game.config.training.pretrainCompute[tier];
        const baseG = Game.config.training.pretrainGpuTime[tier];
        return {
          compute: (baseC != null ? baseC : 4000) * pretrainComputeMult(state),
          gpuTime: (baseG != null ? baseG : 48) * pretrainGpuTimeMult(state),
        };
      },
    },
    {
      id: 'architecture',
      name: 'Architecture Experiment',
      short: 'Cheap roll for paradigm shift',
      cost(state) {
        return {
          compute: Game.config.training.architectureCompute,
          gpuTime: Game.config.training.architectureGpuTime,
        };
      },
    },
    {
      id: 'post-training',
      name: 'Post-Training',
      short: 'Polish; +Trust, conceals Control',
      cost(state) {
        return {
          compute: Game.config.training.postTrainCompute * postTrainComputeMult(state),
          gpuTime: Game.config.training.postTrainGpuTime,
        };
      },
    },
    {
      id: 'continual-learning',
      name: 'Continual Learning',
      short: 'Toggle: passive capability, Control drain',
      requiresTier: 3,
      cost() { return { compute: 0, gpuTime: 0 }; },
    },
  ];

  function getMode(id) {
    return modes.find(m => m.id === id) || null;
  }

  /* ---------- validation helpers ---------- */

  function idleGpuIds(state) {
    const deployed = (Game.deployments && Game.deployments.allocatedGpuIds)
      ? Game.deployments.allocatedGpuIds()
      : new Set();
    return state.gpus.filter(g => !g.busyJobId && !deployed.has(g.id)).map(g => g.id);
  }

  function gpuById(state, id) {
    return state.gpus.find(g => g.id === id) || null;
  }

  /* ---------- API ---------- */

  function startRun(modeId, opts) {
    const s = Game.state;
    if (!s) return null;
    opts = opts || {};
    const mode = getMode(modeId);
    if (!mode) {
      Game.addLog(`Training mode "${modeId}" not recognised.`, 'warn');
      return null;
    }

    /* Continual-learning is a toggle, not a job. */
    if (mode.id === 'continual-learning') {
      if (s.capabilityTier < (mode.requiresTier || 0)) {
        Game.addLog('Continual Learning requires Lighthouse tier.', 'warn');
        return null;
      }
      const now = !s.flags['continual-learning'];
      s.flags['continual-learning'] = now;
      Game.addLog(now
        ? 'Continual Learning enabled. The model now learns while deployed.'
        : 'Continual Learning paused.',
        now ? 'tier' : '');
      if (now && Game.events && Game.events.scriptedBeat) {
        Game.events.scriptedBeat('continual-learning-on');
      }
      return 'continual-learning-toggle';
    }

    /* Stage-gated parallelism: Garage allows 1, Lab 3, Org unbounded.
       Defensive — if Game.stages is missing, fall back to existing behavior. */
    if (Game.stages && Game.stages.getMaxParallelism) {
      const maxParallel = Game.stages.getMaxParallelism(s);
      if (s.trainingRuns.length >= maxParallel) {
        Game.addLog(
          `Only ${maxParallel === Number.POSITIVE_INFINITY ? '∞' : maxParallel} parallel training runs at this stage.`,
          'warn'
        );
        return null;
      }
    }

    /* Resolve cost & gpu allocation */
    const cost = mode.cost(s);
    const requestedGpuIds = (opts.gpuIds && opts.gpuIds.length) ? opts.gpuIds.slice() : idleGpuIds(s);
    if (!requestedGpuIds.length) {
      Game.addLog('No GPUs available for training.', 'warn');
      return null;
    }

    /* Check assigned GPUs are real & idle */
    const deployed = (Game.deployments && Game.deployments.allocatedGpuIds)
      ? Game.deployments.allocatedGpuIds()
      : new Set();
    const validGpus = [];
    for (const id of requestedGpuIds) {
      const g = gpuById(s, id);
      if (!g) continue;
      if (g.busyJobId) continue;
      if (deployed.has(g.id)) continue;
      validGpus.push(g);
    }
    if (!validGpus.length) {
      Game.addLog('Assigned GPUs are busy or missing.', 'warn');
      return null;
    }

    /* For pretraining we require *some* compute reserve to start (we drain
       per-tick, but need a minimum drip to begin). For arch / post-train,
       ditto but at lower bar. */
    const minComputeToStart = Math.min(cost.compute * 0.05, 5);
    if (s.compute < minComputeToStart) {
      Game.addLog('Not enough Compute to begin this training run.', 'warn');
      return null;
    }

    /* Founder energy gate — runs *after* validation so the player only pays
       energy on a run that's actually going to start. Pretraining is the
       heaviest commit; if exhausted, refuse. Arch / post-train are lighter
       and don't reject on exhaustion (just log fumes + bump stress). */
    if (Game.founder && Game.founder.spendEnergy) {
      let energyCost = 0;
      if (mode.id === 'pretraining') energyCost = 15;
      else if (mode.id === 'architecture') energyCost = 5;
      else if (mode.id === 'post-training') energyCost = 3;
      if (energyCost > 0) {
        const ok = Game.founder.spendEnergy(energyCost, 'training-' + mode.id);
        if (!ok && mode.id === 'pretraining') {
          Game.addLog("You're too tired to start a training run today.", 'warn');
          return null;
        }
      }
    }

    const tier = (typeof opts.modelTier === 'number') ? opts.modelTier : (s.capabilityTier + 1);
    const modelName = (opts.modelName && opts.modelName !== 'auto')
      ? opts.modelName
      : pickName(tier);

    const run = {
      id: s.nextTrainingId++,
      mode: mode.id,
      modelTier: tier,
      modelName,
      lineageOf: opts.lineageOf || null,
      gpuIds: validGpus.map(g => g.id),
      computeRequired: cost.compute,
      computeProgress: 0,
      gpuTimeRequired: cost.gpuTime,
      gpuTimeProgress: 0,
      riskProfile: estimateRisk(mode.id, s),
      stalled: false,
      startedDay: s.day,
    };

    /* Reserve GPUs */
    for (const g of validGpus) g.busyJobId = run.id;
    s.trainingRuns.push(run);

    Game.addLog(`Training started: ${mode.name} on "${run.modelName}" (${validGpus.length} GPUs).`, 'tier');
    return run.id;
  }

  function cancelRun(id) {
    const s = Game.state;
    if (!s) return;
    const idx = s.trainingRuns.findIndex(r => r.id === id);
    if (idx < 0) return;
    const run = s.trainingRuns[idx];
    /* Free the GPUs — sunk cost on compute already drained. */
    for (const gid of run.gpuIds) {
      const g = gpuById(s, gid);
      if (g && g.busyJobId === run.id) {
        g.busyJobId = null;
        g.idleSince = s.day;
      }
    }
    s.trainingRuns.splice(idx, 1);
    Game.addLog(`Training cancelled: ${run.modelName} (${run.mode}). Compute spent is gone.`, 'warn');
  }

  function tickJobs() {
    const s = Game.state;
    if (!s) return;
    const c = Game.config;
    const runs = s.trainingRuns;
    if (!runs.length) return;

    /* Iterate copy because onComplete mutates the array */
    const snapshot = runs.slice();
    for (const run of snapshot) {
      const assignedGpus = run.gpuIds
        .map(id => gpuById(s, id))
        .filter(g => g && g.busyJobId === run.id);
      if (!assignedGpus.length) {
        /* All GPUs gone — kill the run. */
        Game.addLog(`Training "${run.modelName}" lost all assigned GPUs and stalled out.`, 'warn');
        const idx = runs.indexOf(run);
        if (idx >= 0) runs.splice(idx, 1);
        continue;
      }

      /* Per-GPU contribution to compute throughput on this job:
         baseThroughput × specMult × workloadBonus.training (if training-spec)
         workloadBonus.research applies on architecture experiments via
         research-spec GPUs, etc. */
      let computeThisTick = 0;
      let gpuTimeThisTick = 0;
      for (const g of assignedGpus) {
        const specMult = c.gpu.specMult[g.spec] || 1;
        let workloadBonus = 1;
        if (run.mode === 'architecture' && g.spec === 'research') {
          workloadBonus = c.gpu.workloadBonus.research;
        } else if (g.spec === 'training') {
          workloadBonus = c.gpu.workloadBonus.training;
        }
        computeThisTick += c.gpu.baseThroughput * specMult * workloadBonus;
        gpuTimeThisTick += c.daysPerTick;   // each GPU advances gpu-time by daysPerTick gpu-days/tick
      }

      /* Compute drain — requires Compute reserve. If insufficient, the run
         stalls (no progress this tick) but is not cancelled. */
      const computeDrain = computeThisTick;
      if (s.compute < computeDrain) {
        if (!run.stalled) {
          run.stalled = true;
          Game.addLog(`Training "${run.modelName}" is stalled — Compute reserve too low.`, 'warn');
        }
        continue;
      }
      if (run.stalled) {
        run.stalled = false;
        Game.addLog(`Training "${run.modelName}" resumed.`, '');
      }
      s.compute -= computeDrain;
      run.computeProgress += computeDrain;
      run.gpuTimeProgress += gpuTimeThisTick;

      const computeDone = run.computeProgress >= run.computeRequired;
      const gpuTimeDone = run.gpuTimeProgress >= run.gpuTimeRequired;

      if (computeDone && gpuTimeDone) {
        onComplete(run);
      }
    }
  }

  function onComplete(run) {
    const s = Game.state;
    if (!s) return;

    /* Free GPUs */
    for (const gid of run.gpuIds) {
      const g = gpuById(s, gid);
      if (g && g.busyJobId === run.id) {
        g.busyJobId = null;
        g.idleSince = s.day;
      }
    }
    /* Remove run from list */
    const idx = s.trainingRuns.indexOf(run);
    if (idx >= 0) s.trainingRuns.splice(idx, 1);

    s.stats.runsCompleted = (s.stats.runsCompleted || 0) + 1;

    if (run.mode === 'pretraining') {
      handlePretrainComplete(run);
    } else if (run.mode === 'architecture') {
      handleArchitectureComplete(run);
    } else if (run.mode === 'post-training') {
      handlePostTrainComplete(run);
    } else {
      Game.addLog(`Training "${run.modelName}" completed.`, '');
    }
  }

  function handlePretrainComplete(run) {
    const s = Game.state;
    const c = Game.config;
    /* Capability gain — chunk proportional to current tier threshold,
       modulated by archetype + paradigm shifts. */
    const tier = s.capabilityTier;
    const nextThreshold = c.tierThresholds[tier + 1] || (c.tierThresholds[c.tierThresholds.length - 1] * 1.5);
    const curThreshold = c.tierThresholds[tier] || 0;
    /* ~5 pretrain runs to advance per spec */
    const baseGain = (nextThreshold - curThreshold) / 5;
    const gain = baseGain * pretrainCapabilityGainMult(s) * archMod(s);
    s.capability += gain;

    /* Track / version up the model.
       The modelIdentity layer (when present) builds the rich shape:
       capability/alignment/brand stats, quirks, signature, eval flavor,
       lineage. If modelIdentity is missing we fall back to the bare
       shape so the prototype still progresses. */
    let model = s.models.find(m => m.tier === run.modelTier);
    let isNew = false;
    const lineageParent = run.lineageOf || null;

    if (!model) {
      if (Game.modelIdentity && Game.modelIdentity.buildModel) {
        model = Game.modelIdentity.buildModel({
          run,
          name: run.modelName,
          tier: run.modelTier,
          version: 0.2,
          capability: s.capability,
          parentId: lineageParent,
        });
      } else {
        model = {
          id: 'model-' + (s.nextModelId = (s.nextModelId || 1)),
          tier: run.modelTier,
          name: run.modelName,
          version: 0.2,
          postTrainings: 0,
          createdDay: Math.floor(s.day),
          status: 'trained',
          events: [],
        };
        s.nextModelId = (s.nextModelId || 1) + 1;
      }
      s.models.push(model);
      isNew = true;
      // Mark as freshly added so the office scene can fade it in
      s._lastAddedModelId = model.id;
    } else {
      model.version = +(model.version + 0.2).toFixed(2);
      if (!model.id) {
        const nextId = s.nextModelId || 1;
        model.id = 'model-' + nextId;
        s.nextModelId = nextId + 1;
      }
      if (!Array.isArray(model.events)) model.events = [];
      /* Refresh the eval flavor so the report card on a re-pretrain
         tells the story of the new version. */
      if (Game.modelFlavor && Game.modelFlavor.compose) {
        const refreshed = Game.modelFlavor.compose({
          tier: model.tier,
          alignment: model.alignment,
          brand: model.brand,
          name: model.name,
          version: model.version,
        });
        model.quirks = refreshed.quirks || model.quirks;
        model.signatureBehavior = refreshed.signature || model.signatureBehavior;
        model.evalFlavor = refreshed.evalFlavor || model.evalFlavor;
        model.grade = refreshed.grade || model.grade;
      }
      model.capability = Math.round(s.capability * 10) / 10;
    }

    Game.addLog(`Pretraining of ${model.name} v${model.version} complete. Capability +${gain.toFixed(1)}.`, 'tier');

    const apexTier = Game.tiers ? Game.tiers.length - 1 : Game.config.tierThresholds.length - 1;
    if (run.modelTier >= apexTier) {
      s.flags['apex-pretrain-complete'] = true;
    }

    /* Per-model "trained" event */
    if (Game.events && Game.events.recordModelMoment) {
      const evalSentence = (model.evalFlavor || '').split(/[.!?]/)[0];
      const body = isNew
        ? `Trained on Day ${Math.floor(s.day)}. ${evalSentence ? 'Initial evals: ' + evalSentence + '.' : 'Initial evals look promising.'}`
        : `Pretraining round complete on Day ${Math.floor(s.day)}. Now at v${model.version}.`;
      Game.events.recordModelMoment(model.id, body, isNew ? 'milestone' : 'good');
    }

    /* The cinematic moment — show the report card overlay. */
    if (Game.modelIdentity && Game.modelIdentity.showReportCard) {
      Game.modelIdentity.showReportCard(model);
    }

    /* Roll incident */
    rollIncident(run);
  }

  /* IDs of paradigms that route through the rlhf-sweep minigame.
     Read paradigms.js for canonical IDs — only ones present there will fire. */
  const RLHF_SWEEP_PARADIGM_IDS = [
    'rlhf-from-preferences',
    'constitutional-self-critique',
    'rlhf-stack',                  // forward-compat name from MINIGAMES.md
    'preference-tuned-refinement', // forward-compat name from MINIGAMES.md
  ];

  function applyParadigmShift(shift, run, mults) {
    const s = Game.state;
    if (!s) return;
    /* If the minigame produced multipliers, persist them as flags so any
       sim consumer (post-train trust gain, capability mults) can read them.
       We keep the original effect() side-effects intact. */
    if (mults && (mults.capabilityMult || mults.trustMult)) {
      s.flags['rlhf-sweep-capability-mult'] = mults.capabilityMult || 1;
      s.flags['rlhf-sweep-trust-mult']      = mults.trustMult      || 1;
      s.flags['rlhf-sweep-consistency']     = (typeof mults.consistency === 'number') ? mults.consistency : 0.5;
      s.flags['rlhf-sweep-lean']            = (typeof mults.lean === 'number') ? mults.lean : 0;
    }
    if (typeof shift.effect === 'function') {
      try { shift.effect(s); }
      catch (e) {
        console.error('Paradigm effect failed:', shift.id, e);
        if (shift.id) s.flags['paradigm-' + shift.id] = true;
      }
    } else if (shift.id) {
      s.flags['paradigm-' + shift.id] = true;
    }
    Game.addLog(`Paradigm shift unlocked: ${shift.name}. ${shift.flavor || ''}`, 'tier');
    if (Game.events && Game.events.scriptedBeat) {
      Game.events.scriptedBeat('paradigm-' + shift.id);
    }
    // Per-model paradigm shift moment on the model that triggered it
    if (Game.events && Game.events.onParadigmShift) {
      const triggerModel = (s.models || []).find(m => m.tier === run.modelTier)
        || (s.models || [])[s.models.length - 1];
      Game.events.onParadigmShift(shift, triggerModel);
    }
    if (Game.ui && Game.ui.refresh) Game.ui.refresh();
  }

  function handleArchitectureComplete(run) {
    const s = Game.state;
    const c = Game.config;
    const baseChance = c.training.architectureParadigmChance * architectureParadigmChanceMult(s);

    if (Math.random() < baseChance && Game.paradigmData && Game.paradigmData.pickRandom) {
      const takenIds = (s.paradigms || []).map(p => p && p.id).filter(Boolean);
      const shift = Game.paradigmData.pickRandom(takenIds);
      if (shift) {
        s.paradigms.push(shift);

        /* Route through the rlhf-sweep minigame if this shift is preference-
           tuning related and the minigame framework is present. The minigame
           halts the sim via pendingDecision; we apply the shift on completion
           with the resulting multipliers. */
        const eligibleForSweep = shift.id && RLHF_SWEEP_PARADIGM_IDS.indexOf(shift.id) >= 0;
        const minigameAvailable = Game.minigames
                                 && Game.minigames.registry
                                 && Game.minigames.registry['rlhf-sweep'];
        if (eligibleForSweep && minigameAvailable) {
          Game.minigames.open('rlhf-sweep', {
            context: { paradigm: shift, run },
            onComplete(result) {
              applyParadigmShift(shift, run, result || {});
            },
          });
          return;
        }

        /* Default flow: apply effect immediately, no minigame. */
        applyParadigmShift(shift, run, null);
        return;
      }
    }
    Game.addLog(`Architecture experiment "${run.modelName}" produced no paradigm shift this time.`, '');
  }

  function handlePostTrainComplete(run) {
    const s = Game.state;
    const c = Game.config;
    const trustGain = c.training.postTrainTrustRecovery * postTrainTrustGainMult(s);
    s.trust = Math.max(0, Math.min(100, s.trust + trustGain));

    /* Mask Control issues for a window — set tick to unmask */
    s.flags['post-train-mask-until'] = s.tickCount + c.training.postTrainControlMaskTicks;

    /* Bump the model variant (no version-up; suffix track) */
    const model = s.models.find(m => m.tier === run.modelTier) || s.models[s.models.length - 1];
    if (model) {
      model.postTrainings = (model.postTrainings || 0) + 1;
      Game.addLog(`Post-training on ${model.name} v${model.version}-rl${model.postTrainings} complete. Trust +${trustGain.toFixed(1)}.`, '');
    } else {
      Game.addLog(`Post-training on "${run.modelName}" complete. Trust +${trustGain.toFixed(1)}.`, '');
    }
  }

  /* ---------- incident roll ---------- */

  function estimateRisk(modeId, state) {
    const c = Game.config;
    if (modeId === 'pretraining') return c.training.pretrainIncidentRiskBase;
    if (modeId === 'architecture') return c.training.pretrainIncidentRiskBase * 0.25;
    if (modeId === 'post-training') return c.training.pretrainIncidentRiskBase * 0.4;
    return 0;
  }

  function rollIncident(run) {
    const s = Game.state;
    let chance = estimateRisk(run.mode, s);

    /* Safety upgrades / interpretability / archetype dampen risk */
    if (Game.upgrades && Game.upgrades.coverage) {
      chance *= (1 - 0.6 * Game.upgrades.coverage('interpretability'));
      chance *= (1 - 0.4 * Game.upgrades.coverage('safety'));
    }
    if (Game.archetypes && s.archetypeId) {
      const arch = Game.archetypes[s.archetypeId];
      if (arch && arch.controlMod) chance *= arch.controlMod;
    }
    /* Training-spec GPUs reduce risk a touch (better ops hygiene) */
    const trainingGpus = run.gpuIds
      .map(id => s.gpus.find(g => g.id === id))
      .filter(g => g && g.spec === 'training').length;
    chance *= Math.max(0.5, 1 - 0.05 * trainingGpus);

    if (Math.random() < chance) {
      if (Game.events && Game.events.fireIncidentFromTraining) {
        Game.events.fireIncidentFromTraining(run);
      } else {
        /* fallback if events module missing */
        Game.addLog(`Incident during training of ${run.modelName}.`, 'warn');
      }
    }
  }

  /* ---------- expose ---------- */

  /* Convenience for autopilot: kick off a pretrain run with all idle GPUs. */
  function startPretrain() {
    return startRun('pretraining', {});
  }

  return {
    startRun,
    startPretrain,
    cancelRun,
    tickJobs,
    onComplete,
    rollIncident,
    modes,
    modeNameAuto: pickName,         // legacy alias (the spec's modelNameAuto)
    modelNameAuto: pickName,
  };

})();
