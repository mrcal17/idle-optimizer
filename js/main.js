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
      document.getElementById('app').classList.add('hidden');
      document.getElementById('scene-nav').classList.add('hidden');
      // Show archetype select
      document.getElementById('archetype-select').classList.remove('hidden');
    });

    document.getElementById('ending-download-card').addEventListener('click', () => {
      if (Game.labcard && Game.labcard.download) Game.labcard.download();
    });

    document.getElementById('advisor-dismiss').addEventListener('click', () => {
      document.getElementById('advisor-overlay').classList.add('hidden');
    });
  }

  Game.startRun = function(opts) {
    Game.state = Game.makeInitialState();
    if (Game.deployments && Game.deployments.reset) Game.deployments.reset();
    Game.state.archetypeId = opts.archId;
    Game.state.labName = opts.labName;
    Game.state.crest = opts.crest;
    Game.state.palette = opts.palette;
    Game.state.runStartedAt = Date.now();

    // Apply archetype starting kit
    const arch = Game.archetypes[opts.archId];
    if (arch && arch.defaultAutopilot) Game.state.autopilot.preset = arch.defaultAutopilot;
    if (arch && arch.applyStartingKit) arch.applyStartingKit(Game.state);
    Game.ui.applyArchetypePalette(arch);

    // Hide select, show game
    document.getElementById('archetype-select').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('ticker').classList.remove('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('scene-nav').classList.remove('hidden');

    // Boot UI subsystems
    Game.ui.boot();

    // Reset progressive-disclosure state (clears any stale hidden classes
    // from a previous run and re-hides the elements this run has yet to
    // earn). Defensive against the module being absent.
    if (Game.discovery && Game.discovery.reset) Game.discovery.reset();

    // Show desk by default
    Game.ui.showScene('desk');

    // Start sim
    Game.sim.start();

    Game.addLog(`${opts.labName} founded. Archetype: ${arch.name}.`, 'tier');
    if (arch.openingFlavor) {
      Game.events.advise('COO', arch.openingFlavor);
    }
  };

  // Defer boot until DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
