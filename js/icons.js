/* icons.js — Refined SVG/CSS pictogram library for Idle Optimizer.
   Per STYLE_GUIDE.md §4: no emoji glyphs in UI.

   Each icon is drawn at 16×16 in `currentColor` so it inherits text color.
   Sizing variants: .icon-sm (12px), .icon-lg (24px). Default 16px.
   Vertical alignment: -0.125em for baseline parity with text.

   Usage:
     Game.icons.svg('phone')                  -> '<svg ...>'
     Game.icons.markup('phone', 'icon-lg')    -> '<span class="icon icon-lg"><svg ...></span>'
     Game.icons.replaceEmojis(rootElement)    -> walks subtree swapping known UI emojis.

   The HTML and CSS hold the canonical emoji-to-class mapping; this file
   is the rendering layer. Player-content emojis (lab crests, founder
   portraits, model crests, personnel quirk badges) are NOT in the
   replacement table and stay as the player chose them. */

(function () {
  window.Game = window.Game || {};
  Game.icons = Game.icons || {};

  /* All glyphs share the same 16-unit viewBox. Strokes use stroke-width 1.5
     for visual consistency. Fills inherit currentColor.

     Design notes per icon:
     - power:   3-segment lightning bolt, slight inward chamfer.
     - cpu:     square chip in plan view with 8 pin lines (2 per side).
     - id:      rounded card with a small portrait dot and two text rules.
     - globe:   circle + 1 vertical meridian + 2 latitude curves.
     - scroll:  rolled paper outline with two end-rolls + line ruling.
     - book:    closed book in 3/4 view with spine band.
     - phone:   rotary handset, J-shaped curved line.
     - mug:     U-cup with side handle loop, plus a small lip.
     - plant:   trapezoid pot + 3 leaves rising from the rim.
     - monitor: rectangular CRT face with stand and base.
     - lock:    padlock with shackle and keyhole.
     - x:       two diagonals (CSS-only via pseudo-elements).
     - min:     bottom rule (CSS-only via pseudo-elements).
     - max:     square outline (CSS-only via pseudo-elements).
  */

  const GLYPHS = {
    power: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
  <path d="M9.4 1.2 3.4 9h3.4l-1 5.8L13.6 7H10l1-5.8z"/>
</svg>`,

    cpu: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square" aria-hidden="true">
  <rect x="3.5" y="3.5" width="9" height="9"/>
  <rect x="6" y="6" width="4" height="4"/>
  <line x1="5" y1="1.5" x2="5" y2="3.5"/>
  <line x1="8" y1="1.5" x2="8" y2="3.5"/>
  <line x1="11" y1="1.5" x2="11" y2="3.5"/>
  <line x1="5" y1="12.5" x2="5" y2="14.5"/>
  <line x1="8" y1="12.5" x2="8" y2="14.5"/>
  <line x1="11" y1="12.5" x2="11" y2="14.5"/>
  <line x1="1.5" y1="6" x2="3.5" y2="6"/>
  <line x1="1.5" y1="9" x2="3.5" y2="9"/>
  <line x1="12.5" y1="6" x2="14.5" y2="6"/>
  <line x1="12.5" y1="9" x2="14.5" y2="9"/>
</svg>`,

    id: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="1.5" y="3.5" width="13" height="9" rx="1.2"/>
  <circle cx="5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/>
  <line x1="8" y1="6.5" x2="12.5" y2="6.5"/>
  <line x1="8" y1="9" x2="12" y2="9"/>
  <line x1="3.5" y1="10.5" x2="6.5" y2="10.5"/>
</svg>`,

    globe: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
  <circle cx="8" cy="8" r="6"/>
  <ellipse cx="8" cy="8" rx="2.6" ry="6"/>
  <line x1="2" y1="8" x2="14" y2="8"/>
  <path d="M2.6 5 Q8 6.4 13.4 5"/>
  <path d="M2.6 11 Q8 9.6 13.4 11"/>
</svg>`,

    scroll: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 3.5 H11 a2 2 0 0 1 2 2 V11 a1.5 1.5 0 0 0 1.5 1.5 H5.5 A2 2 0 0 1 3.5 10.5 V5.5 a2 2 0 0 0 -2 -2 H3 z"/>
  <line x1="5.5" y1="6" x2="10.5" y2="6"/>
  <line x1="5.5" y1="8" x2="10.5" y2="8"/>
  <line x1="5.5" y1="10" x2="9.5" y2="10"/>
</svg>`,

    book: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 2.5 H12 a1 1 0 0 1 1 1 V13 a0.5 0.5 0 0 1 -0.5 0.5 H4 A1 1 0 0 1 3 12.5 z"/>
  <line x1="5" y1="2.5" x2="5" y2="13.5"/>
  <line x1="6.5" y1="5" x2="11" y2="5"/>
  <line x1="6.5" y1="7" x2="11" y2="7"/>
</svg>`,

    phone: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.2 4 a1.5 1.5 0 0 1 1.5 -1.5 h1.6 a0.8 0.8 0 0 1 0.8 0.7 l0.4 2.1 a0.8 0.8 0 0 1 -0.4 0.85 l-1.1 0.6 a8 8 0 0 0 4.2 4.2 l0.6 -1.1 a0.8 0.8 0 0 1 0.85 -0.4 l2.1 0.4 a0.8 0.8 0 0 1 0.7 0.8 v1.6 A1.5 1.5 0 0 1 12 13.5 A9.5 9.5 0 0 1 3.2 4 z"/>
</svg>`,

    mug: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 4 H10.5 V11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 z"/>
  <path d="M10.5 6 H12 a1.5 1.5 0 0 1 0 3 H10.5"/>
  <line x1="3" y1="6" x2="10.5" y2="6"/>
</svg>`,

    plant: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 9 H12 L11 14 H5 z"/>
  <line x1="3.5" y1="9" x2="12.5" y2="9"/>
  <path d="M8 9 V4"/>
  <path d="M8 5.5 Q5.5 4.5 4.5 2.5 Q6.5 3 8 5.5"/>
  <path d="M8 5.5 Q10.5 4.5 11.5 2.5 Q9.5 3 8 5.5"/>
  <path d="M8 7.5 Q6.5 7 5.5 5.5 Q7 6 8 7.5"/>
</svg>`,

    monitor: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true">
  <rect x="1.5" y="2.5" width="13" height="9" rx="0.5"/>
  <line x1="6" y1="14" x2="10" y2="14"/>
  <line x1="8" y1="11.5" x2="8" y2="14"/>
</svg>`,

    lock: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3.5" y="7.5" width="9" height="6.5" rx="0.8" fill="currentColor" fill-opacity="0.15"/>
  <path d="M5.5 7.5 V5.5 a2.5 2.5 0 0 1 5 0 V7.5"/>
  <circle cx="8" cy="10.4" r="0.7" fill="currentColor" stroke="none"/>
  <line x1="8" y1="10.8" x2="8" y2="12.2"/>
</svg>`,
  };

  /* Map of UI emoji glyphs to icon names. Player-content emojis are
     intentionally absent — see archetypes.js, founder-data.js, model-flavor.js. */
  const EMOJI_TO_ICON = {
    '⚡': 'power',     // ⚡
    '⚙': 'cpu',       // ⚙ (UI dock + hud-lab-crest fallback only)
    '🪪': 'id',  // 🪪
    '🌐': 'globe', // 🌐
    '📜': 'scroll', // 📜
    '📕': 'book',   // 📕
    '☎': 'phone',     // ☎
    '☕': 'mug',       // ☕
    '🌿': 'plant', // 🌿
    '🔒': 'lock',  // 🔒
  };

  /* Pure-CSS glyphs (no SVG): handled entirely by the icon classes
     in styles.css under the Icons block. */
  const CSS_ONLY = new Set(['x', 'min', 'max']);
  const SIZE_CLASSES = new Set(['icon-sm', 'icon-lg', 'icon-xl', 'icon-xxl']);

  /* Return the bare inner SVG markup (or empty string for CSS-only icons). */
  Game.icons.svg = function (name) {
    if (CSS_ONLY.has(name)) return '';
    return GLYPHS[name] || '';
  };

  /* Return a wrapped <span class="icon icon-NAME"> with the icon inside.
     extraClasses is an optional space-separated string. */
  Game.icons.markup = function (name, extraClasses) {
    const cls = ['icon', 'icon-' + name];
    if (extraClasses) cls.push(extraClasses);
    const inner = Game.icons.svg(name);
    return '<span class="' + cls.join(' ') + '" aria-hidden="true">' + inner + '</span>';
  };

  /* DOM helper: build a real <span> element. */
  Game.icons.el = function (name, extraClasses) {
    const span = document.createElement('span');
    span.className = ('icon icon-' + name + (extraClasses ? ' ' + extraClasses : '')).trim();
    span.setAttribute('aria-hidden', 'true');
    if (!CSS_ONLY.has(name)) span.innerHTML = GLYPHS[name] || '';
    return span;
  };

  /* Walk a subtree and replace any text node containing a known UI emoji
     glyph with the corresponding icon span. Skips elements marked with
     [data-keep-emoji] (player content). Used after JS templates render. */
  Game.icons.replaceEmojis = function (root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (p && p.closest('[data-keep-emoji]')) return NodeFilter.FILTER_REJECT;
        for (const k in EMOJI_TO_ICON) {
          if (node.nodeValue.indexOf(k) !== -1) return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    });
    const targets = [];
    let n;
    while ((n = walker.nextNode())) targets.push(n);
    targets.forEach(node => {
      let text = node.nodeValue;
      const frag = document.createDocumentFragment();
      let buf = '';
      let i = 0;
      while (i < text.length) {
        let matched = null;
        for (const k in EMOJI_TO_ICON) {
          if (text.substr(i, k.length) === k) { matched = k; break; }
        }
        if (matched) {
          if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; }
          frag.appendChild(Game.icons.el(EMOJI_TO_ICON[matched]));
          i += matched.length;
        } else {
          buf += text[i];
          i++;
        }
      }
      if (buf) frag.appendChild(document.createTextNode(buf));
      node.parentNode.replaceChild(frag, node);
    });
  };

  /* Hydrate icon classes that exist in HTML without inner SVG yet. */
  Game.icons.hydrate = function (root) {
    const scope = root || document;
    scope.querySelectorAll('.icon').forEach(span => {
      if (span.firstElementChild) return; // already hydrated
      const cls = Array.from(span.classList).find(c => c.startsWith('icon-') && !SIZE_CLASSES.has(c));
      if (!cls) return;
      const name = cls.replace(/^icon-/, '');
      if (CSS_ONLY.has(name)) return; // pure CSS pictograms — no SVG payload
      const svg = GLYPHS[name];
      if (svg) span.innerHTML = svg;
    });
  };

  /* Auto-hydrate any icon spans already in the DOM at script load. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Game.icons.hydrate());
  } else {
    Game.icons.hydrate();
  }
})();
