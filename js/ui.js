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
  _osWired: false,
  _startMenuOpen: false,
  _sceneSwapTimer: null,
  _sceneSwapToken: 0,
};

/* App registry — single source of truth for the new taskbar / start menu.
   Data-scene + data-app-id mirror the legacy #app-dock buttons so any code
   that still queries those keeps working. The desk scene is the "TAP" app
   and is the home/default app the Close button returns to. */
Game.ui.APPS = [
  { id: 'tap',   scene: 'desk',       label: 'TAP',   title: 'TAP.app — desk',         iconClass: 'icon-power'  },
  { id: 'train', scene: 'operations', label: 'TRAIN', title: 'TRAIN.app — operations', iconClass: 'icon-cpu'    },
  { id: 'team',  scene: 'office',     label: 'TEAM',  title: 'TEAM.app — office',      iconClass: 'icon-id'     },
  { id: 'wire',  scene: 'world',      label: 'WIRE',  title: 'WIRE.app — world',       iconClass: 'icon-globe'  },
  { id: 'logs',  scene: 'logs',       label: 'LOGS',  title: 'LOGS.app — timeline',    iconClass: 'icon-scroll' },
];

Game.ui.HOME_SCENE = 'desk';

Game.ui._appByScene = function(sceneName) {
  return Game.ui.APPS.find(a => a.scene === sceneName) || Game.ui.APPS[0];
};

Game.ui.boot = function() {
  // Wire app-dock (legacy launcher — hidden but back-compat) + new taskbar.
  if (!Game.ui._navWired) {
    document.querySelectorAll('#app-dock .dock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('dock-locked')) return;
        Game.ui.showScene(btn.dataset.scene);
      });
    });
    // Legacy scene-nav (still in DOM, kept hidden) for any code that
    // queried it directly.
    document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) return;
        Game.ui.showScene(btn.dataset.scene);
      });
    });
    Game.ui._navWired = true;
  }

  // Wire the OS-window chrome + taskbar + start menu.
  Game.ui._wireOsChrome();

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
  const prev = Game.ui.activeScene;
  Game.ui.activeScene = sceneName;
  const appWindow = document.getElementById('app-window');
  const token = ++Game.ui._sceneSwapToken;
  if (Game.ui._sceneSwapTimer) {
    clearTimeout(Game.ui._sceneSwapTimer);
    Game.ui._sceneSwapTimer = null;
  }
  const swap = () => {
    document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('scene-' + sceneName);
    if (target) target.classList.remove('hidden');
    if (Game.scenes && Game.scenes[sceneName] && Game.scenes[sceneName].render) {
      Game.scenes[sceneName].render();
    }
  };
  // Cross-fade window body when switching apps. Fade is 0.25s ease (CSS).
  if (appWindow && prev !== sceneName) {
    appWindow.classList.add('is-switching');
    Game.ui._sceneSwapTimer = setTimeout(() => {
      if (token !== Game.ui._sceneSwapToken) return;
      Game.ui._sceneSwapTimer = null;
      swap();
      // Next frame: drop the class to trigger fade-back-in.
      const raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      raf(() => {
        if (token === Game.ui._sceneSwapToken) appWindow.classList.remove('is-switching');
      });
    }, 120);
  } else {
    if (appWindow) appWindow.classList.remove('is-switching');
    swap();
  }
  // Mirror active state on legacy app-dock + scene-nav (back-compat).
  document.querySelectorAll('#app-dock .dock-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scene === sceneName);
  });
  document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scene === sceneName);
  });
  // Update the OS-window title + taskbar tab active state.
  Game.ui._syncOsChrome();
  // Close the start menu if it was open.
  Game.ui._setStartMenu(false);
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

  /* Workstation/Room ambient updates (terminal prompt, app counter,
     environmental decay tied to pressures). All defensive. */
  if (Game.workstation && Game.workstation.tick) Game.workstation.tick();
  if (Game.room && Game.room.tick) Game.room.tick();

  // OS taskbar: clock (in-game day) + start crest (from state.crest).
  const clock = document.getElementById('taskbar-clock');
  if (clock) clock.textContent = 'Day ' + Math.floor(s.day);
  const crest = document.getElementById('start-crest');
  if (crest && s.crest) crest.textContent = s.crest;
};

