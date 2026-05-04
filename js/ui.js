/* ui.js — Scene routing, HUD refresh, ticker.
   Owns DOM. Reads Game.state, never writes to it (except UI-local fields like activeScene). */

window.Game = window.Game || {};
Game.ui = {
  activeScene: 'desk',
  _tickerIndex: 0,
  _lastTickerSwap: 0,
  _floatTexts: [],
  _tickerIntervalId: null,
  _navWired: false,
  _speedWired: false,
};

Game.ui.boot = function() {
  // Wire scene nav
  if (!Game.ui._navWired) {
    document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) return;
        Game.ui.showScene(btn.dataset.scene);
      });
    });
    Game.ui._navWired = true;
  }

  // Wire speed controls
  if (!Game.ui._speedWired) {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.dataset.speed, 10);
        Game.state.speed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
    Game.ui._speedWired = true;
  }

  // Initialize each scene
  if (Game.scenes) {
    for (const sceneName of ['desk', 'office', 'operations', 'world', 'logs']) {
      const scene = Game.scenes[sceneName];
      if (scene && scene.init) scene.init(document.getElementById('scene-' + sceneName));
    }
  }

  Game.ui.refreshNav();
  Game.ui.startTicker();
  Game.ui.refresh();
};

Game.ui.showScene = function(sceneName) {
  Game.ui.activeScene = sceneName;
  document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById('scene-' + sceneName);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scene === sceneName);
  });
  // Trigger scene render
  if (Game.scenes && Game.scenes[sceneName] && Game.scenes[sceneName].render) {
    Game.scenes[sceneName].render();
  }
};

Game.ui.refresh = function() {
  const s = Game.state;
  if (!s) return;
  // HUD — day counter doubles as a subtle act indicator.
  const stage = s.stage || 1;
  const actStr = stage === 1 ? 'I' : (stage === 2 ? 'II' : 'III');
  document.getElementById('hud-day').textContent = Math.floor(s.day) + ' · Act ' + actStr;
  document.getElementById('hud-compute').textContent = Game.ui.fmt(s.compute);
  document.getElementById('hud-money').textContent = '$' + Game.ui.fmt(s.money);
  document.getElementById('hud-capability').textContent = Game.ui.fmt(s.capability) + (s.capabilityTier ? ` · ${Game.tiers[s.capabilityTier].name}` : '');
  document.getElementById('hud-lab-name').textContent = s.labName;
  document.getElementById('hud-lab-crest').textContent = s.crest;

  // Status dot
  const dot = document.getElementById('status-dot');
  if (dot) {
    dot.classList.remove('status-green','status-yellow','status-red');
    dot.classList.add('status-' + Game.getStatusLevel());
  }

  // Active scene
  if (Game.scenes && Game.scenes[Game.ui.activeScene] && Game.scenes[Game.ui.activeScene].render) {
    Game.scenes[Game.ui.activeScene].render();
  }

  // Doom desaturation as pressures worsen
  const worst = Math.min(s.trust, s.control, 100 - s.dependence);
  const doom = Math.max(0, (60 - worst) / 60);
  document.documentElement.style.setProperty('--doom', doom.toFixed(2));

  // Founder vitals widget — defensive: render only if module + state present.
  if (Game.founder && Game.founder.renderVitals) Game.founder.renderVitals();
};

Game.ui.refreshNav = function() {
  const s = Game.state;
  document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
    const unlocked = s.scenesUnlocked[btn.dataset.scene];
    btn.classList.toggle('locked', !unlocked);
  });
};

Game.ui.refreshLogs = function() {
  if (Game.scenes && Game.scenes.logs && Game.scenes.logs.render && Game.ui.activeScene === 'logs') {
    Game.scenes.logs.render();
  }
};

Game.ui.fmt = function(n) {
  if (n === null || n === undefined) return '0';
  n = Math.floor(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return (n/1000).toFixed(1) + 'k';
  if (n < 1e9) return (n/1e6).toFixed(2) + 'M';
  return (n/1e9).toFixed(2) + 'B';
};

Game.ui.fmt1 = function(n) {
  return (n || 0).toFixed(1);
};

/* === Ticker === */
Game.ui.startTicker = function() {
  Game.ui.refreshTicker();
  // Periodically rebuild the ticker so state-reactive headlines surface
  if (Game.ui._tickerIntervalId) clearInterval(Game.ui._tickerIntervalId);
  Game.ui._tickerIntervalId = setInterval(Game.ui.refreshTicker, 30000);
};

Game.ui.refreshTicker = function() {
  const track = document.getElementById('ticker-track');
  if (!track || !Game.tickerHeadlines) return;
  const items = Game.tickerHeadlines.pickFor(Game.state);
  // Repeat once for seamless scroll
  track.innerHTML = items.concat(items).map(h => {
    return `<span class="ticker-item"><span class="source">${h.source || 'P(doom) Live'}:</span>${h.text}</span>`;
  }).join('');
};

/* === Float text helper for tap feedback === */
Game.ui.floatText = function(parent, text, x, y) {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.left = (x - 16) + 'px';
  el.style.top = (y - 12) + 'px';
  parent.appendChild(el);
  setTimeout(() => el.remove(), 1000);
};

/* === Generic overlay helpers === */
Game.ui.openOverlay = function(id) {
  const o = document.getElementById(id);
  if (o) o.classList.remove('hidden');
};
Game.ui.closeOverlay = function(id) {
  const o = document.getElementById(id);
  if (o) o.classList.add('hidden');
};

/* Apply archetype palette */
Game.ui.applyArchetypePalette = function(arch) {
  if (!arch) return;
  document.documentElement.style.setProperty('--archetype', arch.color || '#e8a566');
};

/* Populate archetype select screen */
Game.ui.populateArchetypeSelect = function() {
  const grid = document.getElementById('archetype-grid');
  grid.innerHTML = '';
  Object.values(Game.archetypes).forEach((arch, i) => {
    const card = document.createElement('div');
    card.className = 'archetype-card' + (i === 0 ? ' selected' : '');
    card.dataset.archId = arch.id;
    card.innerHTML = `
      <div class="arch-icon">${arch.icon || '🏢'}</div>
      <div class="arch-name">${arch.name}</div>
      <div class="arch-tag">${arch.tag}</div>
      <div class="arch-desc">${arch.desc}</div>
      <div class="arch-stats">${arch.startingDesc || ''}</div>
    `;
    card.addEventListener('click', () => {
      grid.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      grid.dataset.selected = arch.id;
    });
    grid.appendChild(card);
  });
  if (!grid.dataset.selected) grid.dataset.selected = Object.keys(Game.archetypes)[0];

  // Populate crest select
  const crests = ['⚙','🌱','🦋','🛡','🌌','🌀','🦉','🪐','🧭','🪞','🪶','🔭','🪶','🌒','🦊','🦁'];
  const crestSel = document.getElementById('lab-crest-select');
  if (crestSel && !crestSel.options.length) {
    crests.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; crestSel.appendChild(o); });
  }

  // Populate palette select
  const palettes = ['twilight','garden','brutalist','cream','steel'];
  const palSel = document.getElementById('lab-palette-select');
  if (palSel && !palSel.options.length) {
    palettes.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; palSel.appendChild(o); });
  }
};
