/* office.js — Office tier, GPU fleet, personnel, models, hire/buy actions. */

window.Game = window.Game || {};
Game.scenes = Game.scenes || {};

Game.scenes.office = {

  init(container) {
    container.innerHTML = `
      <div class="panel office-scene" style="padding: 10px 14px;">
        <div class="office-tier-label" id="office-tier-label">Spark — single-room garage</div>
      </div>

      <div class="scene-grid split-50-50">
        <div class="col">
          <div class="panel">
            <h3>GPU Fleet</h3>
            <div id="office-gpu-totals" style="font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); margin-bottom: 6px;"></div>
            <div class="gpu-row" id="office-gpu-row"></div>
            <div>
              <button class="action-btn" id="office-buy-gpu">Buy GPU <span class="cost" id="office-buy-gpu-cost"></span></button>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="panel">
            <h3>Personnel</h3>
            <div class="personnel-row" id="office-personnel-row"></div>
            <div id="office-hire-actions" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
          </div>
        </div>
      </div>

      <div class="panel team-chemistry" id="office-team-chemistry">
        <h3>Team Chemistry</h3>
        <div class="team-chemistry-body" id="office-team-chemistry-body"></div>
      </div>

      <div class="panel">
        <h3>Models</h3>
        <div class="models-row" id="office-models-row"></div>
        <div class="model-detail-panel hidden" id="office-model-detail"></div>
      </div>
    `;
    this.bindHandlers(container);
  },

  _selectedModelId: null,

  _crestFor(model) {
    if (!model) return '◆';
    if (model.crest) return model.crest;
    // deterministic emoji from model id/name
    const pool = ['🦉', '🦊', '🐉', '🦄', '🪐', '🔮', '🜂', '✦', '⚙', '◈', '☼', '☄', '🜍', '⟡', '✺', '❖'];
    const seed = String(model.id || model.name || 'x');
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
  },

  _statBar(label, val, color) {
    const v = Math.max(0, Math.min(1, (typeof val === 'number') ? val : 0.5));
    const pct = Math.round(v * 100);
    return `<div class="stat-mini" style="--stat-color: ${color};">
      <span class="sm-label">${label}</span>
      <div class="sm-bar"><div class="sm-fill" style="width: ${pct}%; background: ${color};"></div></div>
    </div>`;
  },

  _modelCardHTML(model) {
    // Prefer the dedicated identity module if available
    if (Game.modelIdentity && typeof Game.modelIdentity.modelCardHTML === 'function') {
      try { return Game.modelIdentity.modelCardHTML(model); }
      catch (e) { /* fall through to inline fallback */ }
    }
    const crest = this._crestFor(model);
    const tier = (Game.tiers && Game.tiers[model.tier]) ? Game.tiers[model.tier] : null;
    const tierName = tier ? tier.name : ('T' + model.tier);
    const v = (model.version !== undefined) ? ('v0.' + (model.version + '').replace(/^0?\./, '')) : '';
    const status = model.status || 'trained';
    let statusLabel = 'trained';
    if (status === 'deployed') {
      const dn = model.deploymentName || (model.deploymentId ? ('Deployment ' + model.deploymentId) : 'a domain');
      statusLabel = `deployed (${dn})`;
    } else if (status === 'archived') {
      statusLabel = 'archived';
    }
    const cap = (typeof model.capability === 'number') ? model.capability : 0.5;
    const align = (typeof model.alignment === 'number') ? model.alignment : 0.5;
    const brand = (typeof model.brand === 'number') ? model.brand : 0.5;
    const isFresh = (Game.state && Game.state._lastAddedModelId === model.id) ? 'is-fresh' : '';
    const isSel = (this._selectedModelId === model.id) ? 'is-selected' : '';
    const archivedCls = (status === 'archived') ? 'is-archived' : '';
    return `<div class="model-card ${isFresh} ${isSel} ${archivedCls}" data-model-id="${model.id || ''}">
      <div class="mc-crest">${crest}</div>
      <div class="mc-name">${model.name || 'unnamed'} <span class="mc-version">${v}</span></div>
      <div class="mc-tier-badge">${tierName}</div>
      <div class="mc-stats">
        ${this._statBar('Cap', cap, 'var(--archetype)')}
        ${this._statBar('Algn', align, 'var(--good)')}
        ${this._statBar('Brnd', brand, 'var(--info)')}
      </div>
      <div class="mc-status mc-status-${status}">${statusLabel}</div>
    </div>`;
  },

  _renderModelDetail(model) {
    const panel = document.getElementById('office-model-detail');
    if (!panel) return;
    if (!model) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }
    const s = Game.state;
    const crest = this._crestFor(model);
    const tier = (Game.tiers && Game.tiers[model.tier]) ? Game.tiers[model.tier] : null;
    const tierName = tier ? tier.name : ('T' + model.tier);
    const v = (model.version !== undefined) ? ('v0.' + (model.version + '').replace(/^0?\./, '')) : '';
    const ageDays = (typeof model.createdDay === 'number') ? Math.max(0, Math.floor(s.day) - model.createdDay) : null;
    const events = Array.isArray(model.events) ? model.events : [];
    const quirks = Array.isArray(model.quirks) ? model.quirks : [];
    const evalText = model.evalFlavor || '';
    const sigBeh = model.signatureBehavior || '';
    let parentLine = '';
    if (model.parentId) {
      const parent = (s.models || []).find(m => m.id === model.parentId);
      const pname = parent ? (parent.name || 'unnamed') : 'an earlier model';
      parentLine = `<div class="md-lineage">Successor to <a class="md-link" data-parent-id="${model.parentId}">${pname}</a></div>`;
    }
    const status = model.status || 'trained';
    const deployBtn = (status === 'archived')
      ? ''
      : `<button class="action-btn" data-md-action="deploy">Deploy</button>`;
    const archiveBtn = (status === 'archived')
      ? ''
      : `<button class="action-btn" data-md-action="archive">Archive</button>`;
    const renameBtn = `<button class="action-btn" data-md-action="rename">Rename</button>`;

    const timelineHTML = events.length
      ? `<ul class="timeline-list">${events.map(ev => `
          <li class="tl-entry tl-${ev.type || ''}">
            <span class="tl-day">Day ${ev.day}</span>
            <span class="tl-body">${ev.body || ''}</span>
          </li>`).join('')}</ul>`
      : `<div class="md-empty">No events yet. The model is new to the world.</div>`;

    const quirksHTML = quirks.length
      ? `<div class="md-quirks"><strong>Quirks:</strong><ul>${quirks.map(q => `<li>${q}</li>`).join('')}</ul></div>`
      : '';
    const sigHTML = sigBeh
      ? `<div class="md-signature"><span class="md-sig-label">Signature behavior</span><p>${sigBeh}</p></div>`
      : '';
    const evalHTML = evalText
      ? `<div class="md-eval">${evalText.split('\n').map(p => `<p>${p}</p>`).join('')}</div>`
      : '';

    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="md-head">
        <div class="md-crest">${crest}</div>
        <div class="md-id">
          <div class="md-name">${model.name || 'unnamed'} <span class="md-version">${v}</span></div>
          <div class="md-meta">${tierName}${ageDays !== null ? ' · age ' + ageDays + 'd' : ''} · ${status}</div>
          ${parentLine}
        </div>
        <button class="md-close" aria-label="Close" data-md-action="close">×</button>
      </div>
      ${evalHTML}
      ${quirksHTML}
      ${sigHTML}
      <div class="md-section-label">Timeline</div>
      ${timelineHTML}
      <div class="md-actions">${deployBtn}${archiveBtn}${renameBtn}</div>
    `;
    // Wire actions
    const self = this;
    panel.querySelectorAll('[data-md-action]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const action = btn.dataset.mdAction;
        self._handleDetailAction(action, model);
      });
    });
    const parentLink = panel.querySelector('[data-parent-id]');
    if (parentLink) {
      parentLink.addEventListener('click', () => {
        const pid = parentLink.dataset.parentId;
        self._selectedModelId = pid;
        if (Game.ui && Game.ui.refresh) Game.ui.refresh();
      });
    }
  },

  _handleDetailAction(action, model) {
    const s = Game.state;
    if (!s || !model) return;
    if (action === 'close') {
      this._selectedModelId = null;
      this._renderModelDetail(null);
      return;
    }
    if (action === 'deploy') {
      if (Game.deployments && typeof Game.deployments.openOverlay === 'function') {
        Game.deployments.openOverlay(model.id != null ? model.id : model.tier);
      } else {
        Game.addLog('Deployment system not loaded.', 'warn');
      }
      return;
    }
    if (action === 'archive') {
      const ok = window.confirm(`Archive ${model.name || 'this model'}? It will stop receiving moments and disappear from the active row.`);
      if (!ok) return;
      model.status = 'archived';
      Game.addLog(`${model.name || 'A model'} archived on Day ${Math.floor(s.day)}.`, '');
      if (Game.events && Game.events.recordModelMoment) {
        Game.events.recordModelMoment(model.id,
          `Archived on Day ${Math.floor(s.day)}.`,
          'neutral');
      }
      this._selectedModelId = null;
      this._renderModelDetail(null);
      if (Game.ui && Game.ui.refresh) Game.ui.refresh();
      return;
    }
    if (action === 'rename') {
      const newName = window.prompt('Rename model:', model.name || '');
      if (!newName) return;
      const trimmed = newName.trim().slice(0, 32);
      if (!trimmed) return;
      const old = model.name;
      model.name = trimmed;
      Game.addLog(`Renamed ${old} to ${trimmed}.`, '');
      if (Game.ui && Game.ui.refresh) Game.ui.refresh();
      return;
    }
  },

  _renderTeamChemistry(s) {
    const body = document.getElementById('office-team-chemistry-body');
    if (!body) return;
    /* Hide the whole panel until at least one person is on staff. */
    const panel = document.getElementById('office-team-chemistry');
    if (panel) {
      if (!s.personnel || !s.personnel.length) {
        panel.classList.add('hidden');
        return;
      } else {
        panel.classList.remove('hidden');
      }
    }
    const active = (Game.synergies && Game.synergies.activeSynergies)
      ? Game.synergies.activeSynergies(s)
      : [];
    if (!active.length) {
      body.innerHTML = `<div class="team-chemistry-empty">No synergies yet.</div>`;
      return;
    }
    body.innerHTML = active.map(syn => {
      const pills = (Game.synergies && Game.synergies.summarizeEffect)
        ? Game.synergies.summarizeEffect(syn.effect)
        : [];
      const pillHtml = pills.map(p =>
        `<span class="synergy-pill ${p.good ? 'good' : 'bad'}">${p.text}</span>`
      ).join('');
      return `<div class="synergy-card">
        <div class="synergy-card-head">
          <span class="synergy-name">${syn.name}</span>
        </div>
        <div class="synergy-flavor">${syn.flavor || ''}</div>
        <div class="synergy-pills">${pillHtml}</div>
      </div>`;
    }).join('');
  },

  bindHandlers(container) {
    const buyBtn = container.querySelector('#office-buy-gpu');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const s = Game.state;
        if (!s) return;
        const cost = Game.scenes.office._gpuCost();
        if (s.money < cost) {
          Game.addLog('Cannot afford GPU.', 'warn');
          return;
        }
        s.money -= cost;
        Game.addGpu('general');
        Game.addLog('Purchased a general-purpose GPU.', '');
      });
    }
  },

  _gpuCost() {
    const s = Game.state;
    const c = Game.config.gpu;
    const arch = s.archetypeId ? Game.archetypes[s.archetypeId] : null;
    const priceMod = (arch && arch.gpuPriceMod) || 1;
    const count = s.gpus.length;
    return Math.round(c.purchaseCostBase * Math.pow(c.purchaseCostGrowth, count) * priceMod);
  },

  render() {
    const s = Game.state;
    if (!s) return;

    // Tier label
    const tier = (Game.tiers && Game.tiers[s.capabilityTier]) ? Game.tiers[s.capabilityTier] : null;
    const tierEl = document.getElementById('office-tier-label');
    if (tierEl && tier) {
      const flavorMap = {
        0: 'single-room garage',
        1: 'open-plan startup loft',
        2: 'corporate floor with conference rooms',
        3: 'campus with security badges',
        4: 'multi-building research compound',
        5: 'something larger than a company',
      };
      tierEl.textContent = `${tier.name} — ${flavorMap[s.capabilityTier] || tier.category}`;
    }

    // GPU totals
    const totals = { general: 0, training: 0, research: 0, inference: 0 };
    for (const g of s.gpus) totals[g.spec] = (totals[g.spec] || 0) + 1;
    const totalsEl = document.getElementById('office-gpu-totals');
    if (totalsEl) {
      totalsEl.textContent = `Total: ${s.gpus.length} · Gen: ${totals.general} · Train: ${totals.training} · Research: ${totals.research} · Inference: ${totals.inference}`;
    }

    // GPU cells
    const gpuRow = document.getElementById('office-gpu-row');
    if (gpuRow) {
      if (!s.gpus.length) {
        gpuRow.innerHTML = '<div style="color: var(--text-faint); font-size: 12px;">No GPUs yet.</div>';
      } else {
        gpuRow.innerHTML = s.gpus.map(g => {
          const stateClass = g.busyJobId ? 'busy' : 'idle';
          const specClass = g.spec || 'general';
          const icon = g.busyJobId ? '▣' : '▢';
          return `<div class="gpu-cell ${stateClass} ${specClass}" data-gpu-id="${g.id}">
            <span>${icon}</span>
            <span class="spec-tag">${(g.spec || 'gen').slice(0,4)}</span>
          </div>`;
        }).join('');
      }
    }

    // Buy GPU cost
    const costEl = document.getElementById('office-buy-gpu-cost');
    if (costEl) costEl.textContent = '$' + Game.ui.fmt(this._gpuCost());
    const buyBtn = document.getElementById('office-buy-gpu');
    if (buyBtn) buyBtn.disabled = (s.money < this._gpuCost());

    // Personnel cells
    const persRow = document.getElementById('office-personnel-row');
    if (persRow) {
      if (!s.personnel.length) {
        persRow.innerHTML = '<div style="color: var(--text-faint); font-size: 12px;">Solo founder. No employees yet.</div>';
      } else {
        persRow.innerHTML = s.personnel.map(p => {
          const role = (Game.personnelData && Game.personnelData.roles)
            ? Game.personnelData.roles.find(r => r.name === p.role)
            : null;
          const icon = role ? role.icon : '👤';
          const autoClass = (p.level >= 2) ? 'auto' : '';
          const levelLabel = (Game.personnelData && Game.personnelData.levelLabels)
            ? Game.personnelData.levelLabels[p.level] || ''
            : '';
          /* Render small badge row for the rolled quirks. Each badge is
             an emoji with title=name+desc so hovering reveals the lore. */
          let quirkRow = '';
          if (Array.isArray(p.quirks) && p.quirks.length && Game.personnelQuirks && Game.personnelQuirks.byId) {
            const badges = p.quirks
              .map(qid => Game.personnelQuirks.byId(qid))
              .filter(q => q)
              .map(q => {
                const tip = `${q.name} — ${q.desc}`.replace(/"/g, '&quot;');
                return `<span class="quirk-badge" title="${tip}">${q.icon}</span>`;
              })
              .join('');
            if (badges) quirkRow = `<span class="quirk-row">${badges}</span>`;
          }
          return `<div class="personnel-cell ${autoClass}" data-personnel-id="${p.id}" title="${levelLabel}">
            <span class="portrait">${icon}</span>
            <span class="name">${p.name}</span>
            <span class="role">${p.role}</span>
            ${quirkRow}
          </div>`;
        }).join('');

        // Wire click for promote/fire menu
        persRow.querySelectorAll('.personnel-cell').forEach(cell => {
          cell.addEventListener('click', () => {
            const id = parseInt(cell.dataset.personnelId, 10);
            Game.scenes.office._openPersonnelMenu(id);
          });
        });
      }
    }

    // Hire actions
    const hireBox = document.getElementById('office-hire-actions');
    if (hireBox && Game.personnelData && Game.personnelData.roles) {
      const roles = Game.personnelData.availableFor
        ? Game.personnelData.availableFor(s.archetypeId)
        : Game.personnelData.roles;
      hireBox.innerHTML = roles.map(role => {
        const cost = Game.personnelData.hireCost ? Game.personnelData.hireCost(role.key) : role.baseCost;
        const disabled = s.money < cost;
        return `<button class="action-btn" data-hire-role="${role.key}" ${disabled ? 'disabled' : ''}>
          ${role.icon} Hire ${role.name} <span class="cost">$${Game.ui.fmt(cost)}</span>
        </button>`;
      }).join('');
      hireBox.querySelectorAll('button[data-hire-role]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.hireRole;
          if (Game.personnel && Game.personnel.hire) {
            Game.personnel.hire(key);
          }
        });
      });
    }

    // Team chemistry panel (active synergies)
    this._renderTeamChemistry(s);

    // Models row
    const modelsRow = document.getElementById('office-models-row');
    if (modelsRow) {
      const models = (s.models || []).filter(m => m && m.status !== 'archived');
      if (!models.length) {
        modelsRow.innerHTML = `<div class="models-empty">
          <p>No models yet. Train one to give the lab something to ship.</p>
          <button class="action-btn" id="office-models-go-ops">Go to Operations</button>
        </div>`;
        const goBtn = document.getElementById('office-models-go-ops');
        if (goBtn) {
          goBtn.addEventListener('click', () => {
            if (Game.ui && Game.ui.showScene) Game.ui.showScene('operations');
          });
        }
      } else {
        modelsRow.innerHTML = models.map(m => this._modelCardHTML(m)).join('');
        const self = this;
        modelsRow.querySelectorAll('.model-card').forEach(card => {
          card.addEventListener('click', () => {
            const id = card.dataset.modelId;
            // Toggle: clicking selected card closes it
            if (self._selectedModelId === id) {
              self._selectedModelId = null;
              self._renderModelDetail(null);
              if (Game.ui && Game.ui.refresh) Game.ui.refresh();
              return;
            }
            self._selectedModelId = id;
            const model = (Game.state.models || []).find(mm => mm.id === id || mm.name === id);
            self._renderModelDetail(model);
            // Update card selection class without full refresh
            modelsRow.querySelectorAll('.model-card').forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
          });
        });
      }
      // Clear the freshly-added marker after one render so the fade-in only plays once
      if (s._lastAddedModelId) {
        // Defer one tick so CSS animation kicks in before we clear
        setTimeout(() => { if (Game.state) delete Game.state._lastAddedModelId; }, 800);
      }
    }

    // Refresh detail panel if a selection persists
    if (this._selectedModelId) {
      const model = (s.models || []).find(m => m.id === this._selectedModelId || m.name === this._selectedModelId);
      if (model) {
        this._renderModelDetail(model);
      } else {
        // Model gone (archived from elsewhere) — close panel
        this._selectedModelId = null;
        this._renderModelDetail(null);
      }
    } else {
      const panel = document.getElementById('office-model-detail');
      if (panel) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
      }
    }
  },

  _openPersonnelMenu(id) {
    const s = Game.state;
    if (!s) return;
    const p = s.personnel.find(x => x.id === id);
    if (!p) return;
    // Simple confirm-based menu — minimal but functional
    const choice = window.prompt(
      `${p.name} — ${p.role}\nLevel: ${p.level} (${(Game.personnelData.levelLabels[p.level] || '')})\n\nType: 'promote' to advance automation, 'fire' to dismiss, or cancel.`,
      ''
    );
    if (!choice) return;
    if (choice.toLowerCase() === 'fire') {
      if (Game.personnel && Game.personnel.fire) Game.personnel.fire(id);
    } else if (choice.toLowerCase() === 'promote') {
      if (Game.personnel && Game.personnel.promoteAutomation) {
        Game.personnel.promoteAutomation(id);
      } else {
        p.level = Math.min(3, (p.level || 0) + 1);
      }
    }
  },
};
