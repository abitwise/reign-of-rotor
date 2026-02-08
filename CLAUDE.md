# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reign of Rotor is a browser-based helicopter combat game inspired by DOS-era "LHX: Attack Chopper". TypeScript + Vite toolchain with Babylon.js (rendering), Rapier WASM (physics), and bitecs (ECS). Desktop-only, keyboard + mouse.

## Commands

All commands run from the repo root via pnpm workspaces (game app is `apps/game`):

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server (port 5173)
pnpm build            # TypeScript check + production build
pnpm preview          # Preview production build (port 4173)
pnpm lint             # ESLint (max 0 warnings)
pnpm format           # Prettier
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright e2e tests
```

Run a single test file: `cd apps/game && npx vitest run src/sim/helicopterFlight.test.ts`

Watch mode: `cd apps/game && npx vitest --watch`

## Architecture

### Core Invariants

- **Fixed 60 Hz timestep**: All gameplay runs in a fixed-step loop (1/60s). Gameplay must never depend on render FPS. Max 5 substeps per frame, max frame delta clamped at 250ms.
- **Physics authoritative**: Rapier owns rigid-body transforms. ECS stores intent and gameplay state. Sim systems apply forces/torques; never write transforms directly.
- **Rendering is read-only**: Babylon.js projects physics state to visuals. Render/UI must not mutate simulation state — communicate via events/state reads.

### System Phases (execution order each fixed tick)

1. **Input** — Capture player input, update control state
2. **Simulation** — Gameplay logic (flight forces, weapons, AI, missions)
3. **Physics** — Rapier physics step
4. **PostPhysics** — Collision handling, sensor queries (raycasts)
5. **Late** — UI/HUD updates, telemetry

### Source Layout (`apps/game/src/`)

- `boot/` — App initialization, wiring, config, feature flags
- `core/` — Fixed timestep loop, system scheduler, input capture
- `ecs/` — Component schemas, entity factories
- `physics/` — Rapier world, stepping, handle mapping, collisions, raycasts
- `sim/` — Gameplay systems: flight controller, weapons, AI, missions, damage
- `render/` — Babylon.js scene, mesh bindings, camera rigs, terrain streaming
- `ui/` — HTML overlay HUD, menus, debrief screens
- `content/` — Data-driven configs (mission templates, tuning presets, weapon/enemy specs)
- `debug/` — Dev-only overlays/cheats (guarded by `VITE_ENABLE_DEBUG`)

### Data Flow

```
Input → Control State → Sim Systems → Physics Step → PostPhysics → Render Binding → Babylon.js
                                                                  ↓
                                                                 UI
```

### Naming Conventions

- Systems: `create*System()` → returns `LoopSystem` with `id`, `phase`, `step`
- State: `create*State()` → returns stateful context
- Factories: `spawn*()` → creates entities with physics/render bindings
- Components: `C` prefix (e.g., `CHelicopterFlight`, `CPlayerInput`)

## Safe vs Risky Areas

**Safe to change** (preferred for most work):
- `sim/**` — Gameplay logic, weapon tuning, AI, missions
- `ui/**` — HTML overlay, HUD, layout
- `content/**` — Data-driven configs and tuning
- Tests and tooling

**Risky (change carefully, add tests, update docs)**:
- `core/loop/**` — Fixed timestep loop and scheduler
- `ecs/components/**` — Schema changes ripple everywhere
- `physics/**` — Can break collisions, events, entity mapping
- `render/bindings/**` — Can cause perf regressions or desync

When changing risky areas, update `memory-bank/ARCHITECTURE.md` and add/adjust tests.

## Key Conventions

- TypeScript strict mode. No `any` in core sim/physics paths.
- Use `import type` for type-only imports (enforced by ESLint).
- Prefer data-driven configs in `content/` over hardcoding magic numbers.
- Pool frequently spawned entities (missiles, flares) to reduce GC spikes.
- Keep sim deterministic using fixed dt and seeded RNG.
- Sim never imports from render or UI.
- Unused params use `_` prefix.
- Prettier: single quotes, semicolons, no trailing commas, 100 char width.
- Path alias: `@/*` maps to `apps/game/src/*`.

## Documentation

Detailed project context lives in `memory-bank/`:
- `PRODUCT.md` — Business rules, gameplay invariants, user flows
- `ARCHITECTURE.md` — Technical architecture, design decisions, asset contracts
- `CONTRIBUTING.md` — Development guidelines, do/don't rules
- `LONG_TERM_MEMORY.md` — Ongoing project context
- `plans/` — Ticket plans and specs
