# Idle Optimizer — Style Guide

Single source of truth. Every UI element must conform. When in doubt, restraint.

---

## 1. Aesthetic posture

**Refined. Tactile. Elegant. Intentional.**

Reference points:
- *Severance* — warm cream + cool slate + a restrained signature orange
- *The Witness* — palette discipline, no rendered element wasted
- Classic Mac OS (System 7 / OS 8 platinum) — chiseled chrome, restrained color
- Risograph print — limited spot color, soft grain, warm whites
- *Reigns* — paper texture, crisp typography, painted moments

Anti-references — what we are NOT:
- The Anthropic warm-brown marketing palette (overused)
- Generic flat-design with bright accents
- Neon CRT cyberpunk
- Skeuomorphic faux-wood / faux-leather (Apple iOS 6 era)
- Emoji-as-icon (too playful, breaks consistency)

The doom theme is signaled by **desaturation toward cool-grey**, never by red. Red is reserved for genuine alarm states.

---

## 2. Color system

All colors live as CSS custom-properties on `:root` in `styles.css`. Use the variable, never the hex.

### Base palette

```
--paper           #f3ede1   warm bone — primary background
--paper-deep      #e6dccb   slightly darker warm cream — recessed panels
--paper-grain     #d8cdb8   for subtle texture overlays
--ink             #1a1d24   warm-blue-tinted black — primary text
--ink-soft        #3a3f4a   medium ink — secondary text
--ink-mute        #6b6e76   soft slate — de-emphasized text & borders
--platinum-light  #ebe7df   chrome highlight (top/left of bevels)
--platinum        #c9c5be   chrome base — Windows-95-style window chrome
--platinum-deep   #a59f96   chrome shadow (bottom/right of bevels)
--slate           #2c303a   cool slate for monitor body
--slate-deep      #1a1c22   cool deep slate for screens
```

### Accents

```
--accent          #b85636   muted persimmon — signature spot color, used sparingly
--accent-soft     #c8826d   warmer cream-tinted persimmon
--mineral         #5a7d7e   cool sage/teal — secondary, used for "calm" / interpretability cues
--alarm           #a83232   deep red — only on genuine alarm states (Trust collapse, control collapse)
```

### Status

```
--good            #5a8a6b   muted forest
--warn            #b88a3a   muted ochre
--bad             #a83232   alarm red (same as --alarm)
```

### Doom desaturation variable

```
--doom            0..1      JS-driven; CSS uses `filter: saturate(calc(1 - var(--doom) * 0.7))` on the room
```

### Per-stage tints (multiply over the base)

The three acts subtly tint paper without changing it wholesale:

```
Act I (Garage): paper tinted slightly warmer (+2% red)
Act II (Lab):   paper tinted slightly cooler (+2% blue)
Act III (Org):  paper desaturated 30%, type stretches in letter-spacing
```

Implementation: `html[data-stage="N"]` overrides specific variables. Don't replace the whole palette per stage.

---

## 3. Typography

### Type stack

| Use | Family | Fallback |
|---|---|---|
| Display (titles, run-end cinematics, handbook chapter heads) | `Cormorant Garamond` | `EB Garamond, Georgia, serif` |
| UI (HUD, dock labels, panel titles, buttons) | `Inter` | `Helvetica Neue, system-ui, sans-serif` |
| Mono (terminal, stats, log timestamps, taskbar) | `JetBrains Mono` | `SF Mono, Consolas, monospace` |
| Handwriting (handbook body content only) | `Caveat` | `Kalam, cursive` |

**Don't load custom web fonts in v1.** Use the system fallbacks. We commit to a clean text rendering with the system stack and revisit web fonts in v1.5.

### Sizing

- HUD label: 11px / 1.4 / 600 weight / 0.5px letter-spacing / uppercase
- HUD value: 13px / 1.4 / 600 weight (mono)
- Body: 13-14px / 1.55
- Display H1 (cinematics): 28px / 1.3 / 400 weight / italic optional
- Display H2 (panel titles): 11px / 1.5 / 700 weight / 1.5px letter-spacing / uppercase
- Mono small: 10-11px / 1.4 / 500 weight / 0.5px letter-spacing

