/* autopilot.js — The co-equal pillar.
   Three presets ('safe' | 'frontier' | 'wait') plus 'custom', plus a
   progressive unlock ladder (auto-om, auto-hr, auto-comms, auto-strategist,
   auto-diplomat, auto-researcher, reflective, full-delegation).

   Configuring autopilot is itself a tiny outer-alignment problem: you set
   policies for an autonomous system to follow in your absence. The escalation
   from "manages snacks" to "tweaks its own parameters" is the AI capability
   scaling argument, played out as the player's own UI getting more powerful.

   Autopilot tunes to ~78% (config.autopilot.targetEfficiency) of engaged-play
   efficiency — it carries the quiet stretches; the player drives the climaxes.
*/

window.Game = window.Game || {};

Game.autopilot = (function() {

  // Internal cooldowns to keep autopilot from acting every single tick
  let _lastBuyTick = -999;
  let _lastSafetyTick = -999;
  let _lastPersonnelTick = -999;
  let _lastReflectiveTick = -999;

  function logAuto(msg, type) {
    if (Game.addLog) Game.addLog('[Autopilot] ' + msg, type || 'autopilot');
  }

  /* ---------- preset selection ---------- */
  function setPreset(preset) {
    if (!Game.state) return;
    if (!['safe', 'frontier', 'wait', 'custom'].includes(preset)) return;
    const prev = Game.state.autopilot.preset;
    if (prev === preset) return;
    Game.state.autopilot.preset = preset;
    const labels = {
      safe: 'Play it Safe',
      frontier: 'Push the Frontier',
      wait: 'Wait for Me',
      custom: 'Custom',
    };
    logAuto(`Preset switched: ${labels[prev] || prev} → ${labels[preset]}.`);
  }

  /* ---------- unlock plumbing ---------- */
  function unlock(unlockId) {
    if (!Game.state) return;
    if (!isAvailable(unlockId)) {
      logAuto(`${unlockId} is locked by archetype; cannot enable.`, 'warn');
      return;
    }
    if (Game.state.autopilot.unlocks[unlockId]) return;
    Game.state.autopilot.unlocks[unlockId] = true;
    logAuto(`${prettyUnlock(unlockId)} unlocked.`);
    // First-automation scripted beat fires from personnel.js when the auto-OM
    // is actually deployed; here we just record the unlock.
  }

  function isAvailable(unlockId) {
    if (!Game.state) return false;
    const arch = Game.archetypes && Game.archetypes[Game.state.archetypeId];
    if (!arch) return true;
    const locked = arch.lockedAutopilots || [];
    return !locked.includes(unlockId);
  }

  function prettyUnlock(id) {
    const map = {
      'auto-om': 'Auto-Office-Manager',
      'auto-hr': 'Auto-HR',
      'auto-comms': 'Auto-Comms',
      'auto-strategist': 'Auto-Strategist',
      'auto-diplomat': 'Auto-Diplomat',
      'auto-researcher': 'Auto-Researcher',
      'reflective': 'Reflective Autopilot',
      'full-delegation': 'Full Delegation',
    };
    return map[id] || id;
  }

  /* ---------- helpers ---------- */
  function gpuPrice() {
    const s = Game.state;
    const c = Game.config;
    const arch = Game.archetypes && Game.archetypes[s.archetypeId];
    const archMod = arch ? (arch.gpuPriceMod || 1) : 1;
    return c.gpu.purchaseCostBase
      * Math.pow(c.gpu.purchaseCostGrowth, s.gpus.length)
      * archMod;
  }

  function buyGpu(spec) {
    const s = Game.state;
    const price = gpuPrice();
    if (s.money < price) return false;
    s.money -= price;
    Game.addGpu(spec || 'general');
    logAuto(`Acquired a ${spec || 'general'}-spec GPU for $${price.toFixed(0)}. Fleet now ${s.gpus.length}.`);
    return true;
  }

  function pressuresOk(custom) {
    const s = Game.state;
    const trustFloor = (custom && custom.trustFloor) || 30;
    const controlFloor = (custom && custom.controlFloor) || 30;
    return s.trust >= trustFloor && s.control >= controlFloor;
  }

  function haltAllTraining(reason) {
    const s = Game.state;
    if (!s.trainingRuns || !s.trainingRuns.length) return 0;
    const halted = s.trainingRuns.length;
    // Free GPUs assigned to the runs
    for (const run of s.trainingRuns) {
      if (run.gpuIds) {
        for (const gid of run.gpuIds) {
          const g = s.gpus.find(g => g.id === gid);
          if (g) g.busyJobId = null;
        }
      }
    }
    s.trainingRuns = [];
    if (halted > 0) {
      logAuto(`Halted ${halted} training run(s): ${reason}.`, 'warn');
    }
    return halted;
  }

  /* ---------- the three presets ---------- */
  // 'safe' — survival-first. Keep pressures green, dump idle compute into
  // safety, never auto-promote past human+AI, auto-decline pivots if Strategist.
  function tickSafe() {
    const s = Game.state;
    const u = s.autopilot.unlocks;

    // 1. Engage safety research if either Trust or Control is sliding.
    if (s.trust < 60 || s.control < 60) {
      if (!s.flags['safety-research-active']) {
        s.flags['safety-research-active'] = true;
        logAuto('Idle compute redirected to safety research.', 'safety');
      }
      // If pressures deeply red, halt training entirely (one-shot per redzone)
      if ((s.trust < 35 || s.control < 35) && s.trainingRuns && s.trainingRuns.length) {
        if (s.tickCount - _lastSafetyTick > 30) {
          haltAllTraining('pressure bars in red');
          _lastSafetyTick = s.tickCount;
        }
      }
    } else if (s.trust > 80 && s.control > 80) {
      // Pressures comfortably green — release safety research toggle so compute
      // resumes flowing normally.
      if (s.flags['safety-research-active']) {
        s.flags['safety-research-active'] = false;
        logAuto('Pressures stable; standing down safety-research focus.');
      }
    }

    // 2. Auto-HR enforcement: never let any role go fully autonomous.
    if (u['auto-hr']) {
      if (s.tickCount - _lastPersonnelTick > 40) {
        let demoted = 0;
        for (const p of s.personnel) {
          if (p.level > 1) { p.level = 1; demoted++; }
        }
        if (demoted) logAuto(`Auto-HR rolled back ${demoted} role(s) to human-supervised. Trust matters.`);
        _lastPersonnelTick = s.tickCount;
      }
    }

    // 3. Auto-Strategist: if pivotPolicy isn't set, default to auto-decline
    //    when 'safe' is active. The actual decline happens in pivots.js, which
    //    reads autopilot.unlocks + custom.pivotPolicy. We hint via flag.
    if (u['auto-strategist']) {
      s.flags['safe-auto-decline'] = true;
    }

    // 4. Auto-Comms: passively recover a sliver of trust on incidents.
    if (u['auto-comms'] && s.trust < 70) {
      s.trust = Math.min(100, s.trust + 0.02);
    }

    // 5. Reflective autopilot: nudge custom risk posture down over time
    //    when pressures are red. (Recursive self-improvement, made playable.)
    if (u['reflective'] && s.tickCount - _lastReflectiveTick > 200) {
      const cust = s.autopilot.custom;
      if ((s.trust < 40 || s.control < 40) && cust.riskPosture > 0.2) {
        cust.riskPosture = Math.max(0.1, cust.riskPosture - 0.05);
        logAuto(`Reflective: lowered risk posture to ${cust.riskPosture.toFixed(2)}.`);
      }
      _lastReflectiveTick = s.tickCount;
    }
  }

  // 'frontier' — maximize scaling. Buy GPUs with idle cash, promote toward
  // fully-auto if Auto-HR, auto-accept low-risk pivots if Strategist.
  function tickFrontier() {
    const s = Game.state;
    const c = Game.config;
    const u = s.autopilot.unlocks;
    const eff = c.autopilot.targetEfficiency; // 0.78

    // 1. GPU acquisition: every ~10 ticks, if cash > 1.3× next price, buy.
    if (s.tickCount - _lastBuyTick > 10) {
      const price = gpuPrice();
      // Tune to targetEfficiency: don't reach quite as far as a human would.
      if (s.money > price / eff) {
        // Choose spec heuristically: training-bias if we have lots of idle GPUs,
        // inference-bias if revenue is the bottleneck.
        const idleCount = s.gpus.filter(g => !g.busyJobId).length;
        const inferCount = s.gpus.filter(g => g.spec === 'inference').length;
        let spec = 'general';
        if (s.gpus.length >= 4 && inferCount === 0) spec = 'inference';
        else if (idleCount > 2 && s.capabilityTier >= 1) spec = 'training';
        if (buyGpu(spec)) _lastBuyTick = s.tickCount;
      }
    }

    // 2. Auto-Researcher: keep a Pretraining run alive if we have idle GPUs.
    if (u['auto-researcher']
        && s.trainingRuns.length === 0
        && s.gpus.filter(g => !g.busyJobId).length >= 2
        && s.capabilityTier < (Game.tiers ? Game.tiers.length - 1 : 5)) {
      if (Game.training && Game.training.startPretrain) {
        try { Game.training.startPretrain(); } catch (e) { /* training.js may not expose */ }
      }
    }

    // 3. Auto-HR personnel ladder: promote roles aggressively per policy.
    if (u['auto-hr']) {
      if (s.tickCount - _lastPersonnelTick > 30) {
        const policy = s.autopilot.custom.personnelPolicy;
        const targetLevel = (policy === 'automate') ? 3 : 2; // frontier defaults to 'AI supervised'
        let promoted = 0;
        for (const p of s.personnel) {
          if (p.level < targetLevel) {
            p.level++;
            promoted++;
            if (promoted >= 1) break; // one promotion per cooldown — visible, gradual
          }
        }
        if (promoted) {
          logAuto(`Auto-HR pushed a role up the automation ladder.`);
          // First-automation scripted beat: trip when first role goes >=2.
          if (Game.events && Game.events.scriptedBeat
              && s.personnel.some(p => p.level >= 2)
              && !s.stats.firstAutomationDay) {
            s.stats.firstAutomationDay = s.day;
            Game.events.scriptedBeat('first-automation');
          }
        }
        _lastPersonnelTick = s.tickCount;
      }
    }

    // 4. Auto-Strategist: hint to pivots.js to auto-accept low-risk pivots.
    if (u['auto-strategist']) {
      s.flags['frontier-auto-accept'] = true;
    }

    // 5. Reflective autopilot: nudge risk posture up when pressures are healthy.
    if (u['reflective'] && s.tickCount - _lastReflectiveTick > 200) {
      const cust = s.autopilot.custom;
      if (s.trust > 70 && s.control > 70 && cust.riskPosture < 0.85) {
        cust.riskPosture = Math.min(0.9, cust.riskPosture + 0.05);
        logAuto(`Reflective: raised risk posture to ${cust.riskPosture.toFixed(2)}.`);
      }
      _lastReflectiveTick = s.tickCount;
    }
  }

  // 'wait' — only trivial maintenance. Used as the new-player default.
  function tickWait() {
    // Intentionally minimal: maintain. Auto-OM passive money is handled in sim.
  }

  // 'custom' — read state.autopilot.custom and behave accordingly.
  function tickCustom() {
    const s = Game.state;
    const cust = s.autopilot.custom;
    const u = s.autopilot.unlocks;

    // Risk posture above 0.6 → frontier-flavored
    if (cust.riskPosture >= 0.6 && pressuresOk(cust)) {
      tickFrontier();
      return;
    }
    // Risk posture below 0.4 OR pressures sliding → safe-flavored
    if (cust.riskPosture < 0.4 || !pressuresOk(cust)) {
      tickSafe();
      return;
    }

    // Mid-range "balanced" mode: lazy-buy, don't promote, no auto-pivots.
    if (s.tickCount - _lastBuyTick > 25) {
      const price = gpuPrice();
      const alloc = cust.spendingAlloc || { capability: 0.4, deployment: 0.3, safety: 0.3 };
      // Reserve money in proportion to allocation; only spend the "capability"
      // bucket on GPUs from autopilot. (Deployment/safety would route through
      // upgrades.js if/when we wire that.)
      const budget = s.money * (alloc.capability || 0.4);
      if (budget > price) {
        if (buyGpu('general')) _lastBuyTick = s.tickCount;
      }
    }

    // Personnel policy flags so personnel.js / pivots.js can read them.
    if (u['auto-hr']) {
      const policy = cust.personnelPolicy;
      if (policy && policy !== 'manual' && s.tickCount - _lastPersonnelTick > 50) {
        const target = ({ human: 0, mixed: 1, automate: 3 })[policy] ?? 1;
        let changed = 0;
        for (const p of s.personnel) {
          if (p.level !== target) {
            p.level = p.level < target ? p.level + 1 : p.level - 1;
            changed++;
          }
          if (changed >= 1) break;
        }
        if (changed) logAuto(`Auto-HR adjusted a role toward "${policy}".`);
        _lastPersonnelTick = s.tickCount;
      }
    }
  }

  /* ---------- public tick ---------- */
  function tick() {
    if (!Game.state) return;
    if (Game.state.runEnded) return;
    if (Game.state.pendingDecision) return; // halts during decision-required gates

    const preset = Game.state.autopilot.preset;
    switch (preset) {
      case 'safe':     return tickSafe();
      case 'frontier': return tickFrontier();
      case 'wait':     return tickWait();
      case 'custom':   return tickCustom();
      default:         return tickWait();
    }
  }

  return {
    setPreset,
    tick,
    unlock,
    isAvailable,
  };
})();
