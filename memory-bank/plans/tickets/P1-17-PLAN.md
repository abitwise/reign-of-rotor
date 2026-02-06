# P1-17 Debrief Screen v1 (Stats + Outcome) — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-06

## Summary
Add a debrief overlay that appears after mission completion, showing outcome and core stats (time, kills, damage dealt, shots fired) with a replay action that restarts the mission with a new seed.

## Requirements (from TICKETS.md)
- Collect stats (time, kills, damage, shots fired).
- Debrief UI.
- Replay flow (new seed).

## Relevant Docs
- `memory-bank/PRODUCT.md` (mission completion + debrief expectation).
- `memory-bank/ARCHITECTURE.md` (sim owns gameplay state; UI read-only).
- `memory-bank/CONTRIBUTING.md` (data-driven, fixed timestep, testing).
- `memory-bank/LONG_TERM_MEMORY.md` (in-air completion prompt; no UI mutating sim).

## Implementation Plan
1. **Sim stats state + collection system**
   - Add a mission stats state object tracking elapsed time, kills, damage dealt, shots fired (cannon + missiles).
   - Extend cannon/missile/enemy systems to report shot and kill events without allocating per-frame.
   - Create a stats system that accumulates events per fixed tick and finalizes results when the mission ends.
2. **Mission completion → debrief transition**
   - Add a mission debrief state derived from mission status (completed/failed).
   - Pause simulation when debrief is active without UI mutating sim (sim system sets pause).
3. **Debrief UI overlay**
   - Implement a new UI panel that renders outcome + stats with a “Replay mission” button.
   - Hide HUD elements when debrief is active; keep overlay pointer events enabled.
4. **Replay flow**
   - Provide a replay action that restarts the game state with a new seed (simple page reload for v1).
5. **Tests**
   - Add unit tests for stats accumulation and debrief readout formatting.

## Acceptance Criteria
- Mission completion triggers a debrief overlay showing outcome, time, kills, damage dealt, and shots fired.
- Stats update correctly during a mission and freeze when debrief is shown.
- Replay button starts a new mission with a new seed (page reload).
- UI remains read-only; sim sets pause on debrief activation.

## Notes
- Keep sim state in `sim/**` and UI in `ui/**`.
- Avoid per-frame allocations; reuse arrays in stats collection.
- Damage stat reflects damage dealt to enemy units (from cannon/missile events).
