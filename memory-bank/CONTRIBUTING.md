# CONTRIBUTING manual for Reign of Rotor

## Local setup (expectations)
- Node.js LTS, pnpm.
- Modern desktop browser (Chrome/Edge/Firefox). Prefer Chrome for performance profiling, only desktop for MVP (keyboard + mouse).
- Optional: a GPU-enabled environment for stable WebGL performance.

## Run locally
- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Build production: `pnpm build`
- Preview prod build: `pnpm preview`

## Tests
- Unit tests (logic): `pnpm test`
- Browser smoke/e2e (minimal): `pnpm test:e2e`
  - Focus: boot → load scene → start mission → spawn entities → no console errors.

## Coding style & conventions
- TypeScript strict mode (no `any` in core sim/physics paths without justification).
- Lint/format: ESLint + Prettier (run via `pnpm lint` / `pnpm format`).
- Folder conventions:
  - `core/**` loop/scheduler, events, save/settings
  - `ecs/**` component schemas + entity factories
  - `physics/**` Rapier world + handle mapping + queries
  - `sim/**` gameplay systems (flight, weapons, AI, missions)
  - `render/**` Babylon scene + mesh bindings + VFX + camera
  - `ui/**` HUD + menus + debrief
  - `content/**` data-driven configs (mission templates, tuning)
- Prefer data-driven configs in `content/**` over hardcoding magic numbers in systems.

## Contribution do/don’t rules
### Do
- Keep sim deterministic-ish by using fixed dt and seeded RNG where relevant.
- Keep sim independent from Babylon/UI: communicate via events/state.
- Add debug toggles (dev-only) rather than permanent cheats in production.
- Pool frequently spawned entities (missiles, flares, FX) to reduce GC spikes.
- Keep Escort “ally movement” on waypoint rails for MVP; do not introduce navmesh/pathfinding without a dedicated ticket.
- When adding targeting logic, keep it reticle-centric and predictable; avoid target cycling until backlog phase.

### Don’t
- Don’t make gameplay outcomes depend on render FPS.
- Don’t mutate ECS state from render/UI without going through a system or event/command.
- Don’t change ECS component schemas casually—update docs + impacted systems together.
- Don’t add high-cost per-frame allocations in hot loops (use typed arrays, reuse objects).
- Don’t bind camera directly to raw physics rotation without smoothing/clamping (cockpit jitter is a known risk).

## When changing risky areas
If you touch `core/loop`, `physics`, or ECS schemas:
- Update `memory-bank/ARCHITECTURE.md` (contracts/decisions).
- Add/adjust tests or include a short “verification steps” section in PR.
