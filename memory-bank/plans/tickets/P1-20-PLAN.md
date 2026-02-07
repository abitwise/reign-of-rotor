# P1-20 Out-of-Bounds Rules + Warning UI — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-07

## Summary
Define a mission-area bounds model, track player position against those bounds with a countdown, fail the mission on expiry, and feed an out-of-bounds warning into the HUD banner.

## Requirements (from TICKETS.md)
- Define bounds model (rect/circle) in mission runtime.
- Implement countdown + fail trigger.
- Wire to HUD warning banner.

## Relevant Docs
- `memory-bank/PRODUCT.md` (fail-state contract: out-of-bounds warning + countdown then fail).
- `memory-bank/ARCHITECTURE.md` (fixed timestep, sim is authoritative; UI is read-only).
- `memory-bank/CONTRIBUTING.md` (data-driven tuning in `content/**`, avoid per-frame allocations).
- `memory-bank/LONG_TERM_MEMORY.md` (fixed timestep, sim/render separation).

## Implementation Plan
1. **Bounds model + config**
   - Add a `MissionBounds` model (circle/rect) and `MissionBoundsConfig` tuning in `content/missions.ts`.
   - Provide a helper to build bounds centered on the mission origin.
2. **Out-of-bounds state + system**
   - Add `sim/outOfBounds.ts` with state for warning timer + active flag.
   - Add a system that checks player position against mission bounds each fixed tick, decrements the timer when outside, resets when inside, and fails the mission on expiry.
3. **Gameplay wiring + HUD readout**
   - Initialize bounds/state in `bootstrapGameplay`, include in `GameplayContext`.
   - Provide an out-of-bounds readout to `rootUi.setOutOfBoundsProvider` so the banner shows countdown.
4. **Tests**
   - Add unit tests for bounds checks and countdown reset/expiry behavior.
5. **Verification**
   - Run relevant tests/lint if feasible.

## Acceptance Criteria
- Leaving the mission bounds shows an out-of-bounds warning with countdown seconds.
- Returning within bounds clears the warning and resets the countdown.
- Countdown expiry transitions mission status to failed.
- Unit tests cover bounds checking and countdown behavior.

## Notes
- Use fixed timestep delta for countdown (not render FPS).
- Keep UI read-only; sim handles mission fail state.
