---
task: 260710-jdl
title: Audit the helicopter controls and visuals
type: quick
subsystem: sim/flight, content, render/visibility
status: complete
requirements: [UAT-00-test-1-controls, UAT-00-test-1-visibility]
tags: [flight-model, physics, tuning, enemy-visibility, terrain-height, regression-tests]
key-files:
  created:
    - apps/game/src/content/terrainHeight.ts
    - apps/game/src/sim/__tests__/enemyPlacement.test.ts
  modified:
    - apps/game/src/content/helicopters.ts
    - apps/game/src/sim/helicopterFlight.ts
    - apps/game/src/sim/__tests__/helicopterFlight.test.ts
    - apps/game/src/content/missions.ts
    - apps/game/src/content/world.ts
    - apps/game/src/render/terrain/terrainChunkManager.ts
    - apps/game/src/render/bootstrap.ts
decisions:
  - "Gravity-compensating hover baseline is always active; collective commands climb/descend ABOUT the hover point instead of replacing the only up-force."
  - "Hover compensation tracks the real world gravity captured at spawn, so zero-gravity test worlds contribute zero baseline and existing zero-gravity tests are unaffected."
  - "Reset Rapier force/torque accumulators each active flight step (Rapier addForce/addTorque persist across steps) to keep the per-frame force model deterministic."
  - "Force/torque tuning is sized against the body's actual mass (~2880 kg) and inertia; kept in content/helicopters.ts (data-driven)."
metrics:
  tasks: 2
  commits: 2
  duration: ~16 min
  completed: 2026-07-10
---

# Quick Task 260710-jdl: Audit the Helicopter Controls and Visuals Summary

Fixed the two major UAT test-1 defects — the helicopter could not climb/descend or maneuver, and enemies were never seen — by resizing the flight force/torque model to the body's real mass/inertia, making the gravity-compensating hover baseline always active, resetting Rapier's persistent force accumulators each tick, and finalizing the shared-terrain-height enemy-visibility chain with locked regression tests.

## Task 1: Helicopter control authority (climb/descend + maneuvering)

### Diagnosed root causes (file:line evidence)
1. **Force/torque authority orders of magnitude too small for the mass.** Player collider `cuboid(1.2, 0.6, 2.5)` (`helicopterFlight.ts:75`) → 2.4×1.2×5.0 = 14.4 m³ × `density 200` (`helicopters.ts:6`) = **2880 kg**, weight ≈ 28.3 kN. `maxLiftForce: 240` (`helicopters.ts:7`) is 0.85% of weight; torques `10/8/10` vs inertia (I_pitch≈6345, I_roll≈1728, I_yaw≈7382 kg·m²) gave angular accel ≈ 0.0016 rad/s² — effectively unturnable, compounded by the strong 0.7 multiplicative `stabilityAngularDamping`.
2. **Collective disabled the hover baseline.** `applyHoverAssist` (`helicopterFlight.ts:409`) applied gravity compensation ONLY when `rawCollective === 0`. Pressing collective-up/down removed the only force holding the aircraft up, leaving ~240 N against ~28 kN of gravity → the aircraft sank the instant a climb was commanded ("hard to move up or down").
3. **Latent: Rapier forces/torques persist across steps.** `addForce`/`addTorque` accumulate until reset, and nothing reset them. The per-frame flight model re-derived its forces every tick, so hover compensation and control torques compounded each step (balloon + erratic rotation). Confirmed empirically: adding `mass*9.81` up each step without reset ran velocity to +64 m/s; with `resetForces(false)` it cancelled gravity exactly (velY 0).

### Fixes applied
- **Reset accumulators each active step** — `resetForces(false)` / `resetTorques(false)` after `wakeUp()` (`helicopterFlight.ts`). Gravity is applied separately and is unaffected.
- **Always-on gravity-compensating baseline** — `applyHoverAssist` now applies `-mass * gravityY` every tick (climb/descend about hover); vertical-velocity damping still added only at neutral for altitude hold. `gravityY` captured from `physics.world.gravity.y` at spawn (zero in zero-gravity test worlds).
- **Rebalanced tuning** (`helicopters.ts`, data-driven):

