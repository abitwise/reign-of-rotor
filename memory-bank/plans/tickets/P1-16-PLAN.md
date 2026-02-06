# P1-16 Mission Director v1 + 3 Templates (In-Air Completion) — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-06

## Summary
Add a mission director that builds seeded mission runs from data-driven templates (convoy strike, radar/SAM strike, escort), spawns mission-specific enemy groups/waypoints, tracks objectives, and exposes an in-air completion prompt that the player can confirm or defer.

## Requirements (from TICKETS.md)
- Mission runtime state + seed.
- Spawn groups + waypoints.
- Objective tracking + completion trigger (UI action or auto).
- In-air completion prompt state + input action to confirm.

## Relevant Docs
- `memory-bank/PRODUCT.md` (mission completion contract, seeded quick missions).
- `memory-bank/ARCHITECTURE.md` (sim owns gameplay state, fixed timestep).
- `memory-bank/CONTRIBUTING.md` (data-driven configs, test expectations).
- `memory-bank/LONG_TERM_MEMORY.md` (explicit in-air completion prompt; avoid render-driven sim).

## Implementation Plan
1. **Add mission content + seeded RNG helpers**
   - Create `content/missions.ts` with templates for convoy strike, radar/SAM strike, and escort.
   - Add a lightweight seeded RNG helper and mission director tuning (distance from player, rotation variance).
2. **Add mission/convoy sim state + systems**
   - Implement a mission director state object that stores seed, template, objectives, and completion prompt state.
   - Implement a simple convoy mover system for escort missions (kinematic vehicles following waypoints).
3. **Spawn mission entities + set navigation target**
   - Replace fixed enemy spawn offsets with mission-generated spawns.
   - Set navigation target from the mission’s primary waypoint/objective.
4. **Objective tracking + completion prompt**
   - Track destroy objectives by entity ids and escort objectives by convoy arrival.
   - When objectives complete, surface a prompt; handle confirm/continue inputs to complete or defer.
5. **UI + controls**
   - Add a mission panel to the HUD showing mission name, objectives, and completion prompt.
   - Add input bindings for confirm/continue, and update the instructions panel and key labels.
6. **Tests**
   - Add unit tests for mission objective tracking and completion prompt state transitions.

## Acceptance Criteria
- Mission director builds a seeded mission and spawns template-specific enemies/convoy with waypoints.
- Objectives update correctly and trigger a completion-ready state.
- HUD shows mission objective status and a completion prompt; player can confirm in-air or continue flying.
- Mission completion can be confirmed via input when objectives are met.
- Tests cover objective completion and prompt behavior.

## Notes
- Keep mission logic in `sim/**` and UI in `ui/**`; do not mutate sim from UI.
- Prefer data-driven templates/tuning in `content/**` rather than hardcoded values.
- Added a lightweight convoy mover for escort missions using kinematic bodies; convoy units are non-targetable by player weapons.
