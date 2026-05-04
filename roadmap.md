# Idle Optimizer — Roadmap

A living plan for the next several iterations. Items are nested by area, with rough sequencing implied by depth and the order within each section. **Not** a release schedule — this is an intent document.

The north star: a single-screen, fully diegetic experience where every system has a physical referent in the workstation, the surrounding room, or the people on the call.

---

## ✅ Shipped this iteration

- [x] **STYLE_GUIDE.md** at repo root — single source of truth for palette, typography, icon system, window chrome, spacing
- [x] **Palette refresh off the brown-Anthropic warm-tan.** Bone paper + platinum chrome + cool slate + a single signature persimmon used sparingly. Doom signaled by desaturation toward cool-grey, never by red.
- [x] **Real Windows-95-lite OS chrome.** Each app mounts in an `.os-window` with chiseled platinum bevel, 22px titlebar (persimmon gradient when active), `[_][□][×]` chunky inverse-bevel buttons, 1px hard offset shadow. No rounded blobs.
- [x] **Real taskbar replacing the dock.** 26px platinum strip: Start button (lab crest) on the left, running-app tabs in the middle (current = pressed-in inverse bevel), in-game day clock on the right. Locked apps live in the Start menu, not on the taskbar.
- [x] **Icon system — emoji swept from UI.** ~15 emoji glyphs replaced with CSS/SVG pictograms inheriting `currentColor`: phone, handbook, mug, plant, dock icons (power/cpu/id/globe/scroll), lock, x/min/max chrome buttons. Player-content emojis (lab crest, model crests, founder portrait, archetype names, autopilot presets) preserved per STYLE_GUIDE §4.
- [x] **Room aesthetic refresh.** Bone paper walls with diagonal-weave grain, platinum-framed window with mineral-sage glass and 2×2 mullions, muted-cork corkboard in chrome bezel, slate powder-coated desk with platinum top edge. Desk objects sit on the slate with soft elliptical shadows.
- [x] **Vitals widget repositioned to top-right** (no longer collides with advisor bubble)
- [x] **Workstation HTML scaffold** — room layer, desk surface, monitor with terminal
- [x] **Scene → app migration** (Desk/Office/Operations/World/Logs now mount inside the terminal as TAP/TRAIN/TEAM/WIRE/LOGS apps)
- [x] **Slowed unlock pacing** (apps and HUD stats earn their reveal — no more instant-spreadsheet feel)
- [x] **Stage-aware room palette** (Garage warm / Lab cool / Org sparse) — implemented as subtle paper warmth shifts, not wholesale palette swaps

---

## 🧠 Workstation — single immersive view

### Room layer (always-visible context)
- [ ] Per-stage room art polish
  - [ ] Garage: exposed brick, single bulb, taped lease on door
  - [ ] Lab: fluorescent strips, name plate on desk, second monitor
  - [ ] Org: glass partition to dark hallway, minimalist desk, single screen
- [ ] Window view that responds to time-of-day (clock-driven sky tint)
- [ ] Window view that responds to pressures
  - [ ] Trust low → silhouettes of protesters with signs
  - [ ] Control low → fog rolls in, city lights flicker
  - [ ] Dependence high → more billboards, more drone silhouettes, fewer pedestrians
- [ ] Ambient lighting flicker tied to Control %
- [ ] Plant wilt/bloom tied to founder.stress
- [ ] Coffee mug fill state tied to founder.energy
- [ ] Wall corkboard auto-populates with model "polaroids" as pretrains land
- [ ] Room sound (deferred — see Sound section)

### Monitor + Terminal
- [ ] CRT scanline + curvature shader (CSS) — toggle on for stage 1
- [ ] Terminal boot sequence on first run — `BIOS POST → /boot/foundry-os → app: TAP.app`
- [ ] App "boot" animation when an app unlocks (not just an icon appearing)
- [ ] Terminal prompt occasionally accepts typed commands (easter eggs, or genuinely lets you query state)
- [ ] Apps gain "windows" instead of full-screen — multitasking in late game
- [ ] Late-game terminal degradation — Control loss visibly corrupts the UI (glyph swaps, color shifts)

