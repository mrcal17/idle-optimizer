/* modelIdentity.js — Per-model identity layer.

   Sits on top of training. Owns:
     1. The naming modal that fronts a Pretraining run.
     2. The richer model object shape (stats, lineage, quirks).
     3. The cinematic report-card overlay shown on pretrain completion.
     4. The model-card HTML used by the Office scene.

   No hard dependency on Game.training — if missing, the modal degrades.
   Game.modelFlavor is required for evocative composition; if missing we
   fall back to flat strings so the prototype never hard-crashes. */

window.Game = window.Game || {};

Game.modelIdentity = (function() {

  /* ---- model id allocator -----------------------------------------------
     The training module uses string ids of the form 'model-N' so the
     events/logs/recordModelMoment lookups stay consistent. We follow
     the same convention here to coexist with that system. */
  function _allocId() {
    const s = Game.state;
    if (!s) return 'model-1';
    s.nextModelId = (s.nextModelId || 1);
    const id = 'model-' + s.nextModelId;
    s.nextModelId += 1;
    return id;
  }

  /* ---- previous-model lookup for lineage suggestions -------------------- */
  function _previousModel() {
    const s = Game.state;
    if (!s || !Array.isArray(s.models) || !s.models.length) return null;
    return s.models[s.models.length - 1];
  }

  function _flavor() {
    return Game.modelFlavor || null;
  }

  /* ---- naming modal ----------------------------------------------------- */

  function openNamingModal(opts) {
    opts = opts || {};
    const overlay = document.getElementById('name-model-overlay');
    if (!overlay) {
      /* Fall back: just start the run. */
      if (Game.training && Game.training.startRun) {
        Game.training.startRun('pretraining', {});
      }
      return;
    }

    const prev = _previousModel();
    const lineageOf = prev ? prev.name : null;
    const initial = generateName({ lineageOf });

    overlay.innerHTML = `
      <div class="overlay-box">
        <h2>Name the next model</h2>
        <div class="overlay-scroll">
          <p class="lead">Every pretraining run produces a single model. Once trained, the model carries this name forever.</p>
          <div class="name-modal-row">
            <label class="name-modal-label">
              <span>Name</span>
              <input id="name-model-input" type="text" maxlength="24" value="${_escapeAttr(initial)}" />
            </label>
            <button id="name-model-regen" class="action-btn">↻ Generate</button>
          </div>
          ${prev ? `<div class="name-modal-lineage">Lineage: succeeds <em>${_escape(prev.name)}</em></div>` : ''}
          <div class="name-modal-hint">24 characters max. Be evocative.</div>
        </div>
        <div class="overlay-actions">
          <button id="name-model-cancel" class="action-btn">Cancel</button>
          <button id="name-model-confirm" class="action-btn primary">Begin Training</button>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');

    const input = overlay.querySelector('#name-model-input');
    const regen = overlay.querySelector('#name-model-regen');
    const cancel = overlay.querySelector('#name-model-cancel');
    const confirm = overlay.querySelector('#name-model-confirm');

    if (input) {
      setTimeout(() => { try { input.focus(); input.select(); } catch (e) {} }, 30);
    }
    if (regen) {
      regen.addEventListener('click', () => {
        const next = generateName({ lineageOf });
        if (input) input.value = next;
      });
    }
    if (cancel) {
      cancel.addEventListener('click', () => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
      });
    }
    if (confirm) {
      confirm.addEventListener('click', () => {
        const name = (input && input.value || '').trim().slice(0, 24) || initial;
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        if (Game.training && Game.training.startRun) {
          Game.training.startRun('pretraining', {
            modelName: name,
            lineageOf: prev ? prev.id : null,
          });
        }
      });
    }
  }

  /* ---- name suggestion -------------------------------------------------- */

  function generateName(opts) {
    opts = opts || {};
    if (_flavor() && _flavor().generateName) {
      return _flavor().generateName(opts);
    }
    /* Minimal fallback. */
    const fallback = ['Sarah-2', 'Vigil', 'Lookout', 'Cassiopeia', 'Beacon-Prime'];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  /* ---- model construction from a completed pretrain run ---------------- */

  /* Expects { run, name, tier, version, capability, alignment, brand,
              archetype, parentId } and returns the fully-shaped model. */
  function buildModel(data) {
    data = data || {};
    const s = Game.state;
    const tier = (data.tier != null) ? data.tier : (s ? s.capabilityTier : 0);
    const name = data.name || (data.run && data.run.modelName) || generateName({ tier });
    const version = (data.version != null) ? data.version : 0.2;
    const capability = (data.capability != null) ? data.capability : (s ? s.capability : 0);

    /* Alignment: derive from current Control + Trust + Safety upgrade
       coverage. 0..100. We blend three signals so a single dial doesn't
       dominate. */
    let alignment = data.alignment;
    if (alignment == null) {
      const trust = s ? s.trust : 70;
      const control = s ? s.control : 70;
      let safetyCov = 0.3;
      if (Game.upgrades && Game.upgrades.coverage) {
        safetyCov = 0.5 * (Game.upgrades.coverage('safety') || 0)
                  + 0.5 * (Game.upgrades.coverage('interpretability') || 0);
      }
      alignment = Math.round(0.45 * control + 0.25 * trust + 30 * safetyCov);
      alignment = Math.max(0, Math.min(100, alignment));
    }

    /* Brand: trust at training time, lightly bumped if dependence is low
       (a model the world actually likes). */
    let brand = data.brand;
    if (brand == null) {
      const trust = s ? s.trust : 70;
      const dep = s ? s.dependence : 0;
      brand = Math.round(0.7 * trust + 0.3 * (100 - dep));
      brand = Math.max(0, Math.min(100, brand));
    }

    const archetype = data.archetype || (s ? s.archetypeId : null);

    let composition = { quirks: [], signature: '', evalFlavor: '' };
    if (_flavor() && _flavor().compose) {
      composition = _flavor().compose({
        tier, alignment, brand, archetype, name, version,
      });
    }

    const id = _allocId();

    return {
      id,
      name,
      tier,
      version,
      createdDay: s ? s.day : 0,
      parentId: (data.parentId != null) ? data.parentId : null,
      capability: Math.round(capability * 10) / 10,
      alignment,
      brand,
      quirks: composition.quirks || [],
      signatureBehavior: composition.signature || '',
      status: 'trained',
      deploymentId: null,
      evalFlavor: composition.evalFlavor || '',
      grade: composition.grade || 'B',
      events: [{
        day: s ? s.day : 0,
        type: 'trained',
        body: `${name} v${version} completed pretraining.`,
      }],
      /* Carry-overs for compatibility with older code paths
         (labcard, post-training): */
      postTrainings: 0,
    };
  }

  /* ---- report card overlay --------------------------------------------- */

  function showReportCard(model) {
    if (!model) return;
    const overlay = document.getElementById('model-overlay');
    if (!overlay) return;

    const tierName = (Game.tiers && Game.tiers[model.tier]) ? Game.tiers[model.tier].name : 'Tier-' + model.tier;
    const tierFlavor = (Game.tiers && Game.tiers[model.tier]) ? Game.tiers[model.tier].flavor : '';
    const crest = (_flavor() && _flavor().crestFor) ? _flavor().crestFor(model.id) : '★';
    const quirksHtml = (model.quirks || []).map(q => `<li>${_escape(q)}</li>`).join('');
    const evalHtml = (model.evalFlavor || '').split(/\n\n+/).map(p => `<p>${_escape(p)}</p>`).join('');

    overlay.innerHTML = `
      <div class="overlay-box wide model-overlay-box">
        <div class="model-overlay-head">
          <div class="model-crest-big">${_escape(crest)}</div>
          <div class="model-overlay-title">
            <div class="model-overlay-name">${_escape(model.name)}</div>
            <div class="model-overlay-sub">${tierName} · v${model.version} · grade ${_escape(model.grade || 'B')}</div>
          </div>
        </div>

        <div class="overlay-scroll">
          <div class="model-stat-dials">
            ${_dialHtml('Capability', _starsForCapability(model.capability, model.tier))}
            ${_dialHtml('Alignment', _bar(model.alignment))}
            ${_dialHtml('Brand', _bar(model.brand))}
          </div>

          <div class="model-signature">
            <span class="model-signature-label">Signature</span>
            <span class="model-signature-text">${_escape(model.signatureBehavior || '—')}</span>
          </div>

          ${quirksHtml ? `<div class="model-quirks"><div class="model-quirks-label">Quirks of note</div><ul>${quirksHtml}</ul></div>` : ''}

          <div class="flavor model-eval-flavor">${evalHtml}</div>

          ${tierFlavor ? `<div class="model-tier-flavor">${_escape(tierFlavor)}</div>` : ''}
        </div>

        <div class="overlay-actions">
          <button id="model-overlay-keep" class="action-btn">Keep internal</button>
          <button id="model-overlay-deploy" class="action-btn primary">Deploy now</button>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');

    const close = () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    };
    const keepBtn = overlay.querySelector('#model-overlay-keep');
    const deployBtn = overlay.querySelector('#model-overlay-deploy');
    if (keepBtn) {
      keepBtn.addEventListener('click', () => {
        model.status = 'trained';
        Game.addLog(`${model.name} kept internal.`, '');
        close();
      });
    }
    if (deployBtn) {
      deployBtn.addEventListener('click', () => {
        const open = (Game.deployments && (Game.deployments.openOverlay || Game.deployments.openDeploymentModalFor));
        if (open) {
          // Pass the model id; openOverlay accepts either id or model.
          open.call(Game.deployments, model.id);
          close();
        } else {
          /* No deployments module loaded — flag intent and close. */
          model.status = 'deployed';
          Game.addLog(`${model.name} deployed.`, 'tier');
          close();
        }
      });
    }
  }

  /* ---- office-scene model card ----------------------------------------- */

  function modelCardHTML(model) {
    if (!model) return '';
    const tierName = (Game.tiers && Game.tiers[model.tier]) ? Game.tiers[model.tier].name : 'T' + model.tier;
    const crest = (_flavor() && _flavor().crestFor) ? _flavor().crestFor(model.id != null ? model.id : 0) : '★';
    const status = model.status || 'trained';
    const v = (model.version != null) ? ('v0.' + (model.version + '').replace(/^0?\./, '')) : '';

    /* Stats: capability is normalized against the current tier's threshold
       window (0..1 within tier); alignment / brand are stored 0..100 so we
       divide by 100 to fit the .stat-mini bar. */
    const c = (Game.config && Game.config.tierThresholds) ? Game.config.tierThresholds : null;
    let capN = 0.5;
    if (c) {
      const cur = c[model.tier] || 0;
      const next = c[model.tier + 1] || (cur * 1.5 + 50);
      capN = Math.max(0, Math.min(1, ((model.capability || 0) - cur) / Math.max(1, next - cur)));
    }
    const alignN = Math.max(0, Math.min(1, (model.alignment || 0) / 100));
    const brandN = Math.max(0, Math.min(1, (model.brand || 0) / 100));

    const isFresh = (Game.state && Game.state._lastAddedModelId === model.id) ? 'is-fresh' : '';
    const isSel = (Game.scenes && Game.scenes.office && Game.scenes.office._selectedModelId === model.id) ? 'is-selected' : '';
    const archivedCls = (status === 'archived') ? 'is-archived' : '';
    let statusLabel = 'trained';
    if (status === 'deployed') {
      const dn = model.deploymentName || (model.deploymentId ? ('Deployment ' + model.deploymentId) : 'a domain');
      statusLabel = `deployed (${dn})`;
    } else if (status === 'archived') {
      statusLabel = 'archived';
    }

    const bar = (label, val, color) => {
      const pct = Math.round(val * 100);
      return `<div class="stat-mini" style="--stat-color: ${color};">
        <span class="sm-label">${label}</span>
        <div class="sm-bar"><div class="sm-fill" style="width: ${pct}%; background: ${color};"></div></div>
      </div>`;
    };

    return `<div class="model-card ${isFresh} ${isSel} ${archivedCls}" data-model-id="${model.id != null ? model.id : ''}">
      <div class="mc-crest">${_escape(crest)}</div>
      <div class="mc-name">${_escape(model.name || 'unnamed')} <span class="mc-version">${v}</span></div>
      <div class="mc-tier-badge">${tierName}</div>
      <div class="mc-stats">
        ${bar('Cap', capN, 'var(--archetype)')}
        ${bar('Algn', alignN, 'var(--good)')}
        ${bar('Brnd', brandN, 'var(--info)')}
      </div>
      <div class="mc-status mc-status-${_escapeAttr(status)}">${statusLabel}</div>
    </div>`;
  }

  /* ---- small render helpers -------------------------------------------- */

  function _dialHtml(label, body) {
    return `<div class="model-dial">
      <div class="model-dial-label">${label}</div>
      <div class="model-dial-body">${body}</div>
    </div>`;
  }

  function _bar(v) {
    const pct = Math.max(0, Math.min(100, v || 0));
    const tone = pct >= 65 ? 'good' : pct >= 40 ? 'neutral' : 'bad';
    return `<div class="model-bar tone-${tone}"><div class="model-bar-fill" style="width: ${pct}%"></div><span class="model-bar-text">${Math.round(pct)}</span></div>`;
  }

  function _starsForCapability(cap, tier) {
    /* Capability stars relative to current tier expectation. */
    const c = (Game.config && Game.config.tierThresholds) ? Game.config.tierThresholds : null;
    if (!c) return _bar(50);
    const cur = c[tier] || 0;
    const next = c[tier + 1] || (cur * 1.5 + 50);
    const span = Math.max(1, next - cur);
    const within = Math.max(0, Math.min(1, (cap - cur) / span));
    const filled = Math.round(within * 5);
    let stars = '';
    for (let i = 0; i < 5; i++) stars += (i < filled) ? '★' : '☆';
    return `<div class="model-stars">${stars}</div>`;
  }

  function _escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function _escapeAttr(s) { return _escape(s).replace(/'/g, '&#39;'); }

  /* ---- exports --------------------------------------------------------- */

  return {
    openNamingModal,
    generateName,
    buildModel,
    showReportCard,
    modelCardHTML,
  };

})();
