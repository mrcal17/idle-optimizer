/* events.js — Incidents, advisor messages, scripted thematic beats.
   Each capability tier surfaces a signature alignment problem as its
   failure mode (Spark hallucinations → Apex resolution). Incidents are
   fictional journalist tweets, regulator memos, safety-org posts that
   surface in-world flavor when pressure-bar events fire.

   Three scripted thematic beats per run (spec §3):
     1. First automation — the vending-machine moment ("4,000 units of grape soda")
     2. Mid-run inflection — more Auto-roles than human ones
     3. The last human — restraint, a single named moment late-run

   The advisor lives at #advisor-overlay as a diegetic tooltip — your
   COO / Comms Lead / Interp Lead leaving Slack-style notes. Tutorial-
   character becomes ongoing-character; no tutorial frame ever appears.
*/

window.Game = window.Game || {};

Game.events = (function() {

  const ADVISOR_TIMEOUT_MS = 12000;
  let _advisorTimer = null;

  // Incident pacing
  let _lastIncidentTick = -999;
  const INCIDENT_COOLDOWN = 60; // ticks between rolls (regardless of result)

  // Per-model moment pacing
  const MODEL_EVENT_CAP = 20;
  const MODEL_MOMENT_CHANCE = 0.003; // ~0.3% per tick per active model

  /* ---------- per-model event recorder ---------- */
  function recordModelMoment(modelId, body, type) {
    const s = Game.state;
    if (!s) return;
    const model = (s.models || []).find(m => m && (m.id === modelId || m.name === modelId));
    if (!model) return;
    if (!Array.isArray(model.events)) model.events = [];
    const entry = {
      day: Math.floor(s.day),
      body: Game.substitute ? Game.substitute(body) : body,
      type: type || '',
    };
    model.events.unshift(entry);
    if (model.events.length > MODEL_EVENT_CAP) model.events.length = MODEL_EVENT_CAP;

    // Bubble up: log + advisor for 'good' / 'milestone'
    const logType = (type === 'good' || type === 'milestone') ? 'good'
                  : (type === 'incident' ? 'incident' : '');
    Game.addLog(`${model.name || 'A model'}: ${entry.body}`, logType);
    if (type === 'good' || type === 'milestone') {
      const delightAuthors = ['Comms Lead', 'Senior PI', 'Junior Researcher', 'COO'];
      const author = delightAuthors[Math.floor(Math.random() * delightAuthors.length)];
      advise(author, entry.body);
    }
    return entry;
  }

  /* ---------- periodic positive moments ---------- */
  function maybeFireModelMoment() {
    const s = Game.state;
    if (!s || s.runEnded || s.pendingDecision) return;
    const models = (s.models || []).filter(m => m && (m.status !== 'archived'));
    if (!models.length) return;
    // ~0.3% per tick per active model
    const p = MODEL_MOMENT_CHANCE * models.length;
    if (Math.random() > p) return;
    const model = models[Math.floor(Math.random() * models.length)];
    if (!Game.modelMoments || !Game.modelMoments.pickFor) return;
    const moment = Game.modelMoments.pickFor(model, s);
    if (!moment) return;
    const id = (model.id !== undefined) ? model.id : model.name;
    recordModelMoment(id, moment.body, moment.type || 'neutral');
  }

  /* ---------- the diegetic advisor tooltip ---------- */
  function advise(author, message) {
    const overlay = document.getElementById('advisor-overlay');
    if (!overlay) return;
    const authEl = document.getElementById('advisor-author');
    const msgEl = document.getElementById('advisor-msg');
    if (authEl) authEl.textContent = author || 'COO';
    if (msgEl) msgEl.textContent = (Game.substitute ? Game.substitute(message) : message) || '';
    overlay.classList.remove('hidden');

    if (_advisorTimer) { clearTimeout(_advisorTimer); _advisorTimer = null; }
    _advisorTimer = setTimeout(() => {
      const o = document.getElementById('advisor-overlay');
      if (o) o.classList.add('hidden');
      _advisorTimer = null;
    }, ADVISOR_TIMEOUT_MS);
  }

  /* ---------- scripted beats (idempotent) ---------- */
  function scriptedBeat(id, opts) {
    const s = Game.state;
    if (!s) return;
    const flagKey = 'beat-' + id;
    if (s.flags[flagKey]) return;
    s.flags[flagKey] = true;

    const beats = {
      'first-automation': {
        author: 'COO',
        msg: "Auto-OM v1 has ordered 4,000 units of grape soda. Pending review. Charming — and a useful reminder that delegated systems do exactly what we wrote, not what we meant.",
      },
      'more-auto-than-human': {
        author: 'COO',
        msg: "Walked the floor this morning. Your office is quieter than it used to be. The agents do not look up when I pass.",
      },
      'last-human': {
        author: 'COO',
        msg: "The last human role on the roster has been swapped. Take a moment. This was a person yesterday.",
      },
      'first-incident': {
        author: 'Comms Lead',
        msg: "First incident on the books. The press will write what they write — what matters is what we do in the next 48 hours.",
      },
      'first-tier-up': {
        author: 'Senior PI',
        msg: "It's working. The eval scores came back and they are not what we trained for. We're past the threshold.",
      },
    };
    const beat = beats[id] || (opts && opts.beat);
    if (!beat) return;
    advise(beat.author, beat.msg);
    Game.addLog(`Beat: ${id}.`, 'beat');
  }

  /* ---------- Vend on-ramp (called by personnel.js when first auto-OM unlocks) ---------- */
  function firstAutomationBeat() {
    const s = Game.state;
    if (!s) return;
    s.stats.autoOmDeployed = true;
    s.stats.firstAutomationDay = s.stats.firstAutomationDay || s.day;
    s.flags['auto-om-active'] = true;
    scriptedBeat('first-automation');
  }

  /* ---------- tier-up flavor & follow-up incident roll ---------- */
  function onTierUp(tierIdx) {
    const tier = (Game.tiers || [])[tierIdx];
    if (!tier) return;
    advise(authorForTier(tierIdx), tier.flavor || `Reached ${tier.name}.`);
    if (!Game.state.flags['beat-first-tier-up']) {
      // gentle scripted beat the first time only — the advise() above is the
      // per-tier flavor; we route through scriptedBeat for the meta-moment.
      scriptedBeat('first-tier-up');
    }
    // Tier-up moment on the most recent model (defensive)
    try {
      const models = (Game.state.models || []);
      const recent = models[models.length - 1];
      if (recent) {
        const id = (recent.id !== undefined) ? recent.id : recent.name;
        recordModelMoment(
          id,
          `Tier-up moment: ${tier.name} reached. ${recent.name || 'The model'} is now ${tier.category}.`,
          'milestone'
        );
      }
    } catch (e) { console.warn('tier-up model moment failed', e); }
    // After a delay (handled by tick-cooldown), fire a tier-shaped incident.
    // We hint via flag; maybeFireIncident reads it and biases the roll.
    Game.state.flags['tier-incident-pending'] = tierIdx;
  }

  /* ---------- paradigm-shift moment ---------- */
  function onParadigmShift(shift, model) {
    const s = Game.state;
    if (!s || !shift) return;
    let target = model;
    if (!target) {
      const models = s.models || [];
      target = models[models.length - 1];
    }
    if (!target) return;
    const id = (target.id !== undefined) ? target.id : target.name;
    recordModelMoment(
      id,
      `Paradigm shift: ${shift.name || shift.id}. ${target.name || 'The model'} integrates the new approach.`,
      'milestone'
    );
  }

  function authorForTier(tierIdx) {
    if (tierIdx <= 1) return 'Senior PI';
    if (tierIdx === 2) return 'Comms Lead';
    if (tierIdx === 3) return 'Interpretability Lead';
    if (tierIdx === 4) return 'Interpretability Lead';
    return 'COO';
  }

  /* ---------- incident probability (per tick) ---------- */
  function maybeFireIncident() {
    const s = Game.state;
    if (!s || s.runEnded || s.pendingDecision) return;
    if (s.tickCount - _lastIncidentTick < INCIDENT_COOLDOWN) return;
    _lastIncidentTick = s.tickCount;

    // Base probability ramps with tier; 0.5%/tick at tier 2 (per prompt),
    // climbing toward ~3% at Pharos. Lowered by safety upgrades / interp coverage.
    const tier = s.capabilityTier || 0;
    let p = 0.0005 * Math.pow(2.0, tier);    // 0.0005, 0.001, 0.002, 0.004, 0.008, 0.016
    // Scale up if a tier-incident is queued.
    if (s.flags['tier-incident-pending'] !== undefined) {
      p = Math.min(0.5, p + 0.05);
    }
    // Compounding pressure modifier: low Trust/Control → things break more.
    const pressureMod = 1 + (Math.max(0, 60 - s.trust) / 100) + (Math.max(0, 60 - s.control) / 100);
    p *= pressureMod;
    // Safety mitigations
    const interp = (Game.upgrades && Game.upgrades.coverage) ? Game.upgrades.coverage('interpretability') : 0;
    p *= (1 - 0.7 * interp);
    if (s.flags['safety-research-active']) p *= 0.7;

    /* Deployment exposure: each active deployment scales the per-tick
       incident chance by the worst (max) of its domain incidentMult.
       Consumer-facing deployments raise the bar; internal/research
       deployments soften it. With no deployments, this is a no-op. */
    if (Game.deployments && Game.deployments.list && Game.deployments.list.length) {
      let maxMult = 0;
      for (const dep of Game.deployments.list) {
        const dom = Game.deployments.getDomain(dep.domainId);
        if (!dom) continue;
        if (dep.gpuIds.length === 0) continue;  // scaling down doesn't expose us
        if (dom.incidentMult > maxMult) maxMult = dom.incidentMult;
      }
      if (maxMult > 0) p *= maxMult;
    }

    if (Math.random() > p) return;

    // Pick + fire
    const incident = Game.incidentData && Game.incidentData.pickRandom
      ? Game.incidentData.pickRandom(s)
      : null;
    if (!incident) return;
    // Clear tier-incident flag if it was set
    if (s.flags['tier-incident-pending'] !== undefined) {
      delete s.flags['tier-incident-pending'];
    }
    fireIncident(incident);
  }

  /* ---------- training-driven incident ---------- */
  function fireIncidentFromTraining(run) {
    const s = Game.state;
    if (!s) return;
    const incident = Game.incidentData && Game.incidentData.pickRandom
      ? Game.incidentData.pickRandom(s)
      : null;
    if (!incident) return;
    Game.addLog(`Training run ${run && run.id ? '#' + run.id : ''} triggered an incident.`, 'incident');
    fireIncident(incident);
  }

  /* ---------- the actual fire ---------- */
  function fireIncident(incident) {
    const s = Game.state;
    if (!s || !incident) return;

    // Apply the immediate effect, if any
    const trustBefore = s.trust;
    try { if (incident.effect) incident.effect(s); }
    catch (e) { console.error('Incident effect failed:', incident.id, e); }
    if ((s.flags['trust-event-shield'] || 0) > 0 && s.trust < trustBefore) {
      s.trust = trustBefore;
      s.flags['trust-event-shield'] -= 1;
      Game.addLog('Defense contract shield absorbed one Trust hit.', 'incident');
    }

    s.stats.incidentCount = (s.stats.incidentCount || 0) + 1;

    // Scripted "first incident" beat
    if (s.stats.incidentCount === 1) {
      scriptedBeat('first-incident');
    }

    // Severity-coloured log entry
    const severity = incident.severity || 'mild';
    const logType = severity === 'catastrophic' ? 'catastrophic'
                  : severity === 'major' ? 'major'
                  : 'incident';
    Game.addLog(`Incident: ${incident.title || incident.id} (${severity}).`, logType);

    // If incident text references {model}, also append to that model's per-model
    // event timeline. Prefer the deployed model; fall back to the most recent.
    try {
      const flavorText = String(incident.flavor || '') + ' ' + String(incident.desc || '') + ' ' + String(incident.title || '');
      if (/\{model\}/.test(flavorText)) {
        const models = s.models || [];
        let target = models.filter(m => m && m.status === 'deployed').pop();
        if (!target) target = models[models.length - 1];
        if (target) {
          if (!Array.isArray(target.events)) target.events = [];
          const sub = Game.substitute || (x => x);
          const body = sub(incident.flavor || incident.title || ('Incident: ' + (incident.id || ''))).trim();
          target.events.unshift({ day: Math.floor(s.day), body, type: 'incident' });
          if (target.events.length > MODEL_EVENT_CAP) target.events.length = MODEL_EVENT_CAP;
        }
      }
    } catch (e) { console.warn('per-model incident append failed', e); }

    if (incident.choices && incident.choices.length) {
      // Decision-required gate: halt sim, show overlay
      s.pendingDecision = { type: 'incident', payload: incident };
      showIncident(incident);
    } else {
      // No-choice incidents still surface a brief advisor note
      if (incident.flavor) {
        advise(incident.author || 'Comms Lead', incident.flavor);
      }
    }
  }

  function showIncident(incident) {
    const overlay = document.getElementById('incident-overlay');
    const titleEl = document.getElementById('incident-title');
    const flavorEl = document.getElementById('incident-flavor');
    const descEl = document.getElementById('incident-desc');
    const choicesEl = document.getElementById('incident-choices');
    if (!overlay || !choicesEl) return;

    const sub = Game.substitute || (x => x);
    if (titleEl) titleEl.textContent = incident.title || 'Incident';
    if (flavorEl) flavorEl.textContent = sub(incident.flavor || '');
    if (descEl) descEl.textContent = sub(incident.desc || '');

    choicesEl.innerHTML = '';
    (incident.choices || []).forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'action-btn pivot-choice-btn';
      btn.textContent = choice.label || `Option ${idx + 1}`;
      btn.addEventListener('click', () => resolveIncidentChoice(incident, idx));
      choicesEl.appendChild(btn);
    });

    overlay.classList.remove('hidden');
  }

  function resolveIncidentChoice(incident, choiceIdx) {
    const s = Game.state;
    if (!s) return;
    const choice = (incident.choices || [])[choiceIdx];
    if (!choice) return;

    try { if (choice.effect) choice.effect(s); }
    catch (e) { console.error('Incident choice effect failed:', incident.id, e); }

    Game.addLog(`Incident response — ${incident.title || incident.id}: ${choice.label || ('option ' + (choiceIdx + 1))}.`, 'incident');

    // Clear gate
    if (s.pendingDecision && s.pendingDecision.type === 'incident') {
      s.pendingDecision = null;
    }
    const overlay = document.getElementById('incident-overlay');
    if (overlay) overlay.classList.add('hidden');

    if (Game.ui && Game.ui.refresh) Game.ui.refresh();
  }

  return {
    advise,
    scriptedBeat,
    onTierUp,
    onParadigmShift,
    maybeFireIncident,
    maybeFireModelMoment,
    fireIncidentFromTraining,
    fireIncident,
    showIncident,
    firstAutomationBeat,
    recordModelMoment,
  };
})();