### Restraint rules

- Never more than three weights on screen at once.
- Italic is reserved for: cinematics (display) and flavor (serif).
- Letter-spacing is a tool — used for headings and uppercase only. Never on body.

---

## 4. Iconography — no emojis

**No emoji glyphs in UI.** Every icon is either:
- A CSS-drawn pictogram using `::before`/`::after` pseudo-elements (best for tiny dock icons)
- An inline SVG with a single `currentColor` fill
- A `<span class="icon icon-foo">` that swaps to a CSS background pattern

Reasons:
- Emoji rendering is platform-inconsistent (cross-OS variance).
- Emoji bring color/style from outside our palette.
- They feel like placeholders, not finished design.

### Icon library

The library lives in `styles.css` under the `/* === Icons === */` block. Each icon is 16×16 unless noted, drawn in `currentColor` so it inherits text color, and uses `display: inline-block; vertical-align: -0.125em` for baseline alignment.

Required icons for v2 (replace existing emoji uses):

| Icon | Replaces | Used in |
|---|---|---|
| `icon-power` | ⚡ TAP app | dock |
| `icon-cpu` | ⚙ TRAIN app | dock |
| `icon-id` | 🪪 TEAM app | dock |
| `icon-globe` | 🌐 WIRE app | dock |
| `icon-scroll` | 📜 LOGS app | dock |
| `icon-book` | 📕 handbook | desk object |
| `icon-phone` | ☎ phone | desk object |
| `icon-mug` | ☕ mug | desk object |
| `icon-plant` | 🌿 plant | desk object |
| `icon-monitor` | (new) | various |
| `icon-lock` | 🔒 dock-locked badge | dock locked state |
| `icon-x` | × close | window chrome |
| `icon-min` | _ minimize | window chrome |
| `icon-max` | □ maximize | window chrome |

**Player-identity emojis are allowed:** lab crests in the archetype-select, model crests on the corkboard. These are *content* the player chose, not UI.

Personnel portraits and handler portraits should also move off emojis to small SVG silhouettes — see roadmap.

---

## 5. Windows-95-lite OS framework

The monitor screen runs a tiny refined OS. Each scene becomes an **OS window** with chrome.

### Window structure

```
.os-window
├── .os-titlebar          (22px tall, gradient when active, flat when inactive)
│   ├── .os-title         (mono 11px, 0.5px letter-spacing)
│   └── .os-window-buttons
│       ├── .os-btn.os-btn-min       — []_]
│       ├── .os-btn.os-btn-max       — [□]
│       └── .os-btn.os-btn-close     — [×]
└── .os-window-body       (paper background, 12px padding)
```

### Bevels (the chunky chiseled OS feel)

Window edges use 2-tone borders to evoke chiseled chrome without overdoing it:

```
.os-window {
  border-top: 1px solid var(--platinum-light);
  border-left: 1px solid var(--platinum-light);
  border-right: 1px solid var(--platinum-deep);
  border-bottom: 1px solid var(--platinum-deep);
  background: var(--platinum);
  box-shadow: 1px 1px 0 var(--ink-soft);
}
```

Buttons in window chrome get the inverse bevel:

```
.os-btn {
  border-top: 1px solid var(--platinum-deep);
  border-left: 1px solid var(--platinum-deep);
  border-right: 1px solid var(--platinum-light);
  border-bottom: 1px solid var(--platinum-light);
  background: var(--platinum);
}
.os-btn:active {
  border-top-color: var(--platinum-light);
  border-left-color: var(--platinum-light);
  border-right-color: var(--platinum-deep);
  border-bottom-color: var(--platinum-deep);
}
```

### Active vs inactive titlebar

Active window: gradient from `--accent` to `--accent-soft`, white text.
Inactive: flat `--platinum-deep`, ink-soft text.

### Taskbar

