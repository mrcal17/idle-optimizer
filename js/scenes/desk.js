/* desk.js — Default home scene.
   Tap target, focus meter, pressure bars, training status, resources. */

window.Game = window.Game || {};
Game.scenes = Game.scenes || {};

Game.scenes.desk = {

  init(container) {
    container.innerHTML = `
      <div class="scene-grid split-60-40">
        <div class="col">
          <div class="panel">
            <h2>Desk</h2>
            <div class="tap-target" id="desk-tap-target">
              <div class="desk-art">🖥</div>
              <div class="tap-prompt">Click to focus. Each tap nudges the work forward.</div>
              <div class="tap-readout" style="margin-top:6px; color: var(--text-faint); font-size: 11px;">
                Compute +1 per tap · Focus boosts idle compute
              </div>
              <div class="focus-meter"><div class="focus-meter-fill" id="desk-focus-fill"></div></div>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="panel hidden" id="desk-pressures">
            <h2>Pressures</h2>
            <div class="pressure-row" data-pressure="trust">
              <div class="pressure-head"><span class="lbl">Trust</span><span class="val" id="desk-trust-val">100</span></div>
              <div class="bar"><div class="bar-fill" id="desk-trust-fill" style="width:100%"></div></div>
            </div>
            <div class="pressure-row" data-pressure="control">
              <div class="pressure-head"><span class="lbl">Control</span><span class="val" id="desk-control-val">100</span></div>
              <div class="bar"><div class="bar-fill" id="desk-control-fill" style="width:100%"></div></div>
            </div>
            <div class="pressure-row" data-pressure="dependence">
              <div class="pressure-head"><span class="lbl">Dependence</span><span class="val" id="desk-dep-val">0</span></div>
              <div class="bar"><div class="bar-fill" id="desk-dep-fill" style="width:0%"></div></div>
            </div>
          </div>

          <div class="panel" id="desk-resources">
            <h2>Resources</h2>
            <div class="stat-row"><span class="label">Compute</span><span class="val" id="desk-r-compute">0</span></div>
            <div class="stat-row"><span class="label">Insight</span><span class="val" id="desk-r-insight">0</span></div>
            <div class="stat-row"><span class="label">Capital</span><span class="val" id="desk-r-money">$0</span></div>
            <div class="stat-row"><span class="label">Capability</span><span class="val" id="desk-r-cap">0</span></div>
            <div class="stat-row"><span class="label">Tier</span><span class="val" id="desk-r-tier">Spark</span></div>
          </div>
        </div>
      </div>

      <div class="panel" id="desk-training-panel">
        <h2>Training Status</h2>
        <div id="desk-training-list"><div style="color: var(--text-faint); font-size: 12px;">No active runs.</div></div>
      </div>
    `;
    this.bindHandlers(container);
  },

  bindHandlers(container) {
    const tapEl = container.querySelector('#desk-tap-target');
    if (!tapEl) return;
    tapEl.addEventListener('click', (ev) => {
      if (!Game.state || Game.state.runEnded) return;
      const rect = tapEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const result = Game.sim.handleTap(x, y);
      const txt = '+' + (result.compute || 1) + ' ⚡';
      Game.ui.floatText(tapEl, txt, x, y);
    });
  },

  render() {
    const s = Game.state;
    if (!s) return;

    // Focus meter fill
    const ff = document.getElementById('desk-focus-fill');
    if (ff) ff.style.width = Math.max(0, Math.min(100, s.focusMeter)) + '%';

    // Pressures
    const trustClass = s.trust < 25 ? 'bad' : (s.trust < 55 ? 'warn' : 'good');
    const controlClass = s.control < 25 ? 'bad' : (s.control < 55 ? 'warn' : 'good');
    const depClass = s.dependence > 75 ? 'bad' : (s.dependence > 45 ? 'warn' : 'good');

    const setBar = (fillId, valId, pct, cls) => {
      const f = document.getElementById(fillId);
      if (f) {
        f.style.width = Math.max(0, Math.min(100, pct)) + '%';
        f.classList.remove('good','warn','bad');
        f.classList.add(cls);
      }
      const v = document.getElementById(valId);
      if (v) v.textContent = Math.round(pct);
    };
    setBar('desk-trust-fill', 'desk-trust-val', s.trust, trustClass);
    setBar('desk-control-fill', 'desk-control-val', s.control, controlClass);
    setBar('desk-dep-fill', 'desk-dep-val', s.dependence, depClass);

    // Resources
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setText('desk-r-compute', Game.ui.fmt(s.compute));
    setText('desk-r-insight', Game.ui.fmt1(s.insight));
    setText('desk-r-money', '$' + Game.ui.fmt(s.money));
    setText('desk-r-cap', Game.ui.fmt1(s.capability));
    const tier = (Game.tiers && Game.tiers[s.capabilityTier]) ? Game.tiers[s.capabilityTier] : { name: '—' };
    setText('desk-r-tier', tier.name);

    // Training status
    const list = document.getElementById('desk-training-list');
    if (list) {
      const runs = s.trainingRuns || [];
      if (!runs.length) {
        list.innerHTML = '<div style="color: var(--text-faint); font-size: 12px;">No active runs.</div>';
      } else {
        list.innerHTML = runs.map(run => {
          const mode = (Game.training && Game.training.modes)
            ? (Game.training.modes.find(m => m.id === run.mode) || { name: run.mode, short: '' })
            : { name: run.mode, short: '' };
          const computePct = run.computeRequired
            ? Math.min(100, (run.computeProgress / run.computeRequired) * 100) : 0;
          const gpuPct = run.gpuTimeRequired
            ? Math.min(100, (run.gpuTimeProgress / run.gpuTimeRequired) * 100) : 0;
          const overall = Math.min(computePct, gpuPct);
          const remaining = run.gpuTimeRequired - run.gpuTimeProgress;
          const gpuCount = (run.gpuIds || []).length;
          const etaDays = (gpuCount > 0)
            ? Math.max(0, remaining / Math.max(1, gpuCount * (Game.config.daysPerTick * 20)))
            : Infinity;
          const etaTxt = isFinite(etaDays) ? etaDays.toFixed(1) + 'd' : '—';
          return `
            <div class="training-card">
              <div class="tc-head">
                <span class="tc-mode">${mode.name || run.mode}</span>
                <span class="tc-name">${run.modelTier !== undefined ? 'Tier ' + run.modelTier : ''}</span>
              </div>
              <div class="bar"><div class="bar-fill" style="width:${overall.toFixed(1)}%"></div></div>
              <div class="tc-meta">
                ${gpuCount} GPU${gpuCount === 1 ? '' : 's'} · ETA ~${etaTxt} · ${Math.round(overall)}% complete
              </div>
              ${mode.short ? `<div class="tc-meta" style="margin-top:2px;">${mode.short}</div>` : ''}
            </div>
          `;
        }).join('');
      }
    }
  },
};
