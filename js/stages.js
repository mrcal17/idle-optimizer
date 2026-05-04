/* stages.js — Three-act stage system: Garage / Lab / Org.
   Stage is *derived* from capabilityTier (0-1 = Garage, 2-3 = Lab,
   4-5 = Org), but stored on Game.state.stage so transitions fire
   exactly once per crossing.

   Sim calls Game.stages.derive() and Game.stages.onTransition() each
   tick. main.js calls Game.stages.showOpening() once on run start.

   The cinematic halts the sim by setting state.pendingDecision.
   Themes are CSS-driven via html[data-stage="N"] selectors that
   already exist in styles.css.
*/

window.Game = window.Game || {};

Game.stages = (function() {

  let _continueWired = false;
  let _activeCinematic = null;

  /* Capability tier → stage mapping per spec.
     Tier 0 (Spark) and 1 (Ember) → Stage 1 (Garage)
     Tier 2 (Beacon) and 3 (Lighthouse) → Stage 2 (Lab)
     Tier 4 (Pharos) and 5 (Apex) → Stage 3 (Org)
  */
  function derive(state) {
    if (!state) return 1;
    const tier = state.capabilityTier || 0;
    if (tier <= 1) return 1;
    if (tier <= 3) return 2;
    return 3;
  }

  function applyTheme(stage) {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.stage = String(stage || 1);
  }

  /* === Cinematic show / dismiss === */

  function showCinematic(cinematic) {
    if (!cinematic) return;
    const overlay = document.getElementById('stage-overlay');
    if (!overlay) return;

    _activeCinematic = cinematic;

    const labelEl = document.getElementById('stage-act-label');
    const titleEl = document.getElementById('stage-title');
    const flavorEl = document.getElementById('stage-flavor');
    const changesEl = document.getElementById('stage-changes');
    const continueBtn = document.getElementById('stage-continue-btn');

    /* Substitute {lab} / {model} placeholders. Defensive in case the
       module loads before state. */
    const sub = (txt) => (Game.substitute ? Game.substitute(txt) : txt);

    if (labelEl) labelEl.textContent = cinematic.actLabel || '';
    if (titleEl) titleEl.textContent = sub(cinematic.title || '');
    if (flavorEl) {
      // Multi-paragraph prose: render each paragraph as its own <p>
      const paragraphs = String(cinematic.flavor || '')
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => sub(p));
      flavorEl.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }
    if (changesEl) {
      const rows = (cinematic.changes || []).map(ch =>
        `<div class="change-row"><span class="icon">${escapeHtml(ch.icon || '·')}</span>` +
        `<span class="text">${escapeHtml(sub(ch.text || ''))}</span></div>`
      ).join('');
      changesEl.innerHTML = rows;
    }

    /* Wire continue button once. The button always closes the active
       cinematic regardless of which one is showing. */
    if (continueBtn && !_continueWired) {
      continueBtn.addEventListener('click', dismissCinematic);
      _continueWired = true;
    }

    overlay.classList.remove('hidden');
  }

  function dismissCinematic() {
    const overlay = document.getElementById('stage-overlay');
    if (overlay) overlay.classList.add('hidden');
    _activeCinematic = null;

    /* Clear the sim halt — but only if it's our halt. Don't stomp a
       pivot/incident decision that landed during the same tick. */
    const s = Game.state;
    if (s && s.pendingDecision && s.pendingDecision.type === 'stage') {
      s.pendingDecision = null;
    }

    /* Re-render the UI now that the theme has settled. */
    if (Game.ui && Game.ui.refresh) Game.ui.refresh();
  }

  /* === Run-start opening === */

  function showOpening() {
    if (!Game.state) return;
    if (!Game.stageCinematics || !Game.stageCinematics.findOpening) return;
    const cin = Game.stageCinematics.findOpening();
    if (!cin) return;

    /* Theme is set first so the opening renders in Garage palette. */
    applyTheme(1);

    /* Halt the sim until the player clicks Continue. */
    Game.state.pendingDecision = { type: 'stage', payload: cin.id };

    showCinematic(cin);

    if (Game.addLog) Game.addLog(`Act I — ${cin.title}. ${Game.state.labName} opens for business.`, 'tier');
  }

  /* === Mid-run transition === */

  function onTransition(prevStage, newStage) {
    if (prevStage === newStage) return;
    if (!Game.state) return;

    /* Apply theme RIGHT BEFORE showing the cinematic so the cinematic
       itself is rendered in the new palette. */
    applyTheme(newStage);

    /* Find a cinematic for this transition. Prefer archetype-specific. */
    let cin = null;
    if (Game.stageCinematics && Game.stageCinematics.findTransition) {
      cin = Game.stageCinematics.findTransition(prevStage, newStage, Game.state.archetypeId);
    }

    /* Log regardless. */
    if (Game.addLog) {
      const titles = { 1: 'The Garage', 2: 'The Lab', 3: 'The Org' };
      const newTitle = titles[newStage] || 'a new act';
      Game.addLog(`Act transition — ${newTitle}. The story moves on.`, 'tier');
    }

    /* No cinematic available? Theme still applied; sim continues. */
    if (!cin) return;

    /* Halt the sim with a pendingDecision the player must dismiss. */
    Game.state.pendingDecision = { type: 'stage', payload: cin.id };
    showCinematic(cin);
  }

  /* === Stage-derived caps === */

  function getMaxParallelism(state) {
    const stage = (state && state.stage) || (Game.state && Game.state.stage) || 1;
    if (stage <= 1) return 1;
    if (stage === 2) return 3;
    return Number.POSITIVE_INFINITY;
  }

  function getMaxPersonnel(state) {
    const stage = (state && state.stage) || (Game.state && Game.state.stage) || 1;
    if (stage <= 1) return 3;
    if (stage === 2) return 10;
    return 25;
  }

  /* === Local helpers === */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    derive,
    onTransition,
    applyTheme,
    showOpening,
    showCinematic,
    dismissCinematic,
    getMaxParallelism,
    getMaxPersonnel,
  };

})();
