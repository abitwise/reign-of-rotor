# P1-19 Performance Pass + Pooling + Smoke Tests — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-06

## Summary
Reduce GC spikes by pooling frequently spawned entities (missiles, countermeasures, and lightweight FX), add a lightweight performance overlay (FPS, entity counts, steps/frame), and introduce Playwright smoke tests that boot the game and start a mission.

## Requirements (from TICKETS.md)
- Pool missiles/flares/FX entities.
- Perf overlay (fps, entity counts, steps/frame).
- Playwright smoke tests (boot + start mission).

## Relevant Docs
- `memory-bank/PRODUCT.md` (fixed timestep, HUD read-only, mission flow).
- `memory-bank/ARCHITECTURE.md` (loop instrumentation, sim/render separation).
- `memory-bank/CONTRIBUTING.md` (avoid allocations; pool frequent entities; test commands).
- `memory-bank/LONG_TERM_MEMORY.md` (avoid per-frame allocations; fixed timestep invariants).

## Implementation Plan
1. **Survey spawn/despawn hot paths**
   - Identify missile, countermeasure, and lightweight FX spawn sites and their destruction flow.
   - Confirm existing ECS factories and cleanup lifetimes (TTL or event-driven).
2. **Entity pooling primitives**
   - Add a small pooling utility in `sim/` (or `core/`) that reuses entity IDs and resets components.
   - Provide pool size caps per type to avoid unbounded memory.
3. **Apply pooling to missiles/flares/FX**
   - Update spawn systems to request a pooled entity before creating new.
   - Ensure pooled entities are reset: physics handles, timers, and render bindings.
   - Provide safe fallback to create new entities if pool empty.
4. **Perf overlay**
   - Implement a dev-only overlay (HTML) that shows FPS, steps/frame, entity counts.
   - Source steps/frame from the fixed-loop instrumentation; entity count from ECS world state.
5. **Playwright smoke tests**
   - Add a `pnpm test:e2e` Playwright script that boots the app and starts a mission.
   - Keep assertions minimal: no console errors, mission start UI changes, and initial sim tick.
6. **Verification**
   - Run lint/tests/e2e per CONTRIBUTING.
   - Validate that pooled entities reset cleanly and no stale render/physics references remain.

## Acceptance Criteria
- Repeated missile/countermeasure/FX spawns do not produce GC spikes; pooled reuse is visible in logs or debug counters.
- Perf overlay displays FPS, steps/frame, and entity count during gameplay (dev-only).
- Playwright smoke test boots the game and starts a mission without console errors.

## Notes
- Keep sim state separate from UI; overlay reads loop/entity stats only.
- Avoid per-frame allocations in overlay update (reuse DOM nodes).
- Playwright smoke test added; local run may require installing Playwright browsers (`pnpm exec playwright install`).
