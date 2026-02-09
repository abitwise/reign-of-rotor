# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** A satisfying cockpit helicopter combat loop where the player flies, fights, and survives against deadly but fair threats -- all running in a browser with no install.
**Current focus:** Phase 0: Fix the Basics

## Current Position

Phase: 0 of 4 (Fix the Basics)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-09 -- Completed 00-02-PLAN.md (arcade flight tuning + auto-hover)

Progress: [#.........] ~7%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 2 min
- Total execution time: 2 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 00-fix-the-basics | 1/3 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 00-02 (2 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4 phases derived from 41 v1 requirements at quick depth. Mission flow foundation first because state machine blocks all UI work.
- [Roadmap]: Combat feedback is one large phase (23 requirements) covering audio, HUD, damage, and lock systems -- plan-phase will decompose into multiple plans.
- [Research]: No new runtime dependencies needed. All features buildable with existing stack (Babylon.js, DOM/CSS, Canvas 2D, Web Audio).
- [00-02]: Auto-hover is always active when collective released (not behind toggle) -- forgiving flight by default.
- [00-02]: Lateral drift dampening remains behind X key toggle as separate hover behavior.
- [00-02]: Gravity compensation uses mass * 9.81 with velocity damping factor of mass * 4.0.

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Audio system design (rotor sound, RWR tones) may need experimentation during Phase 3 planning.
- [Research]: Game currently uses window.location.reload() for restart -- Phase 1 must replace this with proper teardown.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 00-02-PLAN.md (arcade flight tuning + auto-hover)
Resume file: None