A 26px tall strip at the bottom of the monitor screen. Bordered (platinum bevel). Contains:
- Left: a "Start"-style menu button (the Foundry crest mark)
- Middle: window task tabs (one per open app, click to bring forward)
- Right: a small clock (in-game day, mono 11px)

In v2 we ship single-window mode (only one app open at a time). The taskbar shows the current app + the dock for switching. In v2.1+ we add real multi-window stacking.

### Spacing inside windows

- Window padding: 12px (single source)
- Inside-panel gap: 8px
- Button height: 24px standard, 20px compact
- Form input height: 22px
- All spacings are multiples of 4px

---

## 6. Components

### Panels (inside an OS window)

```
.panel {
  background: var(--paper-deep);
  border-top: 1px solid var(--platinum-deep);
  border-left: 1px solid var(--platinum-deep);
  border-right: 1px solid var(--platinum-light);
  border-bottom: 1px solid var(--platinum-light);
  padding: 10px 12px;
}
```

This is the inverse-bevel "inset" look — content sunken into the window.

### Buttons

Default: 1px ink border, paper background, ink text. Hover: paper-deep background. Active: ink background, paper text.

Primary: `--accent` background, paper text. Hover: slightly brighter accent.

Danger: `--alarm` border + text. Hover: `--alarm` background + paper text.

### Stat rows

Mono font, label in ink-mute, value in ink. 1px dotted ink-mute border on bottom (very faint).

### Bars (pressure / progress)

```
.bar {
  height: 6px;
  background: var(--platinum-deep);
  border: 1px solid var(--ink-mute);
  border-radius: 0;            /* sharp — no pills */
}
.bar-fill {
  height: 100%;
  background: var(--good);     /* or var(--warn), var(--bad) per state */
  transition: width 0.4s ease, background-color 0.4s ease;
}
```

No rounded ends. No glow. Just a flat fill.

### Modals (cinematics, pivots, handbook)

Modals use **paper aesthetic** (handbook, ending cinematics) NOT chrome aesthetic. Background: warm cream paper texture. Title in display serif. Body in serif italic for cinematics, in mono/sans for utility.

---

## 7. Spacing rhythm

Base unit: **4px**. All paddings, margins, gaps must be multiples.

Common rhythm:
- 4px — internal text spacing
- 8px — inside-panel gaps, small gutters
- 12px — panel padding, modal padding
- 16px — between top-level sections
- 24px — between unrelated sections
- 32px — modal vertical breathing

---

## 8. Animation discipline

Reference: *Untitled Goose Game*'s patient bounces; *Reigns*'s flat snaps with subtle easing.

- Default transition: `0.15s ease` — buttons, hovers, active states
- Visual shift transition: `0.4s ease` — palette swaps, panel reveals
- Ambient transition: `1.5s ease` — pressure-driven decay, mood updates
- Animation duration cap: nothing exceeds **2s** for any UI moment except cinematics (which run as full overlays)

Forbidden:
- Bounce easings on UI controls
- Spinning loaders (use a flat dot pattern instead)
- Pulsing glow effects (except the monitor LED, which is the one sanctioned glow)
- Confetti, particles in functional UI

---

## 9. Sound (deferred)

Listed for completeness — implementation in v2.1+. See roadmap.

---

## 10. Hierarchy of meaning

When a piece of UI competes for attention, the answer is almost always: **less.**

The order of importance, top to bottom:
1. Cinematics + Handler calls (full overlays, command attention)
2. End-of-day panel (modal, mid-attention)
3. Active OS window (the app you're in)
4. Vitals widget (top-right, ambient awareness)
5. HUD (sticky top, glanceable)
6. Room ambience (background, peripheral vision)

Higher-priority surfaces should never be visually quieter than lower-priority ones.

---

## 11. Gotchas / commit rules

- Don't add new colors without updating this file.
- Don't add new emoji to UI surfaces. Player-content emoji (lab crests, model crests) is the one exception.
- Don't bring back `border-radius: 12px` blob aesthetics. We're chiseled, not blobby.
- Don't introduce a new font family without removing one.
- When in doubt, restraint.