| Constant | Before | After | Rationale |
|---|---|---|---|
| `maxLiftForce` | 240 | 9000 | ~3.1 m/s² climb/descend authority above/below weight |
| `maxPitchTorque` | 10 | 26000 | α ≈ 4.1 rad/s² vs I_pitch |
| `maxRollTorque` | 8 | 8000 | α ≈ 4.6 rad/s² vs I_roll |
| `maxYawTorque` | 10 | 26000 | α ≈ 3.5 rad/s² vs I_yaw (feeds yaw-rate controller) |
| `stabilityAngularDamping` | 0.7 | 0.95 | responsive rotation, still auto-leveling/smooth |

### Verification
- Added a `helicopter flight under real gravity` describe block: climb-on-collective-up, descent-on-collective-down, altitude-hold-on-neutral, and usable pitch/roll authority. These fail against the original tuning (sinks / near-zero angvel) and pass after the fix.
- All 23 `helicopterFlight.test.ts` tests green (5 new + 18 pre-existing, no regressions). Existing zero-gravity assertions preserved because the baseline is zero in zero-gravity worlds.

## Task 2: Enemy visibility

### Diagnosis (file:line evidence)
The in-flight baseline chain is internally consistent and correct — no code defect found:
- Spawn distance 2000–4000m (`missions.ts:87-88`) + largest in-template offset (~600m) stays inside `CAMERA_FAR_PLANE = 8000` (`world.ts:43`).
- Enemy Y and convoy-route Y are seated on `terrainHeight(x,z) + offset.y` with all template `offset.y = 0` (`missions.ts:334-337,353-365`) — units rest on the surface, never underground/floating.
- `content/terrainHeight.ts` is the single shared height field; `terrainChunkManager.ts:30` re-exports it, so render vertex displacement and sim placement agree.
- `camera.maxZ = CAMERA_FAR_PLANE` (`bootstrap.ts:80`) so in-range enemies render.
- `enemyVisualManager.ts:40-46` positions merged meshes (part bases at local y≈0) at the physics transform → mesh bottom sits at terrain height. `hudMarkerManager.ts` projects in-frustum world positions (+2 up) to screen and is wired at `createApp.ts:198` — the primary locate-at-distance affordance.

### Fix applied
No production-code change was warranted (chain correct). Locked a previously-untested invariant: **convoy patrol waypoints** (`enemySpawns[].patrolPath`, only covered indirectly before) are seated on the shared terrain height AND stay inside the camera far plane, so patrolling enemies stay grounded and visible while moving (`enemyPlacement.test.ts`). Committed the baseline visibility files (`terrainHeight.ts`, `missions.ts`, `world.ts`, `terrainChunkManager.ts`, `bootstrap.ts`, `enemyPlacement.test.ts`) as one coherent finalize commit.

### Verification
- All 5 `enemyPlacement.test.ts` tests green (inside far plane, seated on terrain, patrol + convoy waypoints seated and in-view).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rapier force/torque accumulators never reset**
- **Found during:** Task 1 (surfaced when the new gravity tests ballooned upward at a steady ~2.45 m/s despite exact gravity compensation).
- **Issue:** Rapier `addForce`/`addTorque` persist across `world.step()`; the flight system re-adds per-frame forces every tick without resetting, so hover/control forces compound. This is a latent defect independent of tuning and directly contributes to erratic/unresponsive flight.
- **Fix:** `heli.body.resetForces(false)` + `resetTorques(false)` at the start of each active flight step. Verified empirically that this makes `mass*g` exactly cancel gravity.
- **Files modified:** `apps/game/src/sim/helicopterFlight.ts`
- **Commit:** 669d3c1

## Overall Verification
- `pnpm test` — 163 tests passed (28 files).
- `pnpm build` — TypeScript check + production build succeed (chunk-size note is a pre-existing warning, not an error).
- `pnpm lint` — ESLint clean (max 0 warnings).

## Commits
- `669d3c1` fix(quick-260710-jdl-01): give helicopter usable climb/descend and maneuver authority
- `961c6e9` fix(quick-260710-jdl-01): finalize enemy visibility on shared terrain height

## Excluded (per constraints, left untouched in working tree)
- `apps/game/vite.config.ts`
- `.claude/settings.local.json`
- `.planning/config.json`

## Self-Check: PASSED
- FOUND: apps/game/src/content/terrainHeight.ts
- FOUND: apps/game/src/sim/__tests__/enemyPlacement.test.ts
- FOUND commit: 669d3c1 (Task 1)
- FOUND commit: 961c6e9 (Task 2)
