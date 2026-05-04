/* income.js — Per-archetype primary income hooks.
   Each archetype's "money loop" is shaped by its real-world flavor:
     frontier   — VC seed + monthly investor checkpoints
     safety     — recurring research grants scaled by interp coverage
     opensource — Community Compute meter that grows with releases
     research   — publications from architecture / tier-up; lab grant trickle
   Routed every tick from sim.js after the inference-GPU revenue line.
   Defensive: sim.js calls Game.income.tick() only if this module loaded. */

window.Game = window.Game || {};

Game.income = (function () {

  /* ---- timing helpers ---- */
  // 1 in-game day = 20 ticks (daysPerTick = 0.05). Keep these derived.
  function ticksPerDay() {
    return Math.max(1, Math.round(1 / (Game.config.daysPerTick || 0.05)));
  }
  function daysSince(tickCount, lastTick) {
    return (tickCount - (lastTick || 0)) * (Game.config.daysPerTick || 0.05);
  }

  /* ============================================================
     FRONTIER — VC money
     ============================================================ */
  const frontier = {
    tick(s) {
      // Day-5 promised seed round (one-shot, post-opening).
      if (!s.flags['income-frontier-seed-paid'] && s.day >= 5) {
        s.money += 1500;
        s.stats.totalRevenue += 1500;
        s.flags['income-frontier-seed-paid'] = true;
        Game.addLog('Seed round wired: +$1500 from OpenLight VC.', 'tier');
        Game.events.scriptedBeat('income-frontier-first', {
          beat: {
            author: 'Sarah · OpenLight VC',
            msg: "Wired. Don't waste it. We expect a capability bump every quarter, or your next term sheet gets ugly.",
          },
        });
      }

      // Continuous runway burn-rate offset.
      if (s.flags['income-frontier-seed-paid']) {
        const trickle = 2.5;   // $/tick continuous; "monthly investor checkpoint"
        s.money += trickle;
        s.stats.totalRevenue += trickle;
      }

      // Every 60 in-game days: capability milestone check.
      if (!s.flags['income-frontier-seed-paid']) return;
      if (!s.archetypeData) s.archetypeData = {};
      if (s.archetypeData.lastVcCheckpointCapability === undefined) {
        s.archetypeData.lastVcCheckpointCapability = s.capability;
        s.lastVcCheckpointTick = s.tickCount;
      }
      const elapsedDays = daysSince(s.tickCount, s.lastVcCheckpointTick);
      if (elapsedDays >= 60) {
        const gain = s.capability - (s.archetypeData.lastVcCheckpointCapability || 0);
        // Required capability gain over 60 days scales modestly with current tier.
        const required = 40 + s.capabilityTier * 60;
        if (gain >= required) {
          s.money += 600;   // bonus tranche on milestone hit
          s.stats.totalRevenue += 600;
          Game.addLog(`Investor checkpoint cleared (+${gain.toFixed(0)} cap). Bonus tranche +$600.`, 'tier');
          Game.events.advise('Sarah · OpenLight VC', 'Numbers look good. Tranche cleared. Keep shipping.');
        } else {
          s.trust = Math.max(0, s.trust - 10);
          Game.addLog(`Missed milestone (${gain.toFixed(0)}/${required} cap). Trust -10.`, 'major');
          Game.events.advise('Sarah · OpenLight VC', 'Missed your milestone. Investors are nervous. Fix this before next quarter.');
        }
        s.archetypeData.lastVcCheckpointCapability = s.capability;
        s.lastVcCheckpointTick = s.tickCount;
      }
    },
  };

  /* ============================================================
     SAFETY-FIRST — Foundation grant
     ============================================================ */
  const safety = {
    tick(s) {
      if (s.lastGrantTick === undefined || s.lastGrantTick === 0) {
        // First grant lands ~5 days in so the player feels the beat.
        s.lastGrantTick = s.tickCount - (ticksPerDay() * 25);
      }
      const elapsedDays = daysSince(s.tickCount, s.lastGrantTick);
      if (elapsedDays >= 30) {
        const coverage = (Game.upgrades && Game.upgrades.coverage)
          ? Game.upgrades.coverage('interpretability') : 0;
        // Base grant scales with coverage; cap to keep things sane.
        const payout = Math.min(2400, 1200 * (1 + coverage));
        s.money += payout;
        s.stats.totalRevenue += payout;
        s.lastGrantTick = s.tickCount;
        Game.addLog(`Quarterly safety grant cleared: +$${payout.toFixed(0)}.`, 'tier');
        if (!s.flags['beat-income-safety-first']) {
          Game.events.scriptedBeat('income-safety-first', {
            beat: {
              author: 'Council on Long-Term Risk',
              msg: 'Q1 disbursement cleared. Keep publishing safety work — coverage is what we pay for.',
            },
          });
        } else {
          Game.events.advise('Council on Long-Term Risk', `Disbursement cleared (+$${payout.toFixed(0)}).`);
        }
      }

      // Big-E periodic stream support, tied to good Trust state.
      // Roll once per ~20 days; only if trust is healthy and not already paid recently.
      if (s.tickCount % (ticksPerDay() * 20) === 0 && s.tickCount > 0) {
        if (s.trust >= 70 && Math.random() < 0.5) {
          s.money += 200;
          s.stats.totalRevenue += 200;
          Game.addLog('Big-E stream raised +$200 for safety work.', '');
          Game.events.advise('Big-E', 'Streamed for you tonight. Audience pitched in. Keep it up.');
        }
      }

      // Tiny continuous baseline so day-to-day isn't $0/tick.
      const trickle = 1.5;
      s.money += trickle;
      s.stats.totalRevenue += trickle;
    },
  };

  /* ============================================================
     OPEN SOURCE — Community Compute meter
     ============================================================ */
  const opensource = {
    tick(s) {
      if (!s.archetypeData) s.archetypeData = {};
      if (typeof s.communityCompute !== 'number') s.communityCompute = 0;

      // Detect new releases: post-training run completion bumps releasesShipped
      // (we track via stats + a snapshot). Also detect open-source pivot.
      const ad = s.archetypeData;
      if (ad.lastSeenRunsCompleted === undefined) ad.lastSeenRunsCompleted = s.stats.runsCompleted || 0;
      const runsNow = s.stats.runsCompleted || 0;
      if (runsNow > ad.lastSeenRunsCompleted) {
        const newRuns = runsNow - ad.lastSeenRunsCompleted;
        s.communityCompute += 25 * newRuns;
        ad.releasesShipped = (ad.releasesShipped || 0) + newRuns;
        Game.addLog(`Release shipped — Community Compute meter +${(25 * newRuns).toFixed(0)}.`, '');
        ad.lastSeenRunsCompleted = runsNow;
      }
      if (s.flags['open-source-released'] && !s.flags['income-os-pivot-bonus']) {
        s.communityCompute += 60;
        s.flags['income-os-pivot-bonus'] = true;
        Game.addLog('Open-source release: Community Compute meter +60.', 'pivot');
      }

      // Slow organic growth from solo-founder commits.
      s.communityCompute += 0.05;

      // Meter bleeds into money + passive Compute.
      const moneyPerTick = 0.2 * s.communityCompute;
      const computePerTick = 0.3 * s.communityCompute;
      s.money += moneyPerTick;
      s.stats.totalRevenue += moneyPerTick;
      s.compute += computePerTick;
      s.stats.totalCompute += computePerTick;

      // Meter erodes slowly so neglecting releases hurts.
      s.communityCompute = Math.max(0, s.communityCompute - 0.02);

      // 100-unit milestones — one-shot $500 each.
      if (ad.lastMilestone === undefined) ad.lastMilestone = 0;
      const tier100 = Math.floor(s.communityCompute / 100);
      if (tier100 > ad.lastMilestone) {
        const tiers = tier100 - ad.lastMilestone;
        s.money += 500 * tiers;
        s.stats.totalRevenue += 500 * tiers;
        ad.lastMilestone = tier100;
        Game.addLog(`Community Compute hit ${tier100 * 100}. GitHub Sponsors +$${500 * tiers}.`, 'tier');
        if (!s.flags['beat-income-opensource-first']) {
          Game.events.scriptedBeat('income-opensource-first', {
            beat: {
              author: 'GitHub Sponsors',
              msg: "Three new tiers. Some of them are companies that probably shouldn't be here.",
            },
          });
        } else {
          Game.events.advise('GitHub Sponsors', `Sponsors hit a new tier. +$${500 * tiers}.`);
        }
      }
    },
  };

  /* ============================================================
     RESEARCH LAB — Publications + decaying lab grant
     ============================================================ */
  const research = {
    tick(s) {
      if (!s.archetypeData) s.archetypeData = {};
      const ad = s.archetypeData;

      // Detect new paradigm shifts → publication.
      if (ad.lastSeenParadigms === undefined) ad.lastSeenParadigms = s.paradigms.length;
      if (s.paradigms.length > ad.lastSeenParadigms) {
        const fresh = s.paradigms.length - ad.lastSeenParadigms;
        s.money += 700 * fresh;
        s.capability += 5 * fresh;
        s.stats.totalRevenue += 700 * fresh;
        ad.lastSeenParadigms = s.paradigms.length;
        ad.prestige = (ad.prestige || 0) + 1;
        s.lastPublicationTick = s.tickCount;
        Game.addLog(`Publication accepted (+$${700 * fresh}, +${5 * fresh} cap).`, 'tier');
        if (!s.flags['beat-income-research-first']) {
          Game.events.scriptedBeat('income-research-first', {
            beat: {
              author: 'Lambda Quarterly Editor',
              msg: 'Accepted. With minor revisions, but yeah. Keep these coming.',
            },
          });
        } else {
          Game.events.advise('Lambda Quarterly Editor', 'Another acceptance. The committee is watching.');
        }
      }

      // Detect new tier-up → publication too.
      if (ad.lastSeenTier === undefined) ad.lastSeenTier = s.capabilityTier;
      if (s.capabilityTier > ad.lastSeenTier) {
        s.money += 700;
        s.capability += 5;
        s.stats.totalRevenue += 700;
        ad.lastSeenTier = s.capabilityTier;
        ad.prestige = (ad.prestige || 0) + 1;
        s.lastPublicationTick = s.tickCount;
        Game.addLog('Tier-up publication: +$700, +5 cap.', 'tier');
      }

      // Continuous lab grant — decays if no paradigm shift in 90 days.
      const daysSincePub = daysSince(s.tickCount, s.lastPublicationTick || 0);
      // Grant scales from full ($1.5/tick) down to $0 over the 90-day window.
      const decay = Math.max(0, 1 - daysSincePub / 90);
      const grant = 1.5 * decay;
      s.money += grant;
      s.stats.totalRevenue += grant;

      // Obsolescence flavor warning at 60 days idle.
      if (daysSincePub > 60 && !s.flags['research-grant-warned']) {
        s.flags['research-grant-warned'] = true;
        Game.events.advise('Lambda Quarterly Editor', 'Long stretch with no publications. Grant committee is asking questions.');
      }
      if (daysSincePub <= 30 && s.flags['research-grant-warned']) {
        delete s.flags['research-grant-warned'];   // re-arm warning after recovery
      }
    },
  };

  /* ============================================================
     Public tick — routed by sim.js
     ============================================================ */
  const archetypes = { frontier, safety, opensource, research };

  function tick() {
    const s = Game.state;
    if (!s || s.runEnded || s.pendingDecision) return;
    const id = s.archetypeId;
    if (!id) return;
    const handler = archetypes[id];
    if (handler && handler.tick) {
      try { handler.tick(s); }
      catch (e) { console.error('Income handler failed:', id, e); }
    }
  }

  return {
    tick,
    archetypes,
    // expose for unit-testing or future content
    triggers: {},
  };
})();
