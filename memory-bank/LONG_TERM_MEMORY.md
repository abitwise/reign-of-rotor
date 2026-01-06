# LONG_TERM_MEMORY - Reign of Rotor

## Core decisions to remember
- Babylon.js (render) + Rapier WASM (physics) + bitecs (ECS) + Vite (tooling).
- Fixed-timestep simulation is mandatory; render FPS must not affect outcomes.
- Physics is authoritative for transforms; ECS stores intent and gameplay state.
- UI/HUD is HTML overlay for MVP speed; keep it decoupled from sim.

## Invariants / rules
- Do not mutate simulation from render code. Use systems/events.
- Avoid allocations in hot paths (missiles, FX, per-frame vectors).
- Prefer raycasts for bullets and sensors; reserve full rigid bodies for missiles/vehicles where it adds value.
- Keep mission templates data-driven and seeded for reproducibility.

## Known risks / tradeoffs
- Helicopter “feel” is tuning-heavy even with Rapier; plan time for iterative tuning.
- Browser performance can degrade with too many dynamic lights/particles; use pooled FX and conservative materials.
- Determinism across browsers is not guaranteed; treat replays as “best-effort” unless we enforce strict constraints.

## Notes for future changes
- If switching to WebGPU: keep render bindings isolated; do not leak Babylon types into sim.
- If expanding AI: maintain simple FSM first; don’t introduce heavy behavior trees without profiling.
- If adding progression/economy: separate persistence layer from mission runtime; keep save data schema versioned.
- If adding mod support: validate external content and guard against runaway spawns/perf issues.