### App dock → Taskbar
- [x] Dock retired in favor of OS-style taskbar
- [x] Dock icons unlock with one-shot pulse animation (now lives on Start-menu items)
- [ ] Taskbar badges for unread (incident in LOGS, pivot pending, model finished training)
- [ ] App-specific status colors on the taskbar tabs (TRAIN persimmon while training, WIRE muted-mineral while deploying)
- [ ] Drag-to-reorder taskbar tabs (player ownership)
- [ ] **Multi-window stacking** — currently single-window mode. v2.1 stretch: each app opens its own window, drag titlebars to move, z-index stacking, [_] minimize hides to taskbar
- [ ] Window snap zones (left/right halves)
- [ ] **Window content resize observers** — apps' inner layouts respond to actual window size, not just viewport

---

## 📕 The Manual ("Lab Director's Handbook")

A physical, tea-stained book on the desk. Replaces a tutorial.

- [ ] Click the book to open as a full-screen overlay (page-turn animation)
- [ ] Pages are unlocked as the player encounters new systems for the first time
- [ ] Diegetic glossary — every system the player can interact with is documented in-character
- [ ] Late-game: AI "edits" the handbook in red digital ink (post-Lighthouse)
  - [ ] Pages get crossed out
  - [ ] Marginalia in a different handwriting
  - [ ] Whole sections "redacted"
- [ ] At Apex: handbook becomes unreadable, replaced by a single page with one line
- [ ] Player can flag pages with the bookmark ribbon

---

## ☎ The Red Phone

A physical desk phone. Idle-music cuts to silence when it rings.

- [ ] Idle music system (so we have something to silence)
- [ ] Phone rings on Major Pivots (currently fired silently)
- [ ] Phone rings on Apex tier reach
- [ ] "Answer / Let It Ring" choice
  - [ ] Answer = pivot dialog opens, full Half-Life-style scripted moment
  - [ ] Let It Ring = pivot auto-declines with a unique flavor branch ("the line clicks off after the eighth ring")
- [ ] Caller ID strip on the phone shows who is calling (G-Man, Lead Researcher, Big-E, Senator Ngo)
- [ ] Phone glows + vibrates + has urgency animation

---

## 👥 Handlers (recurring NPCs)

Three primary handlers, each a video-call window over the terminal.

### G-Man (Investor)
- [ ] Grainy video feed, half-shadowed, never quite shown clearly
- [ ] Calls on Frontier-style milestones (Series B, IPO availability, acquisition offers)
- [ ] Voice gets quieter as the player accepts more capital
- [ ] Late-game: G-Man's office is empty in the call frame

### Lead Researcher (Safety / Half-Life-esque)
- [ ] Calls on Control drops, paradigm shifts, deceptive-alignment incidents
- [ ] Tone shifts with pressures
  - [ ] Calm + warm at 80%+ Control
  - [ ] Clinical at 50%
  - [ ] Frantic OR eerily-too-calm below 25%
- [ ] At Pharos tier: she's no longer calling from the lab; her background is at home
- [ ] At Apex: she sends a single text instead of calling

### Big-E (Doomer Commentator)
- [ ] Live-stream-style overlay (kitchen background, bad lighting, fire emoji watermark)
- [ ] Reacts to your run in real time at major beats
- [ ] Calls when major events fire — you're in his stream now
- [ ] Late-game: "where did Big-E go?" subplot if your trust > a threshold
- [ ] Big-E's reactions reference the player's actual lab name + most-recent model

### Other Handler candidates (deferred)
- [ ] Senator Ngo (regulator) — calls on government deal pivots
- [ ] Hari Iyer (journalist) — DMs more than calls; arrives with quotes
- [ ] CLTR contact — appears only at incident moments

---

## 🪪 Personnel as Dossiers

Replace personnel cells with physical-ish resumes.

- [ ] Hire flow: 3 candidate dossiers spread on the desk; pick one (Reigns-style)
- [ ] Each dossier shows: photo, name, prior employer, quirks teased ("Reads CLTR weekly")
- [ ] Promote-to-AI flow: the photo on the desk is **physically replaced** by a metal serial-number plate
  - [ ] Animation: photo slides out, plate slides in
  - [ ] Sound: a thunk
  - [ ] The corkboard photo of that person is taken down
