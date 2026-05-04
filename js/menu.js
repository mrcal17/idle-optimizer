/* menu.js — Single source for shell-screen routing.
   The shell layer (boot → main menu → options → archetype select) is
   distinct from the in-run UI (HUD / workstation / overlays). This module
   just hides/shows the right top-level element; it does not own any
   game-state mutation. */

window.Game = window.Game || {};

Game.menu = (function() {
  const SCREEN_IDS = ['boot-screen', 'main-menu', 'options-screen', 'archetype-select'];

  function hideAll() {
    for (const id of SCREEN_IDS) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
  }

  function show(id) {
    hideAll();
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function showMain()      { show('main-menu'); }
  function showOptions()   {
    show('options-screen');
    if (Game.options && Game.options.refresh) Game.options.refresh();
  }
  function showArchetype() { show('archetype-select'); }
  function showBoot()      { show('boot-screen'); }

  return {
    hideAll,
    show,
    showMain,
    showOptions,
    showArchetype,
    showBoot,
  };
})();
