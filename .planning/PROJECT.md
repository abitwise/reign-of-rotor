# Reign of Rotor

## What This Is

Reign of Rotor is a browser-based helicopter combat game inspired by the DOS-era "LHX: Attack Chopper." It delivers a complete playable loop: briefing, takeoff, navigate, engage threats, mission complete, debrief. The design targets "sim-feel, arcade-accessible but hardcore-leaning" with believable helicopter handling, meaningful threats, and a readable cockpit-first HUD. Built with TypeScript, Babylon.js, Rapier WASM physics, and ECS architecture — optimized for indie scope and fast iteration.

## Core Value

A satisfying cockpit helicopter combat loop where the player flies, fights, and survives against deadly but fair threats — all running in a browser with no install.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Fixed 60 Hz timestep simulation loop with physics authority — existing
- ✓ ECS-driven architecture with system phases (Input → Sim → Physics → PostPhysics → Late) — existing
- ✓ Rapier WASM physics integration (rigid bodies, colliders, raycasts) — existing
- ✓ Babylon.js 3D rendering with mesh binding system — existing
- ✓ Helicopter flight controller with collective, cyclic, yaw forces — existing
- ✓ Stability assist and hover assist systems — existing
- ✓ Keyboard + mouse input with control state pipeline — existing
- ✓ Cockpit camera with mouse look — existing
- ✓ Cannon weapon system (hitscan raycast) — existing
- ✓ Guided missile weapon system (physics projectiles) — existing
- ✓ Flare/chaff countermeasure system — existing
- ✓ SAM site enemies with lock progression and radar — existing
- ✓ Radar emitter enemies — existing
- ✓ Convoy/patrol vehicle enemies — existing
- ✓ Mission director with objective tracking — existing
- ✓ Procedural mission generation with templates — existing
- ✓ Terrain heightmap streaming — existing
- ✓ Prop/decoration streaming — existing
- ✓ HUD system with avionics, combat, mission, navigation providers — existing
- ✓ Altimeter with landing detection — existing
- ✓ Out-of-bounds warning and enforcement — existing
- ✓ Player damage/health system with difficulty scaling — existing
- ✓ Data-driven content configs (helicopters, weapons, enemies, missions, difficulty) — existing
- ✓ Debug overlay (feature-flagged) — existing

### Active

<!-- Current scope. Building toward these for MVP completion. -->

- [ ] Complete playable mission loop (briefing → fly → fight → complete → debrief)
- [ ] Mission debrief screen with stats, success/fail, progression hooks
- [ ] Mission briefing screen with objectives and waypoints
- [ ] 3 mission templates working end-to-end: convoy strike, destroy radar/SAM, escort
- [ ] Escort mission type (protect ally unit traveling between points)
- [ ] Mission completion prompt when primary objectives met (explicit player confirm)
- [ ] Missile lock with time + cone/range constraints (no instant locks)
- [ ] Lock breaks when cone/range exceeded; LOS check behind terrain
- [ ] RWR-style threat warning display
- [ ] Subsystem damage degradation (engine, rotor, avionics, weapons, sensors)
- [ ] Damage severity tuned between arcade and sim (degrade first, rare instant death)
- [ ] HUD completeness: altitude AGL, speed, heading, weapons/ammo, lock status, threat warnings, damage state
- [ ] Visual style: low-poly modern indie terrain theater with waypoints and spawn zones
- [ ] Quick mission generator selecting from 3 templates
- [ ] Landing as optional bonus stat/hook
- [ ] Rank/medals progression hooks (optional MVP)
- [ ] Fail states: destroyed, critical hit, out-of-bounds timer

### Out of Scope

<!-- Explicit boundaries. -->

- Multiplayer — single-player focus for MVP
- Full rotor aerodynamics realism (vortex ring state, blade simulation) — indie scope
- Fully interactive cockpit with clickable switches — too complex for MVP
- Large-scale persistent campaign map (territory control) — future feature
- Third-person camera as default — planned post-MVP
- Mobile/touch support — desktop keyboard+mouse only
- Target cycling — keep interaction simple for MVP

## Context

This is a brownfield project with substantial existing architecture. The core engine (fixed timestep loop, physics integration, rendering pipeline, input system, ECS) is built and working. Flight physics, weapons, enemies, missions, and HUD subsystems exist but need completion and polish to reach a shippable MVP loop.

The existing codebase follows strict conventions: `create*System()` factories returning `LoopSystem`, `create*State()` for stateful context, `spawn*()` for entity factories, `C` prefix for components. All gameplay in `sim/`, rendering read-only, data-driven configs in `content/`.

Key tech: TypeScript 5.5 strict, Vite 5.4, Babylon.js 7.29, Rapier3D 0.19, pnpm monorepo (`apps/game`).

## Constraints

- **Tech stack**: TypeScript + Vite + Babylon.js + Rapier WASM + bitecs ECS — locked, existing codebase
- **Platform**: Desktop browser only, keyboard + mouse, WebGL 2.0 required
- **Architecture**: Fixed 60 Hz timestep, physics authoritative, sim never imports render/UI
- **Controls**: Mouse = camera look (not cyclic), WASD = cyclic, Q/E = yaw, R/F = collective
- **Performance**: Must maintain 60 FPS in browser, pool frequently spawned entities
- **Determinism**: Fixed dt + seeded RNG, no render-FPS-dependent gameplay

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Physics-authoritative transforms | Prevents desync between visual and gameplay state | ✓ Good |
| Fixed 60 Hz timestep | Deterministic simulation regardless of render FPS | ✓ Good |
| ECS with plain data (not full runtime) | Lightweight, testable, fits indie scope | ✓ Good |
| Mouse for camera, not cyclic | More intuitive for FPS-trained players; keyboard cyclic gives sim feel | — Pending |
| Mission completes in-air (landing optional) | Keeps pacing tight; avoids frustrating landing requirements | — Pending |
| Damage degrades before killing | "Arcade but hardcore" — creates tension without frustration | — Pending |
| Data-driven content configs | Easy tuning iteration without code changes | ✓ Good |

---
*Last updated: 2026-02-08 after initialization*
