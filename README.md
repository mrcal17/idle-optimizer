# Idle Optimizer

A cute rogue-lite idler about running an AI lab racing toward AGI, balancing exponential capability gains against three escalating doom pressures. The interface *is* the alignment problem.

This is the **Forge prototype** — a single-page web app for tuning the dynamics before art exists. Per design spec, it ships with all three pressure systems, four archetypes, six capability tiers, eight pivots, and roughly fifteen ending resolutions.

## Run it

No build step. Open `index.html` in a browser, or serve the directory:

```
python -m http.server 8765
# then open http://localhost:8765/
```

## What's in the prototype

- **Four archetypes** with distinct economics: Frontier (VC-funded), Safety-First (grants), Open Source (community), Research Lab (publication-driven)
- **Six capability tiers** Spark → Ember → Beacon → Lighthouse → Pharos → Apex, each with a signature failure mode
- **Three pressures** Trust, Control, Dependence — coupled equations in `js/sim.js`, coefficients in `js/config.js`
- **GPU primitive** with four specializations and per-job allocation
- **Training runs** in four modes (pretrain, architecture experiment, post-train, continual learning) with paradigm-shift drops
- **Personnel + automation curve** — every role has a Human → AI ladder with mechanical implications for Trust / Control / Dependence
- **Autopilot** with three presets that actually do things, plus archetype-locked variants
- **Models as named heroes** — naming modal before each pretrain, serif report-card cinematic on completion, deployment as a real decision (Consumer Chat / Enterprise / Research / Internal), per-model timeline events
- **Eight pivots** with multi-paragraph in-world flavor (IPO, Open-Source the Weights, Defense Contract, Aligned Mission, Government Deal, Acquisition, Agent Fleet, Open Letter)
- **Twenty-five incident templates** spread across tiers, hand-flavored
- **Sixteen endings** including Aligned AGI, Drift, Pyrrhic, Captured, Suspended, plus collapse paths
- **Five scenes** Desk / Office / Operations / World / Logs, with progressive disclosure — the game grows as the player learns it
- **Interactive SVG world map** with clickable regions and glowing deployment dots
- **Canvas-based Lab Card** end-of-run shareable

## Architecture

Pure data layer in `js/data/` — adding a new upgrade or pivot is editing a JSON-shape object. The sim core in `js/sim.js` runs headless-clean (no DOM dependencies). UI strictly separated; modules attach to a global `Game` object loaded in dependency order. See `index.html` for the full module manifest.

## Status

Forge phase. Throwaway code in spirit — the goal is dynamics validation, not polish. Future Godot port lifts the sim core wholesale.

Design spec is internal.

## License

TBD.
