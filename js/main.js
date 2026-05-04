/* main.js — Boot orchestration. Runs after all modules are loaded. */

(function() {
  function boot() {
    // Populate archetype select screen
    Game.ui.populateArchetypeSelect();
    document.getElementById('archetype-select').classList.remove('hidden');

    document.getElementById('start-run-btn').addEventListener('click', () => {
      const archId = document.getElementById('archetype-grid').dataset.selected || 'frontier';
      const labName = document.getElementById('lab-name-input').value.trim() || 'Foundry Labs';
      const crest = document.getElementById('lab-crest-select').value || '⚙';
      const palette = document.getElementById('lab-palette-select').value || 'twilight';
      Game.startRun({ archId, labName, crest, palette });
    });

    document.getElementById('ending-restart').addEventListener('click', () => {
      Game.ui.closeOverlay('ending-overlay');
      // Hide game UI
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('ticker').classList.add('hidden');
      const legacyApp = document.getElementById('app');
      if (legacyApp) legacyApp.classList.add('hidden');
      const legacyNav = document.getElementById('scene-nav');
      if (legacyNav) legacyNav.classList.add('hidden');
      const ws = document.getElementById('workstation');
      if (ws) ws.classList.add('hidden');
      // Vitals widget belongs to a run — hide it on the archetype-select screen.
      if (Game.founder && Game.founder.hideVitals) Game.founder.hideVitals();
      // Show archetype select
      document.getElementById('archetype-select').classList.remove('hidden');
    });

    document.getElementById('ending-download-card').addEventListener('click', () => {
      if (Game.labcard && Game.labcard.download) Game.labcard.download();
    });

    document.getElementById('advisor-dismiss').addEventListener('click', () => {
      document.getElementById('advisor-overlay').classList.add('hidden');
    });

    const eodEndBtn = document.getElementById('eod-end-btn');
    if (eodEndBtn) {
      eodEndBtn.addEventListener('click', () => {
        if (Game.dayLoop && Game.dayLoop.endDay) Game.dayLoop.endDay();
      });
    }
  }

  Game.startRun = function(opts) {
    Game.state = Game.makeInitialState();
    if (Game.deployments && Game.deployments.reset) Game.deployments.reset();
    Game.state.archetypeId = opts.archId;
    /* Apply stage theme attribute on <html> immediately so even pre-cinematic
       UI reads the Garage palette. */
    if (Game.stages && Game.stages.applyTheme) Game.stages.applyTheme(Game.state.stage);
    Game.state.labName = opts.labName;
    Game.state.crest = opts.crest;
    Game.state.palette = opts.palette;
    Game.state.runStartedAt = Date.now();

    // Apply archetype starting kit
    const arch = Game.archetypes[opts.archId];
    if (arch && arch.defaultAutopilot) Game.state.autopilot.preset = arch.defaultAutopilot;
    if (arch && arch.applyStartingKit) arch.applyStartingKit(Game.state);
    Game.ui.applyArchetypePalette(arch);

    /* Founder character — pick portrait, reset energy/mood/traits, and
       reveal the always-visible vitals widget. Defensive against module
       absence so a partial load still boots. */
    if (Game.founder && Game.founder.init) Game.founder.init(Game.state);
    if (Game.founder && Game.founder.showVitals) Game.founder.showVitals();

    // Hide select, show game
    document.getElementById('archetype-select').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('ticker').classList.remove('hidden');
    // The new workstation replaces the old #app + #scene-nav surface;
    // the legacy nodes still exist (hidden) for back-compat.
    const ws = document.getElementById('workstation');
    if (ws) ws.classList.remove('hidden');
    const legacyApp = document.getElementById('app');
    if (legacyApp) legacyApp.classList.remove('hidden');
    const legacyNav = document.getElementById('scene-nav');
    if (legacyNav) legacyNav.classList.remove('hidden');
    // Boot the room (decay layer) + workstation router if loaded.
    if (Game.room && Game.room.init) Game.room.init();
    if (Game.workstation && Game.workstation.init) Game.workstation.init();

    // Boot UI subsystems
    Game.ui.boot();

    // Handlers (video-call NPCs) — wire option buttons + clear stale frame.
    if (Game.handlers && Game.handlers.init) Game.handlers.init();

    // Reset progressive-disclosure state (clears any stale hidden classes
    // from a previous run and re-hides the elements this run has yet to
    // earn). Defensive against the module being absent.
    if (Game.discovery && Game.discovery.reset) Game.discovery.reset();

    // Show desk by default
    Game.ui.showScene('desk');

    // First end-of-day shouldn't fire on day 1 — give the player room to breathe.
    if (Game.dayLoop && Game.dayLoop.initFor) Game.dayLoop.initFor(Game.state);

    // Start sim
    Game.sim.start();

    Game.addLog(`${opts.labName} founded. Archetype: ${arch.name}.`, 'tier');
    if (arch.openingFlavor) {
      Game.events.advise('COO', arch.openingFlavor);
    }

    /* Welcome-to-the-Garage cinematic. Halts the sim until dismissed. */
    if (Game.stages && Game.stages.showOpening) Game.stages.showOpening();
  };

  // Defer boot until DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