- [ ] The "Last Human" scripted event
  - [ ] CCTV view of office on a small monitor in the room
  - [ ] When the final human is automated, the office lights flick off for 5 seconds
  - [ ] Music stops
  - [ ] Vitals widget desaturates
  - [ ] When lights come back, only the GPU hum remains (sound)

---

## 🔌 Tactile Compute Allocation

Replace the cycle-on-click GPU spec with a drag-to-allocate cable.

- [ ] Render GPUs as physical units on the desk shelf (in late game: rack visualization)
- [ ] "Compute cable" widget: drag from a GPU port to a job slot
- [ ] Job slots: Training Run, Deployment, Idle pool, Research
- [ ] Visual feedback: cable snaps with a glow when connected
- [ ] Cable color matches workload (training = warm, research = blue, inference = orange)
- [ ] Disconnecting requires a "click and pull" gesture
- [ ] At Lab/Org stages: cable management gets denser, more connections

---

## 🌍 Environmental Decay (visual feedback for control loss)

Already partially scaffolded via CSS variables (--decay-saturation, --decay-flicker, --window-cloud, --plant-vitality, --phone-urgency). Build out the responses.

- [ ] Plant: vibrant when serene, drops a leaf at moderate stress, wilts at high stress
- [ ] Coffee mug: empty / refill / spill states
- [ ] Window: clouds in slowly with Control loss; protests visible at Trust loss
- [ ] Wall paint: discoloration by Dependence (yellowing at high deps)
- [ ] Lighting: subtle warm at start, cold and clinical mid-game, harsh fluorescent late
- [ ] Audio decay (deferred to Sound section)
- [ ] CCTV monitor on the wall (a TV in the corner) shows the office space — empty seats grow

---

## 🎨 Visual systems

- [ ] Stage transition cinematics get visual art (currently text only)
  - [ ] Garage → Lab: "moving truck" parallax beat
  - [ ] Lab → Org: airport walk montage
- [ ] Run-end Lab Card: per-stage layout (Org-era cards look like annual reports)
- [ ] Pivot screens: each pivot gets a small illustration (the boardroom, the protest, the airport gate)
- [ ] Personnel portraits stop being emoji and become consistent flat-vector illustrations
- [ ] Model crests get a hand-drawn pass

---

## 🔈 Sound (deferred — currently silent)

- [ ] Ambient room hum (per stage)
- [ ] Fan noise from GPUs
- [ ] Coffee maker drip on day boundaries
- [ ] Phone ring (the Red Phone moment)
- [ ] Typing sounds when terminal fires text
- [ ] Modem boot sequence on first launch
- [ ] Music: ambient tracks per stage; cut to silence on Red Phone, Last Human, Apex
- [ ] Mute toggle in HUD
- [ ] Mobile silent-by-default

---

## 🏗 Mechanics

### Synergies (Slay-the-Spire / Balatro)
- [ ] More quirks (target ~50, currently 26)
- [ ] More named synergies (target ~25, currently 10)
- [ ] Synergies that combine quirk + model trait (cross-system)
- [ ] Synergies that change the rhythm (e.g. "Always Online" lets day-end fire mid-tap)
- [ ] Anti-synergies (specific quirks dampen each other) for build tension
- [ ] Visible synergy preview at hire time

