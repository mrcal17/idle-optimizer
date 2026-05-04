/* operations.js — Autopilot, training modes, upgrades, GPU specialization. */

window.Game = window.Game || {};
Game.scenes = Game.scenes || {};

Game.scenes.operations = {

  /* Drop zones, in display order. Each zone maps to a gpu.spec value. */
  _gpuZones: [
    { spec: 'general',   label: 'IDLE POOL',            note: 'general-purpose; available for any role' },
    { spec: 'training',  label: 'TRAINING',             note: 'training-spec; +1.7x training throughput' },
    { spec: 'research',  label: 'RESEARCH',             note: 'research-spec; +2.0x capability gain' },
    { spec: 'inference', label: 'INFERENCE / DEPLOYED', note: 'inference-spec; deployment revenue' },
  ],

  init(container) {
    container.innerHTML = `
      <div class="scene-grid split-50-50">
        <div class="col">
          <div class="panel">
            <h2>Autopilot</h2>
            <div class="autopilot-presets" id="ops-autopilot-presets"></div>
            <div id="ops-autopilot-active" style="margin-top: 6px; font-size: 11px; color: var(--text-faint);"></div>
          </div>

          <div class="panel">
            <h2>Training</h2>
            <div id="ops-training-modes" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
            <div id="ops-training-hint" style="margin-top: 6px; color: var(--text-faint); font-size: 11px;"></div>
          </div>

          <div class="panel">
            <h2>GPU Allocation</h2>
            <div id="ops-gpu-spec" class="gpu-alloc"></div>
            <div id="ops-gpu-spec-banner"></div>
            <div style="margin-top: 8px; font-size: 11px; color: var(--text-faint);">Drag a GPU into a zone to allocate it. Busy GPUs cannot move.</div>
          </div>

          <div class="panel">
            <h2>Deployments</h2>
            <div id="ops-deployment-list" class="deployment-list"></div>
            <div id="ops-deployment-deployable" class="deployable-list"></div>
            <div id="ops-deployment-hint" style="margin-top: 6px; color: var(--text-faint); font-size: 11px;"></div>
          </div>
        </div>

        <div class="col">
          <div class="panel">
            <h2>Upgrades</h2>
            <div id="ops-upgrades-tree"></div>
          </div>
        </div>
      </div>
    `;
    this.bindHandlers(container);
  },

  _specMeta: {
    general:   { label: 'GEN',   full: 'General' },
    training:  { label: 'TRAIN', full: 'Training' },
    research:  { label: 'RSCH',  full: 'Research' },
    inference: { label: 'INFER', full: 'Inference' },
  },

  _showGpuBanner(msg) {
    const banner = document.getElementById('ops-gpu-spec-banner');
    if (!banner) return;
    banner.innerHTML = `<div class="inline-banner">${msg}</div>`;
    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      const b = document.getElementById('ops-gpu-spec-banner');
      if (b) b.innerHTML = '';
    }, 2200);
  },

  bindHandlers(container) {
    // Wired dynamically in render().
  },

  render() {
    const s = Game.state;
    if (!s) return;

    this._renderAutopilot();
    this._renderTraining();
    this._renderGpuSpec();
    this._renderDeployments();
    this._renderUpgrades();
  },

  _renderDeployments() {
    const s = Game.state;
    if (!s) return;
    const listBox = document.getElementById('ops-deployment-list');
    const deployableBox = document.getElementById('ops-deployment-deployable');
    const hintEl = document.getElementById('ops-deployment-hint');
    if (!listBox || !deployableBox) return;

    if (!Game.deployments) {
      listBox.innerHTML = '<div style="color: var(--text-faint); font-size: 12px;">Deployments module not loaded.</div>';
      deployableBox.innerHTML = '';
      if (hintEl) hintEl.textContent = '';
      return;
    }

    const active = Game.deployments.list || [];
    if (active.length) {
      listBox.innerHTML = active.map(dep => {
        const domain = Game.deployments.getDomain(dep.domainId);
        const model = Game.deployments.findModel(dep.modelId);
        const modelName = Game.deployments.modelDisplayName(model);
        const domainName = domain ? domain.name : dep.domainId;
        const domainIcon = domain ? domain.icon : '';
        const gpuCount = dep.gpuIds.length;
        const totalRev = dep.totalRevenue || 0;
        const scaleDown = gpuCount <= 0;
        return `<div class="deployment-card" data-deployment-id="${dep.id}">
          <div class="dc-head">
            <span class="dc-icon">${domainIcon}</span>
            <span class="dc-name">${modelName}</span>
            <span class="dc-domain">${domainName}</span>
          </div>
          <div class="dc-stats">
            <span class="dc-stat"><span class="lbl">GPUs</span><span class="val">${gpuCount}${scaleDown ? ' · scaling down' : ''}</span></span>
            <span class="dc-stat"><span class="lbl">Total revenue</span><span class="val">$${Game.ui.fmt(totalRev)}</span></span>
          </div>
          <div class="dc-actions">
            <button class="action-btn dc-scale-down" data-action="scale-down" data-id="${dep.id}">−1 GPU</button>
            <button class="action-btn dc-scale-up" data-action="scale-up" data-id="${dep.id}">+1 GPU</button>
            <button class="action-btn danger dc-retire" data-action="retire" data-id="${dep.id}">Retire</button>
          </div>
        </div>`;
      }).join('');

      listBox.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id, 10);
          const action = btn.dataset.action;
          if (action === 'scale-up') {
            Game.deployments.scaleByDelta(id, +1);
          } else if (action === 'scale-down') {
            Game.deployments.scaleByDelta(id, -1);
          } else if (action === 'retire') {
            Game.deployments.retire(id);
          }
          Game.scenes.operations._renderDeployments();
        });
      });
    } else {
      listBox.innerHTML = `<div class="deployment-empty">
        No active deployments. Train a model and deploy it to start earning revenue.
      </div>`;
    }

    /* "+ Deploy" buttons for trained-but-not-deployed models. We're
       defensive about model shape: the modelIdentity agent's models
       have status='trained'; legacy models have neither status nor id.
       For legacy shapes, treat models with no active deployment as
       deployable. */
    const deployable = (s.models || []).filter(m => {
      // Skip if explicitly archived/deployed by status field.
      if (m.status === 'deployed' || m.status === 'archived') return false;
      const mid = (m.id != null) ? m.id : m.tier;
      const existing = Game.deployments.byModel(mid);
      return !existing;
    });

    if (deployable.length) {
      deployableBox.innerHTML = `
        <div class="deployable-head">Trained models ready to deploy</div>
        ${deployable.map(m => {
          const tierName = (Game.tiers && Game.tiers[m.tier]) ? Game.tiers[m.tier].name : ('Tier ' + (m.tier || 0));
          const ver = (m.version != null) ? ` v${m.version}` : '';
          const mid = (m.id != null) ? m.id : m.tier;
          return `<button class="action-btn deployable-btn" data-deploy-model="${mid}">
            + Deploy <strong>${m.name || ('Tier ' + (m.tier || 0))}</strong>${ver} <span class="cost">${tierName}</span>
          </button>`;
        }).join('')}
      `;
      deployableBox.querySelectorAll('button[data-deploy-model]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mid = btn.dataset.deployModel;
          if (Game.deployments && Game.deployments.openOverlay) {
            Game.deployments.openOverlay(mid);
          }
        });
      });
    } else {
      deployableBox.innerHTML = '';
    }

    if (hintEl) {
      const free = Game.deployments.freeInferenceGpus().length;
      hintEl.textContent = `${free} free inference GPU${free === 1 ? '' : 's'} available for deployment.`;
    }
  },

  _renderAutopilot() {
    const s = Game.state;
    const presets = [
      { id: 'safe', icon: '🛡', name: 'Play it Safe', desc: 'Cautious. Defends Trust and Control.' },
      { id: 'frontier', icon: '🔥', name: 'Push the Frontier', desc: 'Aggressive. Maximizes capability gain.' },
      { id: 'wait', icon: '⏸', name: 'Wait for Me', desc: 'Manual. Autopilot stands by until you decide.' },
    ];
    const arch = s.archetypeId ? Game.archetypes[s.archetypeId] : null;
    const lockedAutopilots = (arch && arch.lockedAutopilots) ? arch.lockedAutopilots : [];

    const box = document.getElementById('ops-autopilot-presets');
    if (!box) return;
    box.innerHTML = presets.map(p => {
      const active = (s.autopilot && s.autopilot.preset === p.id);
      const locked = lockedAutopilots.indexOf(p.id) >= 0;
      const available = Game.autopilot && Game.autopilot.isAvailable
        ? Game.autopilot.isAvailable(p.id)
        : true;
      const disabled = locked || !available;
      return `<div class="autopilot-preset ${active ? 'active' : ''}" data-preset="${p.id}"
        style="${disabled ? 'opacity:0.4; cursor: not-allowed;' : ''}">
        <div class="ap-icon">${p.icon}</div>
        <div class="ap-name">${p.name}</div>
        <div class="ap-desc">${p.desc}${locked ? ' (locked: archetype)' : ''}</div>
      </div>`;
    }).join('');

    box.querySelectorAll('.autopilot-preset').forEach(el => {
      const presetId = el.dataset.preset;
      const locked = lockedAutopilots.indexOf(presetId) >= 0;
      if (locked) return;
      el.addEventListener('click', () => {
        if (Game.autopilot && Game.autopilot.setPreset) {
          Game.autopilot.setPreset(presetId);
        } else {
          Game.state.autopilot.preset = presetId;
        }
      });
    });

    const activeEl = document.getElementById('ops-autopilot-active');
    if (activeEl) {
      const active = presets.find(p => p.id === s.autopilot.preset);
      activeEl.textContent = active ? `Active: ${active.name}` : '';
    }
  },

  _renderTraining() {
    const s = Game.state;
    const box = document.getElementById('ops-training-modes');
    if (!box) return;

    const modes = (Game.training && Game.training.modes) ? Game.training.modes : [];
    if (!modes.length) {
      box.innerHTML = '<div style="color: var(--text-faint); font-size: 12px;">Training system not loaded.</div>';
      return;
    }
    box.innerHTML = modes.map(m => {
      let costObj = { compute: 0, gpuTime: 0 };
      try {
        const r = (typeof m.cost === 'function') ? m.cost(s) : m.cost;
        if (r && typeof r === 'object') costObj = { compute: r.compute || 0, gpuTime: r.gpuTime || 0 };
        else if (typeof r === 'number') costObj = { compute: r, gpuTime: 0 };
      } catch (e) { /* keep zeros */ }
      const deployed = (Game.deployments && Game.deployments.allocatedGpuIds)
        ? Game.deployments.allocatedGpuIds()
        : new Set();
      const idleCount = s.gpus.filter(g => !g.busyJobId && !deployed.has(g.id)).length;
      const tierGate = (m.requiresTier !== undefined) && s.capabilityTier < m.requiresTier;
      const minComputeToStart = Math.min(costObj.compute * 0.05, 5);
      const disabled = (s.compute < minComputeToStart) || (idleCount === 0 && m.id !== 'continual-learning') || tierGate;
      const costLabel = m.id === 'continual-learning'
        ? (s.flags['continual-learning'] ? 'pause' : 'toggle')
        : `⚡${Game.ui.fmt(costObj.compute)}${costObj.gpuTime ? ' · ' + costObj.gpuTime + 'd' : ''}`;
      return `<button class="action-btn" data-train-mode="${m.id}" ${disabled ? 'disabled' : ''}
        title="${m.short || ''}">
        Start ${m.name} <span class="cost">${costLabel}</span>
      </button>`;
    }).join('');

    box.querySelectorAll('button[data-train-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.trainMode;
        /* Pretraining is the one mode that produces a named model — route
           it through the naming modal so the player christens it before
           the run begins. Other modes start immediately. */
        if (id === 'pretraining' && Game.modelIdentity && Game.modelIdentity.openNamingModal) {
          Game.modelIdentity.openNamingModal();
          return;
        }
        if (Game.training && Game.training.startRun) {
          Game.training.startRun(id);
        }
      });
    });

    const hint = document.getElementById('ops-training-hint');
    if (hint) {
      const deployed = (Game.deployments && Game.deployments.allocatedGpuIds)
        ? Game.deployments.allocatedGpuIds()
        : new Set();
      const idleCount = s.gpus.filter(g => !g.busyJobId && !deployed.has(g.id)).length;
      hint.textContent = `${idleCount} idle GPU${idleCount === 1 ? '' : 's'} available · ${s.trainingRuns.length} active run${s.trainingRuns.length === 1 ? '' : 's'}`;
    }
  },

  /* Show a per-zone rejection banner that fades after 1.5s. Used when the
     player tries to drop a busy GPU into a zone. The zone itself shakes
     via the .drop-rejected class. */
  _showZoneReject(zoneEl, msg) {
    if (!zoneEl) return;
    let banner = zoneEl.querySelector('.zone-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'zone-banner';
      zoneEl.appendChild(banner);
    }
    banner.textContent = msg;
    banner.classList.remove('hide');
    zoneEl.classList.remove('drop-rejected');
    // Force reflow so the shake replays on rapid retries.
    void zoneEl.offsetWidth;
    zoneEl.classList.add('drop-rejected');
    if (this._zoneBannerTimer) clearTimeout(this._zoneBannerTimer);
    this._zoneBannerTimer = setTimeout(() => {
      banner.classList.add('hide');
      zoneEl.classList.remove('drop-rejected');
    }, 1500);
  },

  /* Move a GPU to a new spec. Validates that it isn't busy or deployed.
     Returns true on success, false on rejection. */
  _moveGpu(gpuId, targetSpec, zoneEl) {
    const s = Game.state;
    const gpu = s.gpus.find(g => g.id === gpuId);
    if (!gpu) return false;
    const deployed = (Game.deployments && Game.deployments.allocatedGpuIds)
      ? Game.deployments.allocatedGpuIds()
      : new Set();
    if (gpu.busyJobId || deployed.has(gpu.id)) {
      Game.scenes.operations._showZoneReject(zoneEl, `GPU #${gpu.id} is busy`);
      return false;
    }
    if (gpu.spec === targetSpec) {
      // No-op — re-flow into same zone, no log entry.
      return true;
    }
    gpu.spec = targetSpec;
    Game.addLog(`GPU #${gpu.id} reconfigured to ${targetSpec}.`, '');
    return true;
  },

  _renderGpuSpec() {
    const s = Game.state;
    const box = document.getElementById('ops-gpu-spec');
    if (!box) return;

    const gpus = s.gpus || [];
    if (!gpus.length) {
      box.innerHTML = '<div class="gpu-alloc-empty">No GPUs yet. Buy your first one.</div>';
      return;
    }

    const meta = this._specMeta;
    const deployed = (Game.deployments && Game.deployments.allocatedGpuIds)
      ? Game.deployments.allocatedGpuIds()
      : new Set();
    const zones = this._gpuZones;

    // Bucket GPUs by spec.
    const buckets = { general: [], training: [], research: [], inference: [] };
    gpus.forEach(g => {
      const spec = buckets[g.spec] ? g.spec : 'general';
      buckets[spec].push(g);
    });

    const cardHtml = (g) => {
      const spec = g.spec || 'general';
      const m = meta[spec] || meta.general;
      const busy = !!g.busyJobId || deployed.has(g.id);
      const cls = ['gpu-card', `spec-${spec}`];
      if (busy) cls.push('busy');
      const reason = g.busyJobId ? 'on training run' : (deployed.has(g.id) ? 'on deployment' : '');
      const title = busy
        ? `GPU #${g.id} — ${m.full} · busy (${reason})`
        : `GPU #${g.id} — ${m.full} · drag to a zone to reallocate`;
      const draggable = busy ? 'false' : 'true';
      return `<div class="${cls.join(' ')}"
        data-gpu-id="${g.id}"
        data-busy="${busy ? '1' : '0'}"
        draggable="${draggable}"
        tabindex="0"
        role="button"
        aria-label="GPU ${g.id}, ${m.full}${busy ? ', busy' : ''}"
        title="${title}">
        <span class="gc-id">#${g.id}</span>
        ${Game.icons ? Game.icons.markup('cpu', 'icon-sm') : ''}
        <span class="gc-spec">${m.label}</span>
      </div>`;
    };

    box.innerHTML = zones.map(z => {
      const list = buckets[z.spec] || [];
      const count = list.length;
      const cardsHtml = list.map(cardHtml).join('');
      return `<div class="gpu-zone" data-zone-spec="${z.spec}" aria-label="${z.label}, ${count} GPU${count === 1 ? '' : 's'}">
        <div class="zone-head">
          <span class="zone-title">${z.label}</span>
          <span class="zone-count">${count}</span>
        </div>
        <div class="zone-note">${z.note}</div>
        <div class="zone-cards">${cardsHtml}</div>
        <div class="zone-banner hide" aria-live="polite"></div>
      </div>`;
    }).join('');

    // Hydrate icons inside the freshly-rendered cards.
    if (Game.icons && Game.icons.hydrate) Game.icons.hydrate(box);

    // Wire drag-and-drop.
    this._wireGpuDnD(box);
  },

  /* HTML5 drag-and-drop wiring + keyboard fallback. Idempotent: each render
     replaces the inner DOM, so listeners die with their nodes. */
  _wireGpuDnD(box) {
    const self = this;

    // Cards
    box.querySelectorAll('.gpu-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        if (card.dataset.busy === '1') {
          e.preventDefault();
          return;
        }
        const id = card.dataset.gpuId;
        try {
          e.dataTransfer.setData('text/plain', id);
          e.dataTransfer.effectAllowed = 'move';
        } catch (_) { /* some browsers throw on unusual MIME */ }
        card.classList.add('dragging');
        // Tag the box so zones can know a drag is in flight (for hover styling).
        box.classList.add('dnd-active');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        box.classList.remove('dnd-active');
        box.querySelectorAll('.gpu-zone.drop-target').forEach(z => z.classList.remove('drop-target'));
      });

      // Keyboard accessibility — Space picks up / drops; ArrowLeft/Right/Up/Down
      // moves between zones while held.
      card.addEventListener('keydown', (e) => {
        const id = parseInt(card.dataset.gpuId, 10);
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
          e.preventDefault();
          if (card.dataset.busy === '1') {
            const z = card.closest('.gpu-zone');
            self._showZoneReject(z, `GPU #${id} is busy`);
            return;
          }
          if (self._heldGpuId === id) {
            // Drop into current zone (no-op) — clear held state.
            self._heldGpuId = null;
            card.classList.remove('held');
          } else {
            // Pick up.
            self._heldGpuId = id;
            box.querySelectorAll('.gpu-card.held').forEach(c => c.classList.remove('held'));
            card.classList.add('held');
          }
        } else if (self._heldGpuId === id && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const order = self._gpuZones.map(z => z.spec);
          const cur = (Game.state.gpus.find(g => g.id === id) || {}).spec || 'general';
          let idx = order.indexOf(cur);
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') idx = Math.max(0, idx - 1);
          else idx = Math.min(order.length - 1, idx + 1);
          const targetSpec = order[idx];
          const zoneEl = box.querySelector(`.gpu-zone[data-zone-spec="${targetSpec}"]`);
          const moved = self._moveGpu(id, targetSpec, zoneEl);
          if (moved) {
            // Re-render and refocus the card in its new zone.
            if (Game.ui && Game.ui.refresh) Game.ui.refresh();
            const newCard = document.querySelector(`.gpu-card[data-gpu-id="${id}"]`);
            if (newCard) {
              newCard.classList.add('held');
              newCard.focus();
            }
          }
        } else if (e.key === 'Escape' && self._heldGpuId === id) {
          self._heldGpuId = null;
          card.classList.remove('held');
        }
      });
    });

    // Zones
    box.querySelectorAll('.gpu-zone').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        // Required to allow drop.
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drop-target');
      });
      zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        zone.classList.add('drop-target');
      });
      zone.addEventListener('dragleave', (e) => {
        // Only clear if we're actually leaving the zone (not entering a child).
        if (e.relatedTarget && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('drop-target');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drop-target');
        let id = NaN;
        try { id = parseInt(e.dataTransfer.getData('text/plain'), 10); } catch (_) {}
        if (isNaN(id)) return;
        const targetSpec = zone.dataset.zoneSpec;
        const moved = self._moveGpu(id, targetSpec, zone);
        if (moved && Game.ui && Game.ui.refresh) Game.ui.refresh();
      });
    });
  },

  _renderUpgrades() {
    const s = Game.state;
    const box = document.getElementById('ops-upgrades-tree');
    if (!box) return;
    const list = (Game.upgrades && Game.upgrades.list) ? Game.upgrades.list : [];
    if (!list.length) {
      box.innerHTML = '<div style="color: var(--text-faint); font-size: 12px;">No upgrades loaded.</div>';
      return;
    }
    const arch = s.archetypeId ? Game.archetypes[s.archetypeId] : null;

    // Discovery-aware filter — show only upgrades the player can buy now
    // or has otherwise unlocked the branch for. Falls back gracefully if
    // the discovery module is absent (renders the legacy full list).
    let visible;
    let teasers = [];
    if (Game.discovery && Game.discovery.upgradesVisible) {
      const result = Game.discovery.upgradesVisible(s);
      visible = result.visible;
      teasers = result.teasers || [];
    } else {
      const exclusiveBranches = ['race-posture', 'interp-stack', 'ecosystem', 'prestige'];
      visible = list.filter(u => {
        if ((u.requireTier || 0) > s.capabilityTier + 1) return false;
        if (exclusiveBranches.indexOf(u.branch) >= 0) {
          if (!arch || arch.exclusiveBranch !== u.branch) return false;
        }
        return true;
      });
    }

    // Group by branch
    const byBranch = {};
    for (const u of visible) {
      if (!byBranch[u.branch]) byBranch[u.branch] = [];
      byBranch[u.branch].push(u);
    }

    const branchOrder = ['capability', 'deployment', 'safety', 'operations', 'race-posture', 'interp-stack', 'ecosystem', 'prestige'];
    const branchLabels = {
      capability: 'Capability',
      deployment: 'Deployment',
      safety: 'Safety',
      operations: 'Operations / Autopilot',
      'race-posture': 'Race Posture',
      'interp-stack': 'Interpretability Stack',
      ecosystem: 'Ecosystem',
      prestige: 'Prestige',
    };
    const branchIcons = {
      capability: '🧠',
      deployment: '📡',
      safety: '🛡',
      operations: '⚙',
      'race-posture': '🔥',
      'interp-stack': '🔍',
      ecosystem: '🌐',
      prestige: '🎓',
    };

    // Index teasers by branch for inline rendering at the bottom of each.
    const teasersByBranch = {};
    for (const t of teasers) {
      if (!teasersByBranch[t.branch]) teasersByBranch[t.branch] = [];
      teasersByBranch[t.branch].push(t);
    }

    const renderedHtml = branchOrder
      .filter(b => (byBranch[b] && byBranch[b].length) || teasersByBranch[b])
      .map(branch => {
        const items = (byBranch[branch] || []).map(u => {
          const owned = !!s.upgrades[u.id];
          let cls = 'upgrade-item';
          let canBuy = false;
          if (owned) {
            cls += ' purchased';
          } else {
            const check = Game.upgrades.canPurchase(u.id, s);
            if (check.ok) {
              canBuy = true;
            } else {
              cls += ' locked';
            }
          }
          const c = u.cost || {};
          const costParts = [];
          if (c.compute) costParts.push('⚡' + Game.ui.fmt(c.compute));
          if (c.money) costParts.push('$' + Game.ui.fmt(c.money));
          if (c.capability) costParts.push('cap ' + Game.ui.fmt(c.capability));
          const costStr = costParts.join(' · ') || 'free';

          return `<div class="${cls}" data-upgrade-id="${u.id}" data-can-buy="${canBuy ? '1' : '0'}">
            <div style="flex: 1;">
              <div class="ug-name">${u.name}${owned ? ' ✓' : ''}</div>
              <div class="ug-flavor">${u.short || u.flavor || ''}</div>
            </div>
            <div class="ug-cost">${costStr}</div>
          </div>`;
        }).join('');
        const teaserItems = (teasersByBranch[branch] || []).map(t => {
          const icon = branchIcons[branch] || '?';
          return `<div class="upgrade-item teaser" data-teaser="1">
            <div style="flex: 1;">
              <div class="ug-name">${icon} ???</div>
              <div class="ug-flavor">${t.label}</div>
            </div>
            <div class="ug-cost">—</div>
          </div>`;
        }).join('');
        return `<div class="upgrade-branch">
          <h3>${branchLabels[branch] || branch}</h3>
          <div class="upgrade-list">${items}${teaserItems}</div>
        </div>`;
      }).join('');

    box.innerHTML = renderedHtml;

    box.querySelectorAll('.upgrade-item[data-can-buy="1"]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.upgradeId;
        if (Game.upgrades && Game.upgrades.purchase) Game.upgrades.purchase(id);
      });
    });
  },
};
