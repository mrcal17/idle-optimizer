/* discovery.js — Progressive disclosure of UI elements.

   The game grows as the player learns it. New runs start sparse: just a
   tap target, Compute, and Day. Each new piece of UI surfaces in response
   to a concrete in-game moment — earning your first dollar reveals
   Capital; reaching Ember reveals the news ticker; and so on.

   Owns:
     - Game.discovery.check(state)        — called every tick by sim
     - Game.discovery.reveal(id)          — sets the flag, mutates DOM, logs
     - Game.discovery.reset()             — clears DOM hidden classes on new run
     - Game.discovery.upgradesVisible(s)  — used by operations scene

   No state-shape changes: everything is stored under state.flags using
   the 'discovered-*' prefix, so save/load stays trivially compatible.
*/

window.Game = window.Game || {};

Game.discovery = (function() {

  /* ---------- DOM-effect table ----------------------------------- */
  /* Each id maps to: which DOM elements to show, an advisor beat to play
     once, and a soft log line. Keep messages under 90 chars. */
  const REVEALS = {
    // HUD stats
    'hud-compute':   { hudStatId: 'hud-compute' }, // visible from start; here for symmetry
    'hud-day':       { hudStatId: 'hud-day' },
    'hud-money':     {
      hudStatId: 'hud-money',
      advisor: { author: 'CFO', msg: "Money exists. Now you know." },
      log: 'Capital tracked. The CFO has a spreadsheet.',
    },
    'hud-capability':{
      hudStatId: 'hud-capability',
      advisor: { author: 'Senior PI', msg: "Capability is something we can measure now. Roughly." },
      log: 'Capability tracked. The eval scores have started landing.',
    },

    // Top-bar features
    'ticker':        {
      elementId: 'ticker',
      log: 'The news ticker turns on. The world has noticed the lab.',
    },

    // Scenes
    'scene-operations': {
      navScene: 'operations',
      advisor: { author: 'COO', msg: "I've made you a control panel. Try not to break it." },
      log: 'Operations scene unlocked. Autopilot, training, GPU specialization, upgrades.',
    },
    'scene-office': {
      navScene: 'office',
      log: 'Office unlocked. The lab has more than just you now.',
    },
    'scene-world': {
      navScene: 'world',
      log: 'World view unlocked. Your deployments have a footprint.',
    },
    'scene-logs': {
      navScene: 'logs',
      log: 'Logs unlocked. There is enough history to look back on.',
    },

    // Desk panels
    'desk-pressures':  {
      elementId: 'desk-pressures',
      advisor: { author: 'Comms Lead', msg: "People have feelings about labs like ours." },
      log: 'Pressures panel surfaced. Trust, Control, Dependence — three dials to watch.',
    },

    // First Compute beat (just a flavor moment, no element to show)
    'first-compute': {
      advisor: { author: 'COO', msg: "That counts as a billable hour. Don't ask whose." },
    },
  };

  /* Branches whose teasers might be revealed mid-run. */
  const ALL_BRANCHES = ['capability', 'deployment', 'safety', 'operations',
                        'race-posture', 'interp-stack', 'ecosystem', 'prestige'];
  const UNIVERSAL_BRANCHES = ['capability', 'deployment', 'safety', 'operations'];
  const EXCLUSIVE_BRANCHES = ['race-posture', 'interp-stack', 'ecosystem', 'prestige'];

  /* ---------- helpers -------------------------------------------- */
  function flag(id) { return 'discovered-' + id; }
  function isRevealed(id) {
    return !!(Game.state && Game.state.flags && Game.state.flags[flag(id)]);
  }

  function archetypeHints(state) {
    if (!state || !state.archetypeId) return {};
    const arch = (Game.archetypes && Game.archetypes[state.archetypeId]) || null;
    return (arch && arch.revealHints) ? arch.revealHints : {};
  }

  /* ---------- reveal --------------------------------------------- */
  function reveal(id) {
    const s = Game.state;
    if (!s) return;
    if (s.flags[flag(id)]) return; // already revealed
    s.flags[flag(id)] = true;

    const cfg = REVEALS[id];
    if (!cfg) return;

    // Show a HUD stat
    if (cfg.hudStatId) {
      const node = document.getElementById(cfg.hudStatId);
      if (node) {
        const stat = node.closest('.hud-stat');
        if (stat) stat.classList.remove('hud-stat-hidden');
      }
    }
    // Show a generic element by id (ticker, panel, etc.)
    if (cfg.elementId) {
      const el = document.getElementById(cfg.elementId);
      if (el) {
        el.classList.remove('hidden');
        el.classList.remove('hud-stat-hidden');
      }
    }
    // Unlock a scene-nav button
    if (cfg.navScene) {
      const btn = document.querySelector('#scene-nav .nav-btn[data-scene="' + cfg.navScene + '"]');
      if (btn) {
        btn.classList.remove('locked');
        btn.classList.remove('nav-hidden');
      }
      // Mirror into scenesUnlocked so existing systems agree
      if (s.scenesUnlocked && !s.scenesUnlocked[cfg.navScene]) {
        s.scenesUnlocked[cfg.navScene] = true;
      }
      if (Game.ui && Game.ui.refreshNav) Game.ui.refreshNav();
    }

    // Soft log
    if (cfg.log) Game.addLog(cfg.log, 'discovery');
    // Advisor beat — flag-gated so it only ever fires once per id
    if (cfg.advisor && Game.events && Game.events.advise) {
      Game.events.advise(cfg.advisor.author, cfg.advisor.msg);
    }
    // App-install beat — for scene reveals, fire an in-character "boot"
    // log line tied to the dock app id. One-shot per appId via flag.
    maybeAppInstalledLog(id);
  }

  /* When a scene-* is revealed, the corresponding dock app is now
     "installed." Add a single in-character log line per app, gated by
     a flag so it only ever fires once per run. */
  const APP_INSTALL_LOGS = {
    'scene-operations': {
      appId: 'train',
      line: 'TRAIN.app installed. /usr/local/bin/foundry --train is now in your PATH.',
    },
    'scene-office': {
      appId: 'team',
      line: 'TEAM.app installed. The corkboard is now syncing.',
    },
    'scene-world': {
      appId: 'wire',
      line: 'WIRE.app installed. Outbound network: enabled. The world can see you now.',
    },
    'scene-logs': {
      appId: 'logs',
      line: 'LOGS.app installed. The logs were always being written. Now you can read them.',
    },
  };
  function maybeAppInstalledLog(revealId) {
    const entry = APP_INSTALL_LOGS[revealId];
    if (!entry) return;
    const s = Game.state;
    if (!s) return;
    const installFlag = 'app-installed-' + entry.appId;
    if (s.flags[installFlag]) return;
    s.flags[installFlag] = true;
    Game.addLog(entry.line, 'discovery');
  }

  /* ---------- per-tick check ------------------------------------- */
  function check() {
    const s = Game.state;
    if (!s) return;
    const hints = archetypeHints(s);

    /* Pacing intent: the game starts at *one button* and ladders up.
       Earlier rules let too much surface immediately; these are slower
       and tied to in-game effort, not just to the starting kit. The
       archetype-specific hints can override for narrative reasons. */

    // First compute earned (advisor flavor only)
    if (!isRevealed('first-compute') && s.compute >= 1) {
      reveal('first-compute');
    }

    // Capital — reveals only after the player has *earned* meaningful
    // money (above starting kit), or completed at least one day-cycle.
    if (!isRevealed('hud-money')) {
      if (s.flags['_discovery-money-baseline'] === undefined) {
        s.flags['_discovery-money-baseline'] = s.money;
      }
      const baseline = s.flags['_discovery-money-baseline'];
      const earned = (s.stats && s.stats.totalRevenue > 0);
      const cycled = (s.dayCardsTaken && s.dayCardsTaken.length > 0);
      if (earned || cycled || (s.money - baseline) >= 25) {
        reveal('hud-money');
      }
    }

    // Capability — reveals only after meaningful accumulation, not the
    // first 0.5 of passive trickle.
    if (!isRevealed('hud-capability') && s.capability >= 8) {
      reveal('hud-capability');
    }

    // Ticker — reveals at tier 1 (Ember). The world hasn't noticed you yet.
    if (!isRevealed('ticker') && s.capabilityTier >= 1) {
      reveal('ticker');
    }

    // Pressures panel — only at tier 1 OR after a real incident, not just
    // because the archetype shipped with a hire. (Frontier was instant.)
    if (!isRevealed('desk-pressures')) {
      const hadIncident = !!(s.stats && s.stats.incidentCount > 0);
      const hadPivot = !!(s.stats && s.stats.pivotCount > 0);
      if (hints.pressuresFromStart ||
          s.capabilityTier >= 1 ||
          hadIncident || hadPivot) {
        reveal('desk-pressures');
      }
    }

    // Operations / TRAIN.app — earned, not handed.
    // Requires day >= 3 AND meaningful compute, OR first tier-up, OR archetype hint.
    if (!isRevealed('scene-operations')) {
      const earnedOps = (s.day >= 3 && s.compute >= 25);
      if (hints.operationsFromStart || earnedOps || s.capabilityTier >= 1) {
        reveal('scene-operations');
      }
    }

    // Office / TEAM.app — only after the player makes a hire (or buys a
    // GPU) of their own — past the starting roster. Tracks via stats.
    if (!isRevealed('scene-office')) {
      const startingRoster = s.flags['_discovery-roster-baseline'];
      if (startingRoster === undefined) {
        s.flags['_discovery-roster-baseline'] = (s.personnel || []).length;
      }
      const grewRoster = (s.personnel || []).length > (s.flags['_discovery-roster-baseline'] || 0);
      const tieredUp = s.capabilityTier >= 1;
      if (grewRoster || tieredUp || (s.scenesUnlocked && s.scenesUnlocked.office === 'manual')) {
        reveal('scene-office');
      }
    }
    // World
    if (!isRevealed('scene-world')) {
      if (s.scenesUnlocked && s.scenesUnlocked.world) {
        reveal('scene-world');
      }
    }
    // Logs
    if (!isRevealed('scene-logs')) {
      if (s.scenesUnlocked && s.scenesUnlocked.logs) {
        reveal('scene-logs');
      }
    }

    // Branch teaser reveals — when a paradigm or major event lands, we
    // surface a soft log line so the next render shows one more teaser.
    maybeRevealBranchHint();
  }

  /* When the player gains a paradigm or pivot completes, drip-feed a
     "New tooling discovered" log message exactly once per such event so
     subsequent renders of the upgrade tree feel responsive. */
  function maybeRevealBranchHint() {
    const s = Game.state;
    if (!s) return;
    // Trigger on first paradigm
    if (s.paradigms && s.paradigms.length && !s.flags['_discovery-paradigm-1']) {
      s.flags['_discovery-paradigm-1'] = true;
      Game.addLog('New tooling discovered. Check Operations for fresh research branches.', 'discovery');
    }
    // Trigger on first pivot resolved
    if (s.stats && s.stats.pivotCount > 0 && !s.flags['_discovery-pivot-1']) {
      s.flags['_discovery-pivot-1'] = true;
      Game.addLog('A pivot has reshaped the tree. New branches are surfacing.', 'discovery');
    }
  }

  /* ---------- upgradesVisible ------------------------------------ */
  /* Returns { visible: [upgrade], teasers: [{branch, label}] }
     - visible: upgrades the player can see. Either they own one in the
       branch already, the branch is universal, or it's their archetype's
       exclusive branch.
     - teasers: one "???" placeholder per hidden branch.
  */
  function upgradesVisible(state) {
    state = state || Game.state;
    const result = { visible: [], teasers: [] };
    if (!state || !Game.upgrades || !Game.upgrades.list) return result;

    const arch = state.archetypeId ? Game.archetypes[state.archetypeId] : null;
    const ownedBranches = new Set();
    for (const id in state.upgrades) {
      if (!state.upgrades[id]) continue;
      const u = Game.upgrades.byId(id);
      if (u) ownedBranches.add(u.branch);
    }

    function branchVisible(branch) {
      if (UNIVERSAL_BRANCHES.indexOf(branch) >= 0) return true;
      if (arch && arch.exclusiveBranch === branch) return true;
      if (ownedBranches.has(branch)) return true;
      return false;
    }

    // Tier-gate from the existing operations scene logic, kept identical.
    const tierFiltered = Game.upgrades.list.filter(u => {
      if ((u.requireTier || 0) > state.capabilityTier + 1) return false;
      if (EXCLUSIVE_BRANCHES.indexOf(u.branch) >= 0) {
        if (!arch || arch.exclusiveBranch !== u.branch) return false;
      }
      return true;
    });

    for (const u of tierFiltered) {
      // Within visible-branch upgrades, show items the player either
      // owns, can buy now, or has a previous purchase in the same branch.
      const isOwned = !!state.upgrades[u.id];
      const canBuy = Game.upgrades.canPurchase
        ? Game.upgrades.canPurchase(u.id, state).ok
        : false;
      const branchOpen = branchVisible(u.branch);
      const sameBranchOwned = ownedBranches.has(u.branch);
      if (branchOpen && (isOwned || canBuy || sameBranchOwned ||
                         UNIVERSAL_BRANCHES.indexOf(u.branch) >= 0 ||
                         (arch && arch.exclusiveBranch === u.branch))) {
        result.visible.push(u);
      }
    }

    // One teaser per hidden branch (only branches the player could
    // eventually unlock — i.e. the archetype's exclusive one, if not yet
    // owned). For non-archetype exclusive branches we don't tease — the
    // player will never see them this run.
    if (arch && arch.exclusiveBranch && !ownedBranches.has(arch.exclusiveBranch)) {
      // The archetype's exclusive branch is always visible above (canBuy
      // path), so this teaser only fires if the tier gate hides it.
      const anyVisibleInBranch = result.visible.some(u => u.branch === arch.exclusiveBranch);
      if (!anyVisibleInBranch) {
        result.teasers.push({
          branch: arch.exclusiveBranch,
          label: '??? — keep growing the lab to discover this.',
        });
      }
    }

    return result;
  }

  /* ---------- reset ---------------------------------------------- */
  /* Called when a new run begins so the DOM doesn't carry over stale
     "revealed" classes from the previous run. Idempotent and defensive
     so repeated calls or missing nodes don't throw. */
  function reset() {
    // Hide HUD stats that should start hidden
    const initiallyHiddenStats = ['hud-money', 'hud-capability'];
    document.querySelectorAll('#hud .hud-stat').forEach(stat => {
      const inner = stat.querySelector('span:not(.hud-label)');
      if (!inner) return;
      if (initiallyHiddenStats.indexOf(inner.id) >= 0) {
        stat.classList.add('hud-stat-hidden');
      } else {
        stat.classList.remove('hud-stat-hidden');
      }
    });

    // Hide ticker
    const ticker = document.getElementById('ticker');
    if (ticker) ticker.classList.add('hidden');

    // Hide scene-nav buttons that should reveal progressively
    const initiallyHiddenScenes = ['operations', 'office', 'world', 'logs'];
    document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
      const sc = btn.dataset.scene;
      if (initiallyHiddenScenes.indexOf(sc) >= 0) {
        btn.classList.add('nav-hidden');
        btn.classList.add('locked');
      } else {
        btn.classList.remove('nav-hidden');
        btn.classList.remove('locked');
      }
    });
    if (Game.state && Game.state.scenesUnlocked) {
      initiallyHiddenScenes.forEach(sc => {
        Game.state.scenesUnlocked[sc] = false;
      });
    }
    document.querySelectorAll('#app-dock .dock-btn').forEach(btn => {
      const sc = btn.dataset.scene;
      if (initiallyHiddenScenes.indexOf(sc) >= 0) {
        btn.classList.add('dock-locked');
        btn.classList.remove('dock-just-unlocked');
      } else {
        btn.classList.remove('dock-locked');
      }
    });

    // Hide desk pressures panel
    const pressures = document.getElementById('desk-pressures');
    if (pressures) pressures.classList.add('hidden');
  }

  /* ---------- public --------------------------------------------- */
  return {
    check,
    reveal,
    reset,
    upgradesVisible,
    REVEALS,
  };
})();
