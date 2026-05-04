/* personnel.js — Personnel hiring + the automation curve.
   Implements the role escalation ladder per design spec §3:
     level 0 Human -> 1 Human + AI assistant -> 2 AI supervised -> 3 Fully autonomous
   Also fires the three scripted thematic beats:
     1. First automation (Vend moment)
     2. More auto-roles than human ones (mid-run inflection)
     3. The last human (late-run named moment)

   sim.js does most of the per-tick pressure math (productivity multipliers
   on capability/control/dependence are applied there from state.personnel).
   This module owns: hiring/firing, automation level promotion, salaries,
   cash-crisis detection, and the scripted beats. */

window.Game = window.Game || {};

Game.personnel = (function() {

  /* ---------- helpers ---------- */

  function archCapMod(state) {
    if (Game.archetypes && state.archetypeId && Game.archetypes[state.archetypeId]) {
      return Game.archetypes[state.archetypeId].capabilityMod || 1;
    }
    return 1;
  }

  function findRole(roleKey) {
    if (Game.personnelData && Array.isArray(Game.personnelData.roles)) {
      return Game.personnelData.roles.find(r =>
        r.key === roleKey ||
        r.name === roleKey ||
        r.id === roleKey
      ) || null;
    }
    return null;
  }

  function autoUnlockedFor(level) {
    /* Each automation level requires the corresponding autopilot unlock chain.
       (Auto-OM is the on-ramp; thereafter Auto-HR opens roster automation.) */
    const s = Game.state;
    if (!s) return false;
    if (level <= 0) return true;
    /* level 1+ promoting requires auto-hr scope OR is being done manually (cost-paid). */
    return true;   // promotion is manual / paid; gating is by money, not unlocks
  }

  /* ---------- API: hire ---------- */

  function hire(roleKey) {
    const s = Game.state;
    if (!s) return null;
    const role = findRole(roleKey);
    const cost = (role && Game.personnelData && Game.personnelData.hireCost)
      ? Game.personnelData.hireCost(role.key, s)
      : ((role && role.baseCost) ? role.baseCost : Game.config.personnel.hiringCost);

    if (s.money < cost) {
      Game.addLog(`Cannot hire ${role ? role.name : roleKey}: need $${cost}, have $${Math.floor(s.money)}.`, 'warn');
      return null;
    }

    /* If Auto-HR is "manual" only and autopilot's auto-hr is engaged
       and policy is auto, the player should not be hand-hiring (just a soft
       guard — autopilot itself calls this same fn). */
    s.money -= cost;
    /* Founder energy spend — hiring takes time. Defensive: if the founder
       module is absent or returns false, we still complete the hire — the
       cost was already paid. */
    if (Game.founder && Game.founder.spendEnergy) {
      Game.founder.spendEnergy(5, 'hire');
    }
    const p = Game.addPersonnel(role ? role.name : roleKey, 0);
    /* Roll 1-2 quirks for the new hire (defensive: only if the data
       module is present). */
    if (Game.personnelQuirks && Game.personnelQuirks.rollFor && role) {
      Game.personnelQuirks.rollFor(role.key, p);
    } else {
      p.quirks = p.quirks || [];
    }
    /* Surface the rolled personality in the hire log. */
    let quirkSuffix = '';
    if (Array.isArray(p.quirks) && p.quirks.length && Game.personnelQuirks && Game.personnelQuirks.byId) {
      const names = p.quirks
        .map(qid => Game.personnelQuirks.byId(qid))
        .filter(q => q)
        .map(q => q.name);
      if (names.length) quirkSuffix = ` — ${names.join(', ')}`;
    }
    Game.addLog(`Hired ${p.name} as ${p.role}${quirkSuffix}. ($${cost})`, '');
    /* Founder traits with hire trigger get a chance to react (e.g. Mentor,
       Tightfisted, Recruiter). Pass cost so traits can refund / scale. */
    if (Game.founder && Game.founder.applyTraitEffects) {
      Game.founder.applyTraitEffects('hire', { cost: cost, person: p });
    }
    /* Re-check beats after roster change */
    scriptedBeats();
    return p;
  }

  /* ---------- API: fire ---------- */

  function fire(personnelId) {
    const s = Game.state;
    if (!s) return false;
    const idx = s.personnel.findIndex(p => p.id === personnelId);
    if (idx < 0) return false;
    const p = s.personnel[idx];
    s.personnel.splice(idx, 1);
    Game.addLog(`${p.name} (${p.role}) is no longer with the lab.`, '');
    scriptedBeats();
    return true;
  }

  /* ---------- API: promoteAutomation ---------- */

  function promoteAutomation(personnelId) {
    const s = Game.state;
    if (!s) return false;
    const p = s.personnel.find(x => x.id === personnelId);
    if (!p) return false;
    if (p.level >= 3) {
      Game.addLog(`${p.name} is already fully autonomous.`, '');
      return false;
    }
    const cost = Math.floor(Game.config.personnel.hiringCost / 2);
    if (s.money < cost) {
      Game.addLog(`Need $${cost} to upgrade ${p.name}'s tooling.`, 'warn');
      return false;
    }
    if (!autoUnlockedFor(p.level + 1)) {
      Game.addLog(`Automation tier ${p.level + 1} not yet available.`, 'warn');
      return false;
    }

    s.money -= cost;
    const wasHuman = (p.level === 0);
    p.level += 1;

    const ladder = [
      'Human',
      'Human + AI assistant',
      'AI agent supervised by human',
      'Fully autonomous AI',
    ];
    Game.addLog(`${p.name} (${p.role}) → ${ladder[p.level]}.`, p.level >= 3 ? 'tier' : '');

    /* Track first-automation day if relevant */
    if (wasHuman && p.level >= 2 && !s.stats.firstAutomationDay) {
      s.stats.firstAutomationDay = s.day;
    }

    /* Track last-human day — if this promotion drained the last level-0 staffer */
    const remainingHumans = s.personnel.filter(x => x.level === 0).length;
    if (remainingHumans === 0 && !s.stats.lastHumanDay) {
      s.stats.lastHumanDay = s.day;
    }

    scriptedBeats();
    return true;
  }

  /* ---------- API: tick ---------- */

  function tick() {
    const s = Game.state;
    if (!s) return;
    /* Salaries */
    const salary = totalSalaryPerTick();
    s.money -= salary;

    /* Cash-crisis surveillance — if money is negative for too many ticks
       in a row, surface a decision-required gate. */
    if (s.money < 0) {
      s._cashCrisisTicks = (s._cashCrisisTicks || 0) + 1;
      if (s._cashCrisisTicks === 1) {
        Game.addLog(`Payroll is in the red. We need revenue or layoffs.`, 'warn');
      }
      if (s._cashCrisisTicks > 60 && !s.flags['decision-cash-crisis'] && !s.pendingDecision) {
        s.flags['decision-cash-crisis'] = true;
        if (Game.events && Game.events.advise) {
          Game.events.advise('CFO', 'We have been running cash-negative too long. Something has to give — fire someone, take a loan, or push deployment.');
        }
      }
    } else if (s._cashCrisisTicks) {
      s._cashCrisisTicks = 0;
      if (s.flags['decision-cash-crisis']) {
        s.flags['decision-cash-crisis'] = false;
      }
    }

    /* Re-check thematic beats every few ticks (cheap; flags gate the work). */
    if ((s.tickCount % 10) === 0) scriptedBeats();
  }

  /* ---------- API: scriptedBeats ---------- */

  function scriptedBeats() {
    const s = Game.state;
    if (!s || !s.personnel) return;

    const humans = s.personnel.filter(p => p.level === 0).length;
    const autos = s.personnel.filter(p => p.level >= 2).length;

    /* Beat 1 — first automation (the Vend moment).
       Triggers when Auto-OM goes live or when *any* personnel reaches level >= 2. */
    if (!s.flags['beat-first-automation']) {
      const autoOmActive = !!s.flags['auto-om-active'] || !!s.stats.autoOmDeployed;
      if (autoOmActive || autos > 0) {
        s.stats.firstAutomationDay = s.stats.firstAutomationDay || s.day;
        if (Game.events && Game.events.firstAutomationBeat) {
          Game.events.firstAutomationBeat();
        } else if (Game.events && Game.events.scriptedBeat) {
          Game.events.scriptedBeat('first-automation');
        } else {
          s.flags['beat-first-automation'] = true;
          Game.addLog('Auto-OM v1 has ordered 4,000 units of grape soda. Pending review.', 'tier');
        }
      }
    }

    /* Beat 2 — mid-run inflection: more auto roles than human ones. */
    if (!s.flags['beat-more-auto-than-human'] && !s.flags['beat-auto-majority'] && s.personnel.length >= 3 && autos > humans) {
      if (Game.events && Game.events.scriptedBeat) {
        Game.events.scriptedBeat('more-auto-than-human');
      } else {
        s.flags['beat-more-auto-than-human'] = true;
        s.flags['beat-auto-majority'] = true;
        Game.addLog('Your office is quieter than it used to be.', 'tier');
      }
    }

    /* Beat 3 — the last human (other than the founder). */
    if (!s.flags['beat-last-human'] && s.personnel.length > 0 && humans === 0) {
      s.stats.lastHumanDay = s.stats.lastHumanDay || s.day;
      s.flags['last-human-replaced'] = true;
      if (Game.events && Game.events.scriptedBeat) {
        Game.events.scriptedBeat('last-human');
      } else {
        s.flags['beat-last-human'] = true;
        Game.addLog('The last human role has been swapped. Only you remain at a desk now.', 'tier');
      }
    }
  }

  /* ---------- API: productivityFor ---------- */

  function productivityFor(roleOrPerson) {
    /* Accepts either a personnel object {role, level} or just a level number. */
    let level = 0;
    if (typeof roleOrPerson === 'number') {
      level = roleOrPerson;
    } else if (roleOrPerson && typeof roleOrPerson === 'object') {
      level = (typeof roleOrPerson.level === 'number') ? roleOrPerson.level : 0;
    }
    const base = Game.config.personnel.productivityMult[level];
    const m = (typeof base === 'number') ? base : 1;
    return m * (Game.state ? archCapMod(Game.state) : 1);
  }

  /* ---------- API: totalSalaryPerTick ---------- */

  function totalSalaryPerTick() {
    const s = Game.state;
    if (!s) return 0;
    const sal = Game.config.personnel.salaryPerTick;
    let total = 0;
    for (const p of s.personnel) {
      total += sal[p.level] || 0;
    }
    return total;
  }

  /* ---------- API: allQuirks ---------- */

  /* Flat array of every active quirk metadata across the team. Used by
     the office scene's chemistry panel and by autopilot heuristics. */
  function allQuirks(state) {
    state = state || Game.state;
    if (!state || !Array.isArray(state.personnel)) return [];
    if (!Game.personnelQuirks || !Game.personnelQuirks.byId) return [];
    const out = [];
    for (const p of state.personnel) {
      if (!Array.isArray(p.quirks)) continue;
      for (const qid of p.quirks) {
        const q = Game.personnelQuirks.byId(qid);
        if (q) out.push(q);
      }
    }
    return out;
  }

  /* ---------- expose ---------- */

  return {
    hire,
    fire,
    promoteAutomation,
    tick,
    scriptedBeats,
    productivityFor,
    totalSalaryPerTick,
    allQuirks,
  };

})();
