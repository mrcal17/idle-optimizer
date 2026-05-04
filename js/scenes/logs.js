/* logs.js — Run timeline + dossier.
   Single log list, plus run-stats sub-panel. */

window.Game = window.Game || {};
Game.scenes = Game.scenes || {};

Game.scenes.logs = {

  init(container) {
    container.innerHTML = `
      <div class="panel">
        <h2>Run Timeline <span id="logs-count" style="color: var(--text-faint); font-weight: normal; margin-left: 8px;"></span></h2>
        <div class="log-list" id="logs-list"></div>
      </div>

      <div class="panel">
        <h2>Run Dossier</h2>
        <div class="grid-2">
          <div>
            <div class="stat-row"><span class="label">Total Compute</span><span class="val" id="logs-total-compute">0</span></div>
            <div class="stat-row"><span class="label">Total Revenue</span><span class="val" id="logs-total-revenue">$0</span></div>
            <div class="stat-row"><span class="label">Pivots Taken</span><span class="val" id="logs-pivot-count">0</span></div>
            <div class="stat-row"><span class="label">Incidents Survived</span><span class="val" id="logs-incident-count">0</span></div>
            <div class="stat-row"><span class="label">Models Created</span><span class="val" id="logs-models-count">0</span></div>
          </div>
          <div>
            <h3 style="margin-bottom: 6px;">Pivots</h3>
            <div id="logs-pivots-list" style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim);"></div>
          </div>
        </div>
      </div>
    `;
  },

  render() {
    const s = Game.state;
    if (!s) return;

    // Log list
    const list = document.getElementById('logs-list');
    if (list) {
      const logs = s.logs || [];
      if (!logs.length) {
        list.innerHTML = '<div style="color: var(--text-faint); padding: 8px;">No log entries yet.</div>';
      } else {
        list.innerHTML = logs.map(l => {
          const cls = l.type ? l.type : '';
          return `<div class="log-entry ${cls}">
            <span class="timestamp">D${Math.floor(l.day)}</span>
            <span class="body">${l.body}</span>
          </div>`;
        }).join('');
      }
    }

    // Count
    const count = document.getElementById('logs-count');
    if (count) count.textContent = `(${(s.logs || []).length} entries)`;

    // Stats
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const stats = s.stats || {};
    setText('logs-total-compute', Game.ui.fmt(stats.totalCompute || 0));
    setText('logs-total-revenue', '$' + Game.ui.fmt(stats.totalRevenue || 0));
    setText('logs-pivot-count', String(stats.pivotCount || 0));
    setText('logs-incident-count', String(stats.incidentCount || 0));
    setText('logs-models-count', String((s.models || []).length));

    // Pivots list with checkmarks
    const pivotsEl = document.getElementById('logs-pivots-list');
    if (pivotsEl) {
      const pivots = s.pivots || {};
      const ids = Object.keys(pivots);
      if (!ids.length) {
        pivotsEl.innerHTML = '<span style="color: var(--text-faint);">No pivots taken yet.</span>';
      } else {
        const allPivots = (Game.pivotData && Game.pivotData.list) ? Game.pivotData.list : [];
        pivotsEl.innerHTML = ids.map(pid => {
          const meta = allPivots.find(p => p.id === pid);
          const name = meta ? (meta.name || meta.title || pid) : pid;
          const choice = pivots[pid];
          return `<div>✓ <span style="color: var(--accent);">${name}</span> <span style="color: var(--text-faint);">→ ${choice}</span></div>`;
        }).join('');
      }
    }
  },
};