Game.ui.refreshNav = function() {
  const s = Game.state;
  if (!s) return;
  // Apply unlock state to legacy scene-nav and legacy app-dock (back-compat).
  document.querySelectorAll('#scene-nav .nav-btn').forEach(btn => {
    const unlocked = s.scenesUnlocked[btn.dataset.scene];
    btn.classList.toggle('locked', !unlocked);
  });
  document.querySelectorAll('#app-dock .dock-btn').forEach(btn => {
    const wasLocked = btn.classList.contains('dock-locked');
    const unlocked = s.scenesUnlocked[btn.dataset.scene];
    btn.classList.toggle('dock-locked', !unlocked);
    // Animate one-shot when an app freshly unlocks.
    if (wasLocked && unlocked) {
      btn.classList.add('dock-just-unlocked');
      setTimeout(() => btn.classList.remove('dock-just-unlocked'), 1700);
    }
  });
  // Rebuild the new taskbar (only unlocked apps appear) + start menu (all apps).
  Game.ui._renderTaskbarTabs();
  Game.ui._renderStartMenu();
  Game.ui._syncOsChrome();
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

/* =============================================================
   OS-window chrome + taskbar + start menu wiring
   Single-window mode in v2: only one app open at a time. The
   taskbar shows running (= unlocked) apps. The start menu lists
   ALL apps (locked ones blocked from clicking).
   ============================================================= */
Game.ui._wireOsChrome = function() {
  if (Game.ui._osWired) return;

  // Close button: returns to TAP.app (the desk scene).
  const closeBtn = document.getElementById('os-btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      Game.ui.showScene(Game.ui.HOME_SCENE);
    });
  }
  // Min/Max are no-ops in v2 (disabled), but defensively block clicks too.
  ['os-btn-min', 'os-btn-max'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', e => e.preventDefault());
  });

  // Start button: toggle start menu open/closed.
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', e => {
      e.stopPropagation();
      Game.ui._setStartMenu(!Game.ui._startMenuOpen);
    });
  }
  // Click anywhere outside the start menu/start button closes the menu.
  document.addEventListener('click', e => {
    if (!Game.ui._startMenuOpen) return;
    const menu = document.getElementById('start-menu');
    const sb = document.getElementById('start-btn');
    if (!menu) return;
    if (menu.contains(e.target) || (sb && sb.contains(e.target))) return;
    Game.ui._setStartMenu(false);
  });

  Game.ui._osWired = true;

  // Initial render so the taskbar appears even before refresh() fires.
  Game.ui._renderTaskbarTabs();
  Game.ui._renderStartMenu();
  Game.ui._syncOsChrome();
};

Game.ui._setStartMenu = function(open) {
  Game.ui._startMenuOpen = !!open;
  const menu = document.getElementById('start-menu');
  const sb = document.getElementById('start-btn');
  if (menu) menu.classList.toggle('hidden', !open);
  if (sb) {
    sb.classList.toggle('is-open', !!open);
    sb.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
};

/* Render the running-app tabs in the middle of the taskbar.
   Only unlocked apps appear (locked apps aren't "running"). */
Game.ui._renderTaskbarTabs = function() {
  const host = document.getElementById('taskbar-tabs');
  if (!host) return;
  const s = Game.state;
  const active = Game.ui.activeScene;
  host.innerHTML = '';
  Game.ui.APPS.forEach(app => {
    const unlocked = !s || (s.scenesUnlocked && s.scenesUnlocked[app.scene]);
    if (!unlocked) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'taskbar-tab' + (app.scene === active ? ' is-active' : '');
    btn.dataset.scene = app.scene;
    btn.dataset.appId = app.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', app.scene === active ? 'true' : 'false');
    btn.innerHTML = `<span class="tt-icon"><span class="icon ${app.iconClass}"></span></span><span class="tt-label">${app.label}</span>`;
    btn.addEventListener('click', () => Game.ui.showScene(app.scene));
    host.appendChild(btn);
  });
  if (Game.icons && Game.icons.hydrate) Game.icons.hydrate(host);
};

/* Render the start-menu list (all apps; locked ones rendered with a lock
   icon and not clickable). */
Game.ui._renderStartMenu = function() {
  const host = document.getElementById('start-menu-items');
  if (!host) return;
  const s = Game.state;
  host.innerHTML = '';
  Game.ui.APPS.forEach(app => {
    const unlocked = !s || (s.scenesUnlocked && s.scenesUnlocked[app.scene]);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'start-menu-item' + (unlocked ? '' : ' is-locked');
    item.dataset.scene = app.scene;
    item.dataset.appId = app.id;
    item.setAttribute('role', 'menuitem');
    if (!unlocked) item.disabled = true;
    item.innerHTML = `
      <span class="smi-icon"><span class="icon ${app.iconClass}"></span></span>
      <span class="smi-label">${app.label}.app</span>
      ${unlocked ? '' : '<span class="smi-lock"><span class="icon icon-lock"></span></span>'}
    `;
    if (unlocked) {
      item.addEventListener('click', () => {
        Game.ui.showScene(app.scene);
        Game.ui._setStartMenu(false);
      });
    }
    host.appendChild(item);
  });
  if (Game.icons && Game.icons.hydrate) Game.icons.hydrate(host);
};

/* Sync the OS-window title + active-tab state to the active scene. */
Game.ui._syncOsChrome = function() {
  const app = Game.ui._appByScene(Game.ui.activeScene);
  const title = document.getElementById('os-title');
  if (title && app) title.textContent = app.title;
  // Active OS window is always considered active in v2 (single window).
  const win = document.getElementById('os-window');
  if (win) win.classList.add('os-window-active');
  // Active tab class.
  document.querySelectorAll('#taskbar-tabs .taskbar-tab').forEach(t => {
    const isActive = t.dataset.scene === Game.ui.activeScene;
    t.classList.toggle('is-active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
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