### Decision cards
- [ ] More cards (target ~80, currently 38)
- [ ] Card chains (taking card A this week unlocks card B next week)
- [ ] Recurring NPC arcs through cards (Mira's storyline, the senator, etc.)
- [ ] Stage-3 "weight" cards: 1-of-3 picks with permanent run-shaping consequences

### Models
- [ ] Models accumulate event-driven quirks during deployment ("Goldie has been jailbroken twice now and seems to have learned from it")
- [ ] Model "retirement" instead of hard-archive — kept around as a conversation partner / easter egg
- [ ] Model lineage tree visualization
- [ ] Per-model deployment history graphs

### Pivots
- [ ] Pivots become Red Phone events instead of pop-ups
- [ ] Pivot follow-on consequences: take IPO → 3 days later, a board-meeting card lands
- [ ] More archetype-locked pivots

---

## 📦 Content / Writing

- [ ] Big-E voice consistency pass across all handlers + ticker
- [ ] Senator Ngo arc (recurring across multiple incidents/pivots)
- [ ] Hari Iyer's column — a "weekly column" card in late game
- [ ] Lambda Quarterly issues — collectibles unlocked at major beats
- [ ] In-world fictional outlets need consistent voice / not interchangeable
- [ ] More incident templates (target 50, currently 25)
- [ ] More paradigm shifts (target 20, currently 12)
- [ ] All flavor text passes through a final "is this earning its weight" review

---

## 🏗 Architecture / Tech

- [ ] Save/load (state shape is already structural-clone-friendly; just need a serializer)
- [ ] Run history persisted across sessions (Lab Card archive)
- [ ] Migration system for save-shape changes
- [ ] Telemetry hooks (anonymized, opt-in) for balance tuning
- [ ] Headless sim CLI for parameter sweeps
- [ ] Unit tests for sim equations (named-equations principle from spec §11)
- [ ] Asset bundling — currently raw <script> tags work but a bundled build is easier to ship
- [ ] Mobile touch gesture refinement (esp. for drag-to-allocate)
- [ ] Accessibility audit — keyboard navigation, screen reader, motion-reduce

---

## 🚦 Pacing-specific items

The user feedback was that the early game ramped too fast. These are the levers we tune.

- [x] App-dock items start locked behind earned conditions
- [x] HUD stats reveal only after relevant earned threshold
- [x] Pressures panel doesn't show just because the archetype shipped with personnel
- [ ] Stage-1 days run *slower* (compressed time-per-tick) so the player has space
- [ ] Stage-3 days fast-forward visibly (tick speed accelerates between major events)
- [ ] First end-of-day fires later (currently ~day 5; consider tuning to day 7)
- [ ] First incident gated behind tier 1, not tier 0 — Spark should feel safe
- [ ] First pivot doesn't fire before day 20 (early-game intimacy preserved)
- [ ] First handler call is the Lead Researcher — sets the tone

---

## 🧪 Polish backlog

- [ ] HUD Day counter shows day-of-week ("Day 14, a Thursday")
- [ ] Compute number transitions (animated counter)
- [ ] Money number transitions
- [ ] Tooltips that don't feel like tooltips (in-character notes from the team)
- [ ] Achievements/Cabinet (deferred — out of scope for v1.0 per spec)

---

## 🎨 Style discipline (ongoing)

The STYLE_GUIDE.md is the binding spec. Everything new must conform.

- [ ] **Audit pass on existing modals** — pivot/incident/ending overlays still use older styling that hasn't been re-grounded against the new palette
- [ ] **Typography pass** — body still uses system stack but display headings could use a real serif (Cormorant Garamond) when web fonts come in v1.5
- [ ] **Sweep remaining emojis** in scene-internal HTML (office personnel quirk badges, autopilot preset icons, GPU spec icons inside the operations panel) — these are functional UI even if they live inside a player-content scene
- [ ] **Status indicators** — some places still use colored dots without the canonical `.status-dot` class
- [ ] **Animation discipline review** — find any remaining bounces / pulses / glows that weren't sanctioned
- [ ] **Spacing rhythm sweep** — every magic number that isn't a multiple of 4px needs a justification or fix
- [ ] **Run a contrast audit** — some ink-mute-on-paper combinations are below WCAG AA at 13px; review and adjust
- [ ] **Design tokens for the alarm state** — the `--alarm` variable is defined but underused; alarm states should have a coherent visual language
- [ ] **Per-stage transitions** — the cross-fade between stages currently hard-cuts the room palette; a 1.5s ease would feel right

## 🚫 Explicitly out of scope (don't add without re-discussion)

- Multiplayer
- PvP
- Microtransactions / IAP
- NFTs
- Leaderboards (per spec — wrong vibe with doom theme)
- Real-time-only events (we want offline play to fully work)
