# LONG_TERM_MEMORY - Reign of Rotor

## Core decisions to remember
- Babylon.js (render) + Rapier WASM (physics) + bitecs (ECS) + Vite (tooling).
- Visual style: low-poly modern indie (clarity and performance first).
- Default camera: cockpit-first. Third-person is backlog.
- Input priority: keyboard + mouse (gamepad later).
- Fixed-timestep simulation is mandatory; render FPS must not affect outcomes.
- Physics is authoritative for transforms; ECS stores intent and gameplay state.
- UI/HUD is HTML overlay for MVP speed; keep it decoupled from sim.

## Invariants / rules
- Do not mutate simulation from render code. Use systems/events.
- Avoid allocations in hot paths (missiles, FX, per-frame vectors).
- Prefer raycasts for bullets and sensors; reserve full rigid bodies for missiles/vehicles where it adds value.
- Mission can be completed in-air once primary objectives are satisfied (landing optional).
- Damage tuning target: “arcade but hardcore”
  - Subsystem degradation matters
  - Avoid constant instant-death (except extreme impacts)

## Known risks / tradeoffs
- Cockpit-first camera requires careful motion smoothing to prevent nausea/jitter.
- Helicopter feel is tuning-heavy even with Rapier; plan time for iteration.
- Browser performance can degrade with too many particles/lights; keep materials conservative.
- Determinism across browsers is not guaranteed; treat replays as “best-effort” unless we constrain heavily.

## Notes for future changes
- If adding third-person camera: keep camera modes isolated; don’t leak camera logic into sim.
- If expanding AI: stay with simple FSM until profiling demands more.
- If adding progression/economy: separate persistence from mission runtime; version save schema.
- If adding mod support: validate content and guard against runaway spawns/perf issues.
