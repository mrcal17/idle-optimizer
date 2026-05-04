/* world.js — Stylized SVG world map.
   Regions are clickable polygons; deployments visualised as glowing dots.
   Selection panel updates with regulator activity, news flavor, deploy count. */

window.Game = window.Game || {};
Game.scenes = Game.scenes || {};

Game.scenes.world = {

  /* SVG paths cribbed as simplified polygon outlines on a 1000×500 viewBox.
     Aim is recognisable-by-silhouette, not cartographic accuracy. */
  _regions: [
    {
      id: 'na', name: 'North America',
      regulator: 'FTC / NIST oversight cycle', biasFor: 'frontier',
      shape: 'M 90,90 L 240,80 L 295,140 L 280,210 L 245,265 L 215,275 L 175,250 L 135,230 L 110,200 L 80,150 Z',
      labelXY: [170, 175],
    },
    {
      id: 'eu', name: 'Europe',
      regulator: 'EU AI Act compliance review', biasFor: 'opensource',
      shape: 'M 470,100 L 555,90 L 590,115 L 580,165 L 545,195 L 500,200 L 470,170 L 460,135 Z',
      labelXY: [515, 145],
    },
    {
      id: 'cn', name: 'China',
      regulator: 'CAC algorithm registry', biasFor: null,
      shape: 'M 715,130 L 815,115 L 870,145 L 880,200 L 845,235 L 790,235 L 740,210 L 705,175 Z',
      labelXY: [790, 180],
    },
    {
      id: 'in', name: 'India',
      regulator: 'MeitY consultative draft', biasFor: null,
      shape: 'M 660,225 L 720,215 L 740,255 L 720,300 L 685,310 L 660,275 Z',
      labelXY: [695, 265],
    },
    {
      id: 'row', name: 'Rest of World',
      regulator: 'patchwork — varies', biasFor: 'safety',
      // South America + Africa + Australia stitched into one symbolic blob (lower band)
      shape: 'M 250,310 L 320,295 L 360,335 L 345,400 L 295,440 L 245,420 L 230,365 Z   M 470,260 L 545,260 L 580,310 L 555,365 L 500,395 L 460,355 L 445,300 Z   M 800,360 L 870,355 L 900,395 L 880,425 L 825,425 L 795,395 Z',
      labelXY: [310, 370],
    },
    {
      id: 'off', name: 'Off-Grid',
      regulator: 'no formal oversight', biasFor: null,
      // Schematic island in the lower-right ocean — symbolic, not geographic
      shape: 'M 920,250 L 970,245 L 985,275 L 970,300 L 935,295 L 920,275 Z',
      labelXY: [952, 273],
    },
  ],

  _newsFlavor: [
    'op-eds; one viral, one cautious',
    'parliament debates a moratorium',
    'a model leak surfaces on a forum',
    'a hospital pilot reports good metrics',
    'a startup pivots; an incumbent buys it',
    'a strike vote in a creative-industry guild',
    'a regulator schedules another hearing',
    'a research institute publishes a benchmark',
    'a congressional letter, gently worded',
    'a leaked memo, not so gently worded',
    'a senator drafts an amendment in plain English',
    'a viral post about your lab; reception unclear',
  ],

  _selectedRegion: 'na',

  init(container) {
    container.innerHTML = `
      <div class="scene-grid split-60-40">
        <div class="col">
          <div class="panel world-map-panel">
            <h2>Geopolitical Map</h2>
            <svg id="world-svg" viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="World map">
              <defs>
                <radialGradient id="ocean-grad" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stop-color="#1c2628" stop-opacity="1"/>
                  <stop offset="100%" stop-color="#0e1314" stop-opacity="1"/>
                </radialGradient>
                <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(232,165,102,0.06)" stroke-width="2"/>
                </pattern>
              </defs>
              <rect width="1000" height="500" fill="url(#ocean-grad)"/>
              <rect width="1000" height="500" fill="url(#hatch)"/>
              <g id="world-grid"></g>
              <g id="world-regions-svg"></g>
              <g id="world-deploys"></g>
              <g id="world-labels"></g>
            </svg>
            <div id="world-power-line" class="power-line"></div>
          </div>
        </div>
        <div class="col">
          <div class="panel">
            <h2>Region Detail</h2>
            <div id="world-detail" class="world-detail"></div>
          </div>
          <div class="panel">
            <h2>Datacenter Footprint</h2>
            <div id="world-footprint"></div>
            <div id="world-power" class="power-bar"></div>
            <div id="world-bias" class="bias-line"></div>
          </div>
        </div>
      </div>
    `;
    this._buildSvgRegions();
    this._buildGraticule();
  },

  _buildGraticule() {
    const grid = document.getElementById('world-grid');
    if (!grid) return;
    const ns = 'http://www.w3.org/2000/svg';
    const out = [];
    for (let lon = 100; lon < 1000; lon += 100) {
      out.push(`<line x1="${lon}" y1="0" x2="${lon}" y2="500" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>`);
    }
    for (let lat = 100; lat < 500; lat += 100) {
      out.push(`<line x1="0" y1="${lat}" x2="1000" y2="${lat}" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>`);
    }
    grid.innerHTML = out.join('');
  },

  _buildSvgRegions() {
    const layer = document.getElementById('world-regions-svg');
    const labels = document.getElementById('world-labels');
    if (!layer || !labels) return;
    layer.innerHTML = this._regions.map(r => {
      return `<path class="region-shape" data-region="${r.id}" d="${r.shape}" />`;
    }).join('');
    labels.innerHTML = this._regions.map(r => {
      return `<text class="region-label" x="${r.labelXY[0]}" y="${r.labelXY[1]}" text-anchor="middle">${r.name.toUpperCase()}</text>`;
    }).join('');

    // Wire click handlers (delegated so we don't re-bind every render)
    layer.querySelectorAll('.region-shape').forEach(path => {
      path.addEventListener('click', () => {
        Game.scenes.world._selectedRegion = path.dataset.region;
        Game.scenes.world.render();
      });
    });
  },

  render() {
    const s = Game.state;
    if (!s) return;

    const inferenceGpus = s.gpus.filter(g => g.spec === 'inference');
    const regionCounts = {};
    for (const r of this._regions) regionCounts[r.id] = 0;
    inferenceGpus.forEach((g, i) => {
      const region = this._regions[i % this._regions.length];
      regionCounts[region.id]++;
    });

    // Update region shape state classes (selected / has-deploy)
    const arch = s.archetypeId ? Game.archetypes[s.archetypeId] : null;
    const archId = arch ? arch.id : null;
    const layer = document.getElementById('world-regions-svg');
    if (layer) {
      layer.querySelectorAll('.region-shape').forEach(path => {
        const id = path.dataset.region;
        const r = this._regions.find(x => x.id === id);
        path.classList.toggle('selected', this._selectedRegion === id);
        path.classList.toggle('has-deploy', regionCounts[id] > 0);
        path.classList.toggle('friendly', r && r.biasFor === archId);
      });
    }

    // Update deployment dots — one cluster of glowing dots per region with deploys
    const deploys = document.getElementById('world-deploys');
    if (deploys) {
      const dotMarkup = [];
      for (const r of this._regions) {
        const count = regionCounts[r.id];
        if (!count) continue;
        const cx = r.labelXY[0];
        const cy = r.labelXY[1] + 14;
        for (let i = 0; i < Math.min(count, 8); i++) {
          const angle = (i / 8) * Math.PI * 2;
          const radius = 14 + (i * 1.6);
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          dotMarkup.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" class="deploy-dot" filter="url(#dot-glow)"/>`);
        }
        if (count > 8) {
          dotMarkup.push(`<text x="${cx}" y="${cy + 32}" text-anchor="middle" class="deploy-overflow">+${count - 8}</text>`);
        }
      }
      deploys.innerHTML = dotMarkup.join('');
    }

    // Region detail panel
    const detail = document.getElementById('world-detail');
    if (detail) {
      const r = this._regions.find(x => x.id === this._selectedRegion) || this._regions[0];
      const count = regionCounts[r.id];
      const dayBucket = Math.floor(s.day / 5);
      const news = this._newsFlavor[(dayBucket + this._regions.indexOf(r)) % this._newsFlavor.length];
      const friendly = r.biasFor === archId;
      detail.innerHTML = `
        <div class="region-detail-head">
          <span class="rd-name">${r.name}</span>
          ${friendly ? '<span class="rd-friendly">favorable</span>' : ''}
        </div>
        <div class="rd-stat"><span class="lbl">Deployments</span><span class="val">${count}</span></div>
        <div class="rd-stat"><span class="lbl">Regulator</span><span class="val">${r.regulator}</span></div>
        <div class="rd-news">
          <div class="rd-news-head">Today on the wire</div>
          <em>${news}</em>
        </div>
      `;
    }

    // Footprint readout
    const footprintEl = document.getElementById('world-footprint');
    if (footprintEl) {
      const filled = Math.min(20, inferenceGpus.length);
      const blocks = '█'.repeat(filled) + '░'.repeat(20 - filled);
      footprintEl.innerHTML = `<div class="footprint-row"><span class="footprint-bar">${blocks}</span><span class="footprint-count">${inferenceGpus.length} chip${inferenceGpus.length === 1 ? '' : 's'}</span></div>`;
    }

    // Power load (grows with all GPUs + tier)
    const powerEl = document.getElementById('world-power');
    if (powerEl) {
      const totalGpus = s.gpus.length;
      const loadPct = Math.min(100, Math.round(totalGpus * 4 + s.capabilityTier * 6));
      const filledBlocks = Math.round(loadPct / 12.5);
      const bar = '█'.repeat(filledBlocks) + '░'.repeat(Math.max(0, 8 - filledBlocks));
      powerEl.textContent = `Grid load: ${bar} ${loadPct}%`;
    }

    // Bias readout
    const biasEl = document.getElementById('world-bias');
    if (biasEl) {
      const friendly = this._regions.filter(r => r.biasFor === archId).map(r => r.name);
      if (friendly.length) {
        biasEl.textContent = `${friendly.join(', ')} lean favorable to ${arch.name}.`;
      } else {
        biasEl.textContent = 'No strong regional lean.';
      }
    }
  },
};
