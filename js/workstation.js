/* workstation.js — The single immersive view.
   Replaces the 5-tab nav with a desktop-style room + monitor + terminal.
   Routes scene activation through the app-dock. The existing scene
   modules (desk/office/operations/world/logs) mount inside the
   monitor's screen as "apps."

   This module owns the *frame*. Per-app rendering is still inside the
   scene modules; per-room ambience is in js/room.js; per-NPC dialog is
   in js/handlers.js. Keep this thin. */

window.Game = window.Game || {};

Game.workstation = (function() {

  function init() {
    /* The dock click handlers are wired by Game.ui.boot — we just need to
       make sure the active app is the desk by default. */
    if (Game.ui && Game.ui.showScene) Game.ui.showScene('desk');
    updateTerminalPrompt();
    updateAppCount();
  }

  function updateTerminalPrompt() {
    const el = document.getElementById('term-prompt');
    if (!el || !Game.state) return;
    const lab = (Game.state.labName || 'foundry').toLowerCase().replace(/\s+/g, '-');
    el.textContent = `${lab}@lab:~$`;
  }

  function updateAppCount() {
    const el = document.getElementById('term-status');
    if (!el || !Game.state) return;
    const unlocked = Object.keys(Game.state.scenesUnlocked || {})
      .filter(k => Game.state.scenesUnlocked[k]).length;
    const total = 5;
    el.textContent = `apps: ${unlocked}/${total}`;
  }

  function tick() {
    /* Light per-tick refresh — terminal status updates as apps unlock. */
    updateAppCount();
  }

  return { init, tick, updateTerminalPrompt, updateAppCount };
})();
