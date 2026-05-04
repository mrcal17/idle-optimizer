/* deployments.js — Deployment lifecycle.
   A *trained* model becomes a *deployed* model when the player picks a
   domain and assigns inference-spec GPUs to it. Each deployment is a
   discrete economic engine: revenue, pressure deltas, and incident
   exposure all derive from (a) the deployment's domain, (b) how many
   GPUs it occupies, and (c) the underlying model's identity (tier,
   brand, capability).

   Why this exists: previously, inference-spec GPUs auto-generated
   passive revenue untethered from any specific model. That made
   "deploying" purely an upgrade-path action with no decision weight.
   Now, deployment is the act that converts a model into income — and
   the player has to pick how to deploy it, which has different
   economic and pressure profiles.

   Loaded after training.js, before scene scripts. Defensive: this
   module attaches to window.Game; sim.js calls Game.deployments.tick()
   only if loaded.
*/

window.Game = window.Game || {};

Game.deployments = (function () {

  /* ---------- domain catalogue ---------- */

  const domains = [
    {
      id: 'consumer',
      name: 'Consumer Chat',
      icon: '💬',
      baseRevPerGpu: 3.0,
      dependencePerGpu: 0.06,
      trustDelta: -0.005,
      controlDelta: 0,
      incidentMult: 1.4,
      brandScale: 0.04,        // adds (brand * brandScale) to per-GPU revenue
      blurb: 'Public-facing chat. Big revenue, big exposure.',
    },
    {
      id: 'enterprise',
      name: 'Enterprise / B2B',
      icon: '🏢',
      baseRevPerGpu: 2.0,
      dependencePerGpu: 0.03,
      trustDelta: 0,
      controlDelta: 0,
      incidentMult: 0.8,
      capabilityScale: 0.04,   // capability tier scales per-GPU revenue
      blurb: 'Steady contracts. Quiet wins. Slow renegotiations.',
    },
    {
      id: 'research',
      name: 'Research Preview',
      icon: '🔬',
      baseRevPerGpu: 0.8,
      dependencePerGpu: 0.01,
      trustDelta: 0.012,
      controlDelta: 0,
      incidentMult: 0.5,
      capabilityBonus: 0.04,   // adds direct capability per tick per GPU
      blurb: 'Limited release to credentialed researchers. Builds reputation.',
    },
    {
      id: 'internal',
      name: 'Internal Only',
      icon: '🔒',
      baseRevPerGpu: 0,
      dependencePerGpu: 0,
      trustDelta: 0,
      controlDelta: 0,
      incidentMult: 0.1,
      alignmentBonus: 0.05,    // adds to control per tick per GPU (gentle)
      insightBonus: 0.2,       // adds to insight per tick per GPU
      blurb: 'Kept in-house. No revenue, but deepens our understanding.',
    },
  ];

  function getDomain(id) {
    return domains.find(d => d.id === id) || null;
  }

  /* ---------- model resolution helpers ---------- */
  /* The parallel modelIdentity agent is enriching state.models with id +
     status fields. We work with whatever shape exists today. */

  function findModel(modelId) {
    const s = Game.state;
    if (!s || !s.models) return null;
    const numericId = (typeof modelId === 'string' && modelId.trim() !== '' && !Number.isNaN(Number(modelId)))
      ? Number(modelId)
      : modelId;
    // Prefer .id; fall back to tier-keyed lookup if id missing.
    let m = s.models.find(x => x.id === modelId || x.id === numericId);
    if (m) return m;
    // Fallback: treat modelId as tier index for legacy-shape models.
    m = s.models.find(x => x.tier === modelId || x.tier === numericId);
    return m || null;
  }

  function modelDisplayName(model) {
    if (!model) return 'a model';
    return model.name || model.modelName || ('Tier ' + (model.tier || 0));
  }

  function modelBrand(model) {
    if (!model) return 0;
    if (typeof model.brand === 'number') return model.brand;
    // Reasonable default: brand correlates with tier + post-trainings.
    return (model.tier || 0) * 8 + (model.postTrainings || 0) * 4;
  }

  function modelCapability(model) {
    if (!model) return 0;
    if (typeof model.capability === 'number') return model.capability;
    // Fallback: model capability tracks tier.
    return (model.tier || 0);
  }

  /* ---------- GPU helpers ---------- */

  function gpuById(id) {
    const s = Game.state;
    if (!s) return null;
    return s.gpus.find(g => g.id === id) || null;
  }

  function inferenceGpus() {
    const s = Game.state;
    if (!s) return [];
    return s.gpus.filter(g => g.spec === 'inference');
  }

  /* GPUs allocated across all deployments (so we can show "free" inference
     GPUs in the deploy overlay without double-counting). */
  function allocatedGpuIds() {
    const ids = new Set();
    for (const d of Game.deployments.list) {
      for (const id of (d.gpuIds || [])) ids.add(id);
    }
    return ids;
  }

  function freeInferenceGpus() {
    const allocated = allocatedGpuIds();
    return inferenceGpus().filter(g => !allocated.has(g.id) && !g.busyJobId);
  }

  /* ---------- lifecycle ---------- */

  let _nextId = 1;

  function start(modelId, domainId, gpuIds) {
    const s = Game.state;
    if (!s) return null;
    const domain = getDomain(domainId);
    if (!domain) {
      Game.addLog(`Deployment domain "${domainId}" not recognised.`, 'warn');
      return null;
    }
    const model = findModel(modelId);
    if (!model) {
      Game.addLog('Cannot deploy — model not found.', 'warn');
      return null;
    }

    /* Validate GPU list — only inference-spec, not already allocated. */
    const allocated = allocatedGpuIds();
    const validGpuIds = [];
    for (const id of (gpuIds || [])) {
      const g = gpuById(id);
      if (!g) continue;
      if (g.spec !== 'inference') continue;
      if (g.busyJobId) continue;
      if (allocated.has(g.id)) continue;
      validGpuIds.push(g.id);
    }
    if (!validGpuIds.length) {
      Game.addLog('No free inference GPUs to allocate. Specialize a GPU as inference first.', 'warn');
      return null;
    }

    const dep = {
      id: _nextId++,
      modelId: model.id != null ? model.id : model.tier,
      domainId: domain.id,
      gpuIds: validGpuIds.slice(),
      startDay: s.day,
      totalRevenue: 0,
    };
    Game.deployments.list.push(dep);

    /* Mutate model status if the modelIdentity agent's shape is in place. */
    if ('status' in model || 'deploymentId' in model) {
      model.status = 'deployed';
      model.deploymentId = dep.id;
    }

    Game.addLog(
      `Deployed ${modelDisplayName(model)} to ${domain.name} on ${validGpuIds.length} GPU${validGpuIds.length === 1 ? '' : 's'}.`,
      'tier'
    );
    if (Game.events && Game.events.advise) {
      Game.events.advise('Deployment Lead', `${modelDisplayName(model)} is live in ${domain.name}.`);
    }
    return dep.id;
  }

  function scaleDeployment(deploymentId, gpuIds) {
    const dep = Game.deployments.list.find(d => d.id === deploymentId);
    if (!dep) return false;
    /* Validate the requested GPU set — must be inference, and not allocated
       to OTHER deployments. (Allocated to THIS deployment is fine — it's
       just keeping the same GPU.) */
    const otherAllocated = new Set();
    for (const d of Game.deployments.list) {
      if (d.id === deploymentId) continue;
      for (const id of (d.gpuIds || [])) otherAllocated.add(id);
    }
    const valid = [];
    for (const id of (gpuIds || [])) {
      const g = gpuById(id);
      if (!g || g.spec !== 'inference') continue;
      if (otherAllocated.has(g.id)) continue;
      valid.push(g.id);
    }
    dep.gpuIds = valid;
    return true;
  }

  /* Convenience: bump GPU count up or down by 1, picking from free pool. */
  function scaleByDelta(deploymentId, delta) {
    const dep = Game.deployments.list.find(d => d.id === deploymentId);
    if (!dep) return false;
    if (delta > 0) {
      const free = freeInferenceGpus();
      if (!free.length) {
        if (Game.events && Game.events.advise) {
          Game.events.advise('Ops Lead', 'No free inference GPUs. Specialize another GPU as inference.');
        }
        return false;
      }
      dep.gpuIds.push(free[0].id);
      return true;
    }
    if (delta < 0) {
      if (dep.gpuIds.length <= 0) return false;
      dep.gpuIds.pop();
      return true;
    }
    return false;
  }

  function retire(deploymentId) {
    const idx = Game.deployments.list.findIndex(d => d.id === deploymentId);
    if (idx < 0) return false;
    const dep = Game.deployments.list[idx];
    const model = findModel(dep.modelId);
    if (model && ('status' in model || 'deploymentId' in model)) {
      model.status = 'trained';
      model.deploymentId = null;
    }
    Game.deployments.list.splice(idx, 1);
    Game.addLog(
      `Retired deployment of ${modelDisplayName(model)} from ${(getDomain(dep.domainId) && getDomain(dep.domainId).name) || dep.domainId}.`,
      ''
    );
    return true;
  }

  function byModel(modelId) {
    return Game.deployments.list.find(d => {
      if (d.modelId === modelId) return true;
      // Defensive: legacy tier-keyed lookup.
      const m = findModel(modelId);
      return m && d.modelId === (m.id != null ? m.id : m.tier);
    }) || null;
  }

  /* ---------- per-tick economics ---------- */

  function tick() {
    const s = Game.state;
    if (!s) return;
    if (!Game.deployments.list.length) return;

    for (const dep of Game.deployments.list) {
      const domain = getDomain(dep.domainId);
      if (!domain) continue;
      const gpuCount = dep.gpuIds.length;
      if (!gpuCount) continue;  // scaling down — inactive

      const model = findModel(dep.modelId);
      const brand = modelBrand(model);
      const cap = modelCapability(model);
      const arch = (Game.archetypes && s.archetypeId) ? Game.archetypes[s.archetypeId] : null;
      let revenueMod = arch ? (arch.revenueMod || 1) : 1;
      if (s.flags['public-api']) revenueMod *= 1.3;
      if (s.flags['fleet-ops']) revenueMod *= 1.4;
      if (s.flags['agent-products']) revenueMod *= 1.75;
      if (s.flags['agent-fleet-deployed']) revenueMod *= 3;
      if (s.flags['agent-fleet-pilot']) revenueMod *= 1.5;

      /* Per-GPU revenue:
         base + brand-driven uplift (consumer) + capability-driven uplift (enterprise).
         Internal/research collapse to 0 / 0.8 base respectively. */
      let perGpu = domain.baseRevPerGpu;
      if (domain.brandScale) perGpu += brand * domain.brandScale;
      if (domain.capabilityScale) perGpu += cap * domain.capabilityScale;
      const rev = perGpu * gpuCount * revenueMod;

      if (rev > 0) {
        s.money += rev;
        s.stats.totalRevenue = (s.stats.totalRevenue || 0) + rev;
        dep.totalRevenue += rev;
      }

      /* Pressure deltas — scaled by GPU count so a 4-GPU consumer
         deployment hurts trust faster than a 1-GPU one. */
      if (domain.dependencePerGpu) {
        s.dependence = Math.max(0, Math.min(100, s.dependence + domain.dependencePerGpu * gpuCount));
      }
      if (domain.trustDelta) {
        s.trust = Math.max(0, Math.min(100, s.trust + domain.trustDelta * gpuCount));
      }
      if (domain.controlDelta) {
        s.control = Math.max(0, Math.min(100, s.control + domain.controlDelta * gpuCount));
      }

      /* Domain-specific bonuses. */
      if (domain.capabilityBonus) {
        s.capability += domain.capabilityBonus * gpuCount;
      }
      if (domain.insightBonus) {
        s.insight = (s.insight || 0) + domain.insightBonus * gpuCount;
      }
      if (domain.alignmentBonus) {
        s.control = Math.max(0, Math.min(100, s.control + domain.alignmentBonus * gpuCount * 0.01));
      }
    }
  }

  /* ---------- projection helpers (for the deploy overlay) ---------- */

  function projectRevenue(domainId, gpuCount, model) {
    const s = Game.state;
    const domain = getDomain(domainId);
    if (!domain) return 0;
    const brand = modelBrand(model);
    const cap = modelCapability(model);
    const arch = (Game.archetypes && s && s.archetypeId) ? Game.archetypes[s.archetypeId] : null;
    let revenueMod = arch ? (arch.revenueMod || 1) : 1;
    if (s && s.flags['public-api']) revenueMod *= 1.3;
    if (s && s.flags['fleet-ops']) revenueMod *= 1.4;
    if (s && s.flags['agent-products']) revenueMod *= 1.75;
    if (s && s.flags['agent-fleet-deployed']) revenueMod *= 3;
    if (s && s.flags['agent-fleet-pilot']) revenueMod *= 1.5;
    let perGpu = domain.baseRevPerGpu;
    if (domain.brandScale) perGpu += brand * domain.brandScale;
    if (domain.capabilityScale) perGpu += cap * domain.capabilityScale;
    return perGpu * gpuCount * revenueMod;
  }

  /* ---------- deploy-overlay UI logic ----------
     Lives here (not in operations.js) so the modelIdentity agent's
     "Deploy now" button on a report card can call openOverlay() too,
     not just the operations panel. */

  // Per-overlay-session state.
  let _overlayCtx = null;

  function _formatDelta(n, suffix) {
    if (!n) return '0';
    const sign = n > 0 ? '+' : '';
    return sign + n.toFixed(3) + (suffix || '');
  }

  function _tierName(t) {
    if (Game.tiers && Game.tiers[t]) return Game.tiers[t].name;
    return 'Tier ' + (t || 0);
  }

  function _renderDomainGrid() {
    if (!_overlayCtx) return;
    const grid = document.getElementById('deploy-domain-grid');
    if (!grid) return;
    const model = _overlayCtx.model;
    const sample = _overlayCtx.gpuCount || 1;
    grid.innerHTML = domains.map(d => {
      const proj = projectRevenue(d.id, sample, model);
      const selected = (_overlayCtx.domainId === d.id);
      // Pressure summary line.
      const pressureBits = [];
      if (d.dependencePerGpu) pressureBits.push(`Dep ${_formatDelta(d.dependencePerGpu * sample)}`);
      if (d.trustDelta) pressureBits.push(`Trust ${_formatDelta(d.trustDelta * sample)}`);
      if (d.controlDelta) pressureBits.push(`Ctrl ${_formatDelta(d.controlDelta * sample)}`);
      if (d.alignmentBonus) pressureBits.push(`+Align`);
      if (d.insightBonus) pressureBits.push(`+Insight`);
      if (d.capabilityBonus) pressureBits.push(`+Cap`);
      const pressureStr = pressureBits.length ? pressureBits.join(' · ') : 'no pressure';
      let riskLabel;
      if (d.incidentMult >= 1.3) riskLabel = 'High';
      else if (d.incidentMult >= 0.9) riskLabel = 'Moderate';
      else if (d.incidentMult >= 0.4) riskLabel = 'Low';
      else riskLabel = 'Minimal';
      return `<div class="deploy-domain-card ${selected ? 'selected' : ''}" data-domain="${d.id}">
        <div class="ddc-head">
          <span class="ddc-icon">${d.icon}</span>
          <span class="ddc-name">${d.name}</span>
        </div>
        <div class="ddc-blurb">${d.blurb}</div>
        <div class="ddc-stat-row">
          <span class="ddc-stat"><span class="lbl">Rev/tick</span><span class="val">$${proj.toFixed(2)}</span></span>
          <span class="ddc-stat"><span class="lbl">Risk</span><span class="val">${riskLabel}</span></span>
        </div>
        <div class="ddc-pressure">${pressureStr}</div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.deploy-domain-card').forEach(card => {
      card.addEventListener('click', () => {
        if (!_overlayCtx) return;
        _overlayCtx.domainId = card.dataset.domain;
        _renderDomainGrid();
        _renderProjection();
      });
    });
  }

  function _renderGpuAllocator() {
    if (!_overlayCtx) return;
    const box = document.getElementById('deploy-gpu-allocator');
    if (!box) return;
    const free = freeInferenceGpus();
    const totalAvailable = free.length;
    if (totalAvailable === 0) {
      box.innerHTML = `<div class="deploy-warn">
        You'll need to specialize a GPU as <strong>inference</strong> first
        (Operations → GPU Specialization). Inference GPUs already on a
        deployment are not eligible.
      </div>`;
      return;
    }
    // Clamp picked count to [1, totalAvailable].
    if (_overlayCtx.gpuCount < 1) _overlayCtx.gpuCount = 1;
    if (_overlayCtx.gpuCount > totalAvailable) _overlayCtx.gpuCount = totalAvailable;
    box.innerHTML = `<div class="deploy-gpu-row">
      <span class="dgr-label">GPUs allocated</span>
      <button class="dgr-step" data-step="-1" ${_overlayCtx.gpuCount <= 1 ? 'disabled' : ''}>−</button>
      <span class="dgr-count">${_overlayCtx.gpuCount}</span>
      <button class="dgr-step" data-step="+1" ${_overlayCtx.gpuCount >= totalAvailable ? 'disabled' : ''}>+</button>
      <span class="dgr-pool">of ${totalAvailable} free inference GPU${totalAvailable === 1 ? '' : 's'}</span>
    </div>`;
    box.querySelectorAll('.dgr-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.step, 10);
        _overlayCtx.gpuCount = Math.max(1, Math.min(totalAvailable, _overlayCtx.gpuCount + step));
        _renderGpuAllocator();
        _renderDomainGrid();
        _renderProjection();
      });
    });
  }

  function _renderProjection() {
    if (!_overlayCtx) return;
    const box = document.getElementById('deploy-projection');
    const confirmBtn = document.getElementById('deploy-confirm');
    if (!box) return;
    const free = freeInferenceGpus();
    const ready = _overlayCtx.domainId && _overlayCtx.gpuCount >= 1 && free.length >= 1;
    if (confirmBtn) confirmBtn.disabled = !ready;
    if (!_overlayCtx.domainId) {
      box.innerHTML = `<div class="deploy-projection-empty">Pick a domain.</div>`;
      return;
    }
    const d = getDomain(_overlayCtx.domainId);
    const proj = projectRevenue(d.id, _overlayCtx.gpuCount, _overlayCtx.model);
    box.innerHTML = `<div class="deploy-projection-line">
      Projected: <strong>$${proj.toFixed(2)}/tick</strong>
      from ${_overlayCtx.gpuCount} GPU${_overlayCtx.gpuCount === 1 ? '' : 's'} on ${d.name}.
    </div>`;
  }

  function openOverlay(modelId) {
    const overlay = document.getElementById('deploy-overlay');
    if (!overlay) return;
    const model = findModel(modelId);
    if (!model) {
      Game.addLog('Cannot open deployment dialog — model not found.', 'warn');
      return;
    }
    const free = freeInferenceGpus();
    _overlayCtx = {
      model,
      modelId: model.id != null ? model.id : model.tier,
      domainId: null,
      gpuCount: free.length ? Math.min(2, free.length) : 1,
    };

    const titleEl = document.getElementById('deploy-title');
    if (titleEl) titleEl.textContent = `Deploy ${modelDisplayName(model)}`;
    const lineEl = document.getElementById('deploy-model-line');
    if (lineEl) {
      const tierLabel = _tierName(model.tier || 0);
      const verLabel = (model.version != null) ? ` v${model.version}` : '';
      lineEl.textContent = `${modelDisplayName(model)}${verLabel} · ${tierLabel}`;
    }

    _renderDomainGrid();
    _renderGpuAllocator();
    _renderProjection();
    overlay.classList.remove('hidden');

    /* Wire confirm/cancel (rebind each open since handlers close over ctx). */
    const confirmBtn = document.getElementById('deploy-confirm');
    const cancelBtn = document.getElementById('deploy-cancel');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        if (!_overlayCtx || !_overlayCtx.domainId) return;
        const free = freeInferenceGpus();
        if (!free.length) return;
        const pick = free.slice(0, _overlayCtx.gpuCount).map(g => g.id);
        const okId = start(_overlayCtx.modelId, _overlayCtx.domainId, pick);
        if (okId) closeOverlay();
      };
    }
    if (cancelBtn) {
      cancelBtn.onclick = closeOverlay;
    }
  }

  function closeOverlay() {
    const overlay = document.getElementById('deploy-overlay');
    if (overlay) overlay.classList.add('hidden');
    _overlayCtx = null;
  }

  function reset() {
    _nextId = 1;
    _overlayCtx = null;
    Game.deployments.list = [];
    if (Game.state) Game.state.deployments = Game.deployments.list;
  }

  /* ---------- expose ---------- */

  return {
    domains,
    list: [],          // active deployments
    getDomain,
    start,
    scaleDeployment,
    scaleByDelta,
    retire,
    byModel,
    tick,
    projectRevenue,
    inferenceGpus,
    freeInferenceGpus,
    allocatedGpuIds,
    findModel,
    modelDisplayName,
    openOverlay,
    closeOverlay,
    reset,
  };

})();
