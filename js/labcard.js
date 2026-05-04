/* labcard.js — Canvas-based Lab Card generator.
   1200×675, tweet-shaped. Composed text-first per spec §9.
   No URL, no QR, no watermark. */

window.Game = window.Game || {};

Game.labcard = (function() {

  const W = 1200;
  const H = 675;

  function ensureCanvas() {
    let canvas = document.querySelector('#ending-labcard canvas');
    if (!canvas) {
      const wrap = document.getElementById('ending-labcard');
      canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      if (wrap) {
        wrap.innerHTML = '';
        wrap.appendChild(canvas);
      }
    } else {
      canvas.width = W;
      canvas.height = H;
    }
    return canvas;
  }

  function paletteFor(ending) {
    // Win = saturated, loss = desaturated.
    const losses = ['trust-collapse', 'control-collapse', 'manual-quit', 'pyrrhic', 'captured', 'drift'];
    const isLoss = ending && (
      losses.indexOf(ending.id) >= 0 ||
      (ending.type && (ending.type === 'loss' || ending.type === 'collapse'))
    );

    if (isLoss) {
      return {
        bg: '#1a1612',
        bgGrad: '#0e0c0a',
        accent: '#8a7e72',
        text: '#a89a8a',
        textDim: '#6a6058',
        bar: '#6a5a4a',
        barTrack: '#0e0c0a',
        good: '#7a8a7e',
        warn: '#a89070',
        bad: '#aa7a70',
      };
    }
    return {
      bg: '#1a1612',
      bgGrad: '#221d18',
      accent: '#f0d9b8',
      text: '#e8d5b8',
      textDim: '#a89a86',
      bar: '#e8a566',
      barTrack: '#0e0c0a',
      good: '#7fb88a',
      warn: '#d9a05c',
      bad: '#c97a6a',
    };
  }

  function drawBar(ctx, x, y, w, h, pct, color, trackColor) {
    ctx.fillStyle = trackColor;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    const fillW = Math.max(0, Math.min(1, pct / 100)) * w;
    ctx.fillRect(x, y, fillW, h);
  }

  function render(endingObj) {
    const s = Game.state;
    if (!s) return;
    const canvas = ensureCanvas();
    const ctx = canvas.getContext('2d');
    const ending = endingObj || s.ending || { id: 'unresolved', title: 'Unresolved', tag: '—', type: 'loss' };
    const pal = paletteFor(ending);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, pal.bgGrad);
    grad.addColorStop(1, pal.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle border
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    /* === Top: crest, lab name, outcome badge === */
    // Crest (large emoji)
    ctx.font = '88px serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.accent;
    ctx.fillText(s.crest || '⚙', 60, 50);

    // Lab name
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillStyle = pal.accent;
    ctx.fillText(s.labName || 'Foundry Labs', 170, 60);

    // Subtitle (archetype)
    const arch = s.archetypeId ? Game.archetypes[s.archetypeId] : null;
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = pal.textDim;
    ctx.fillText(arch ? `${arch.name} · ${arch.tag}` : 'Independent Lab', 170, 124);

    // Outcome badge (top-right)
    const badgeText = (ending.tag || ending.title || ending.id || '—').toUpperCase();
    ctx.font = 'bold 18px "Courier New", monospace';
    const badgeMetrics = ctx.measureText(badgeText);
    const badgeW = Math.max(180, badgeMetrics.width + 40);
    const badgeH = 44;
    const badgeX = W - 60 - badgeW;
    const badgeY = 50;
    ctx.fillStyle = pal.accent;
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.fillStyle = pal.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Ending title underneath badge
    if (ending.title) {
      ctx.font = '18px Georgia, serif';
      ctx.fillStyle = pal.text;
      ctx.textAlign = 'right';
      ctx.fillText(ending.title, W - 60, badgeY + badgeH + 12);
      ctx.textAlign = 'left';
    }

    /* === Three pressure bars === */
    const barsY = 200;
    const barsX = 60;
    const barW = 480;
    const barH = 16;
    const lineGap = 50;

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    ctx.fillText('TRUST', barsX, barsY - 22);
    drawBar(ctx, barsX, barsY, barW, barH, s.trust, s.trust < 25 ? pal.bad : (s.trust < 55 ? pal.warn : pal.good), pal.barTrack);
    ctx.fillStyle = pal.text;
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText(Math.round(s.trust) + ' / 100', barsX + barW + 16, barsY);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    ctx.fillText('CONTROL', barsX, barsY - 22 + lineGap);
    drawBar(ctx, barsX, barsY + lineGap, barW, barH, s.control, s.control < 25 ? pal.bad : (s.control < 55 ? pal.warn : pal.good), pal.barTrack);
    ctx.fillStyle = pal.text;
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText(Math.round(s.control) + ' / 100', barsX + barW + 16, barsY + lineGap);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    ctx.fillText('DEPENDENCE', barsX, barsY - 22 + lineGap * 2);
    drawBar(ctx, barsX, barsY + lineGap * 2, barW, barH, s.dependence, s.dependence > 75 ? pal.bad : (s.dependence > 45 ? pal.warn : pal.good), pal.barTrack);
    ctx.fillStyle = pal.text;
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText(Math.round(s.dependence) + ' / 100', barsX + barW + 16, barsY + lineGap * 2);

    /* === Stats line === */
    const statsY = 380;
    const tier = (Game.tiers && Game.tiers[s.capabilityTier]) ? Game.tiers[s.capabilityTier] : { name: 'Spark' };
    const pivotCount = (s.stats && s.stats.pivotCount) || Object.keys(s.pivots || {}).length;
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = pal.accent;
    ctx.fillText(`${tier.name.toUpperCase()} · DAY ${Math.floor(s.day)} · ${pivotCount} PIVOT${pivotCount === 1 ? '' : 'S'}`, barsX, statsY);

    /* === YOUR MODELS list (right column top) === */
    const colX = 700;
    let colY = 200;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    ctx.fillText('YOUR MODELS', colX, colY);
    colY += 26;
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = pal.text;
    const models = s.models || [];
    if (!models.length) {
      ctx.fillStyle = pal.textDim;
      ctx.fillText('— none completed —', colX, colY);
      colY += 22;
    } else {
      models.slice(0, 5).forEach(m => {
        const tname = (Game.tiers && Game.tiers[m.tier]) ? Game.tiers[m.tier].name : 'T' + m.tier;
        const v = (m.version !== undefined) ? ('v0.' + m.version) : '';
        ctx.fillText(`• ${tname} · ${m.name || 'unnamed'} ${v}`, colX, colY);
        colY += 24;
      });
      if (models.length > 5) {
        ctx.fillStyle = pal.textDim;
        ctx.fillText(`… and ${models.length - 5} more`, colX, colY);
        colY += 24;
      }
    }

    /* === KEY DECISIONS === */
    colY += 14;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    ctx.fillText('KEY DECISIONS', colX, colY);
    colY += 26;
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = pal.text;
    const pivotIds = Object.keys(s.pivots || {});
    if (!pivotIds.length) {
      ctx.fillStyle = pal.textDim;
      ctx.fillText('— none taken —', colX, colY);
      colY += 22;
    } else {
      pivotIds.slice(0, 4).forEach(pid => {
        ctx.fillText(`• ${pid} → ${s.pivots[pid]}`, colX, colY);
        colY += 22;
      });
    }

    /* === AUTOPILOT === */
    const apY = 470;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    ctx.fillText('AUTOPILOT', barsX, apY);
    ctx.font = '18px Georgia, serif';
    ctx.fillStyle = pal.text;
    const presetNames = { safe: 'Play it Safe', frontier: 'Push the Frontier', wait: 'Wait for Me', custom: 'Custom Policy' };
    const preset = s.autopilot ? s.autopilot.preset : 'wait';
    ctx.fillText(presetNames[preset] || preset, barsX, apY + 22);

    /* === Quick stats line under autopilot === */
    const stats = s.stats || {};
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = pal.textDim;
    const computeStr = Game.ui ? Game.ui.fmt(stats.totalCompute || 0) : String(Math.floor(stats.totalCompute || 0));
    const revStr = Game.ui ? Game.ui.fmt(stats.totalRevenue || 0) : String(Math.floor(stats.totalRevenue || 0));
    ctx.fillText(`Compute: ${computeStr}    Revenue: $${revStr}    Incidents: ${stats.incidentCount || 0}`, barsX, apY + 56);

    /* === Bottom strip === */
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillStyle = pal.textDim;
    ctx.textAlign = 'center';
    ctx.fillText('— Idle Optimizer —', W / 2, H - 40);
    ctx.textAlign = 'left';

    return canvas;
  }

  function download() {
    const canvas = document.querySelector('#ending-labcard canvas');
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lab-card.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Lab card download failed:', e);
    }
  }

  return { render, download };
})();
