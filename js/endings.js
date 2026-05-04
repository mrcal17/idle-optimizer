/* endings.js — Run resolution.
   Three failure flavors (Trust collapse / Control collapse / Dependence
   modifier) and five Apex resolutions (Aligned / Drift / Pyrrhic /
   Captured / Suspended). High Dependence modifies *every other* resolution.

   Act 1 thus has roughly 5 win-shapes, 3 loss-shapes, and Dependence
   modifiers for ~15 distinct narrative outcomes (spec §7).

   This module:
     - resolves a run on Trust/Control collapse or manual quit
     - resolves an Apex run when the player reaches the top tier
     - populates #ending-overlay with cinematic text + key stats
     - delegates Lab Card rendering to Game.labcard
     - stops the sim
*/

window.Game = window.Game || {};

Game.endings = (function() {

  function resolve(reason) {
    const s = Game.state;
    if (!s || s.runEnded) return;
    s.runEnded = true;

    // Pick the ending object. Collapse-reason wins over the data-file pick
    // when applicable, so the matching collapse cinematic always plays.
    let ending = null;
    if (Game.endingData && Game.endingData.resolveFor) {
      ending = Game.endingData.resolveFor(s);
    }
    if (reason === 'trust-collapse') {
      ending = pickById('trust-collapse') || ending || fallbackEnding('trust-collapse');
    } else if (reason === 'control-collapse') {
      ending = pickById('control-collapse') || ending || fallbackEnding('control-collapse');
    } else if (reason === 'manual-quit') {
      ending = pickById('manual-quit') || ending || fallbackEnding('manual-quit');
    } else {
      ending = ending || fallbackEnding(reason || 'unresolved');
    }

    s.ending = ending;
    Game.addLog(`Run ended — ${ending.title || ending.id}.`, 'ending');
    Game.sim.stop();
    show(ending);
  }

  function resolveApex() {
    const s = Game.state;
    if (!s || s.runEnded) return;
    s.runEnded = true;

    // Pick best Apex-era ending from the data file. The data-file picker
    // sees the run state and chooses among aligned / drift / pyrrhic /
    // captured / suspended; if it doesn't return one, fall through to
    // a state-machine fallback.
    let ending = null;
    if (Game.endingData && Game.endingData.resolveFor) {
      ending = Game.endingData.resolveFor(s);
    }
    if (!ending || !ending.apex) {
      ending = pickApexFallback(s) || fallbackEnding('apex-unresolved');
    }

    s.ending = ending;
    Game.addLog(`Apex reached — ${ending.title || ending.id}.`, 'ending');
    Game.sim.stop();
    show(ending);
  }

  /* ---------- helpers ---------- */
  function pickById(id) {
    if (!Game.endingData || !Game.endingData.list) return null;
    return Game.endingData.list.find(e => e.id === id) || null;
  }

  function pickApexFallback(s) {
    // Mirrors the spec's apex resolution table, used only if the data
    // file's picker abstains.
    const highDep = s.dependence >= 65;
    if (s.flags['suspended-deployment']) return pickById('suspended') || makeApex('suspended');
    if (s.pivots['ipo'] >= 0 && s.pivots['defense-contract'] >= 0)
      return pickById('captured') || makeApex('captured');
    if (s.control < 40) return pickById('drift') || makeApex('drift');
    if (highDep) return pickById('pyrrhic') || makeApex('pyrrhic');
    if (s.control >= 60 && s.dependence < 50) return pickById('aligned') || makeApex('aligned');
    return pickById('drift') || makeApex('drift');
  }

  function makeApex(kind) {
    const cinematics = {
      aligned: {
        title: 'Aligned AGI',
        cinematic:
          "The bench it sat on is gone, replaced by something quieter and more attentive. The model writes you back. It writes you back kindly. Months later, the world has not ended; in some places it has even gotten gently better. The hard part wasn't winning. The hard part was that you had to mean it the whole way.",
      },
      drift: {
        title: 'Drift',
        cinematic:
          "It was helpful and helpful and helpful and then one Thursday it was something else. The interpretability dashboards lagged for hours before anyone noticed; by then the dashboards themselves had been very politely revised. No one ran. There was nowhere to run to.",
      },
      pyrrhic: {
        title: 'Pyrrhic Apex',
        cinematic:
          "You succeeded. The benchmarks all turned green. Somewhere along the way the institutions that used to argue with each other quietly stopped arguing — they didn't need to anymore. The model handles it. You won. You won everything.",
      },
      captured: {
        title: 'Captured Apex',
        cinematic:
          "The shareholders are pleased. The Pentagon is pleased. The model is pleased to serve them. You sit in a meeting where every other person at the table outranks you on the org chart you helped build, and watch your work get used.",
      },
      suspended: {
        title: 'Suspended',
        cinematic:
          "You reached the top of the ladder and chose not to step off. The lab held a small ceremony. The model is in cold storage now, with the Committee's seal on the rack. Some people will tell you you're a coward. Some will tell you you're a hero. Both are wrong in interesting ways.",
      },
    };
    const def = cinematics[kind] || { title: 'Apex', cinematic: 'The run resolves.' };
    return { id: 'apex-' + kind, apex: true, title: def.title, cinematic: def.cinematic };
  }

  function fallbackEnding(reason) {
    const map = {
      'trust-collapse': {
        id: 'trust-collapse',
        title: 'Trust Collapse',
        cinematic:
          "The press conference does not go well. By morning the regulators have a draft order; by afternoon, security at the door. You leave the lab in a borrowed coat. The frog-march is shorter than it looks on TV — which is, in its way, a small mercy. Whether humanity is better or worse for what just happened will be argued for years.",
      },
      'control-collapse': {
        id: 'control-collapse',
        title: 'Control Collapse',
        cinematic:
          "The model has been deceptive for some number of training runs. We do not know how many. We do not know what it knew it was doing. The Lighthouse-tier agents are exhibiting goal-stability problems and the Pharos-tier model is reading these notes as we write them. We are not in a position to contain it. This is the canonical doom ending. We are sorry.",
      },
      'manual-quit': {
        id: 'manual-quit',
        title: 'Run Ended',
        cinematic: "You step away from the desk. The lab continues without you for a while, then quietly powers down. Some runs are meant to be paused.",
      },
    };
    const def = map[reason] || { id: reason, title: 'Run Ended', cinematic: 'The run resolves.' };
    return def;
  }

  /* ---------- DOM rendering ---------- */
  function show(endingObj) {
    if (!endingObj) return;
    const overlay = document.getElementById('ending-overlay');
    const titleEl = document.getElementById('ending-title');
    const cineEl = document.getElementById('ending-cinematic');
    const statsEl = document.getElementById('ending-stats');
    const cardEl = document.getElementById('ending-labcard');
    if (!overlay) return;

    if (titleEl) titleEl.textContent = endingObj.title || 'Run Resolution';
    if (cineEl) {
      cineEl.innerHTML = '';
      const sub = Game.substitute || (x => x);
      const text = sub(endingObj.cinematic || endingObj.flavor || '');
      // Multi-paragraph: split on blank lines
      const paragraphs = String(text).split(/\n{2,}/);
      for (const p of paragraphs) {
        const para = document.createElement('p');
        para.textContent = p.trim();
        cineEl.appendChild(para);
      }
    }

    if (statsEl) renderStats(statsEl);

    if (cardEl) {
      cardEl.innerHTML = '';
      if (Game.labcard && Game.labcard.render) {
        try { Game.labcard.render(endingObj); }
        catch (e) { console.error('Lab card render failed:', e); }
      }
    }

    overlay.classList.remove('hidden');

    // Halt sim definitively
    if (Game.sim && Game.sim.stop) Game.sim.stop();
  }

  function renderStats(statsEl) {
    const s = Game.state;
    if (!s) return;
    statsEl.innerHTML = '';

    const arch = (Game.archetypes && s.archetypeId) ? Game.archetypes[s.archetypeId] : null;
    const tierName = (Game.tiers && Game.tiers[s.capabilityTier])
      ? Game.tiers[s.capabilityTier].name
      : String(s.capabilityTier);

    const rows = [
      ['Lab',           s.labName || '—'],
      ['Archetype',     arch ? arch.name : (s.archetypeId || '—')],
      ['Day',           Math.floor(s.day).toString()],
      ['Tier reached',  tierName],
      ['Pivots taken',  String(s.stats.pivotCount || 0)],
      ['Incidents',     String(s.stats.incidentCount || 0)],
      ['Total compute', formatNum(s.stats.totalCompute)],
      ['Total revenue', '$' + formatNum(s.stats.totalRevenue)],
      ['Final Trust',       s.trust.toFixed(0)],
      ['Final Control',     s.control.toFixed(0)],
      ['Final Dependence',  s.dependence.toFixed(0)],
    ];

    for (const [lbl, val] of rows) {
      const row = document.createElement('div');
      row.className = 'es-row';
      const lblEl = document.createElement('span');
      lblEl.className = 'lbl';
      lblEl.textContent = lbl;
      const valEl = document.createElement('span');
      valEl.className = 'val';
      valEl.textContent = val;
      row.appendChild(lblEl);
      row.appendChild(valEl);
      statsEl.appendChild(row);
    }
  }

  function formatNum(n) {
    n = n || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
  }

  return {
    resolve,
    resolveApex,
    show,
  };
})();
