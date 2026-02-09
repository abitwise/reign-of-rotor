---
phase: 00-fix-the-basics
plan: 02
subsystem: sim
tags: [flight-physics, tuning, arcade, hover-assist, rapier]

# Dependency graph
requires:
  - phase: none
    provides: "Existing helicopter flight system and tuning values"
provides:
  - "Arcade-tuned flight physics values (reduced torques, increased damping, stronger stability)"
  - "Auto-hover on collective release (gravity compensation + vertical velocity damping)"
affects: [00-fix-the-basics, 01-mission-flow-foundation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-hover via gravity compensation + proportional velocity damping"
    - "Separation of always-active assists (auto-hover) from toggle-based assists (lateral drift)"

key-files:
  created: []
  modified:
    - "apps/game/src/content/helicopters.ts"
    - "apps/game/src/sim/helicopterFlight.ts"

key-decisions:
  - "Auto-hover is always active (not behind toggle) -- releasing R/F automatically holds altitude"
  - "Lateral drift dampening remains behind X key toggle as separate hover behavior"
  - "Gravity compensation uses mass * 9.81 with velocity damping factor of mass * 4.0"

patterns-established:
  - "Auto-hover pattern: gravity compensation + proportional vertical velocity damping when no collective input"

# Metrics
duration: 2min
completed: 2026-02-09
---

# Phase 0 Plan 2: Arcade Flight Tuning + Auto-Hover Summary

**Arcade-smooth flight tuning with reduced torques (10/8/10), tripled angular damping, stronger auto-leveling, and always-active auto-hover on collective release**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-09T11:53:37Z
- **Completed:** 2026-02-09T11:55:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Retuned all flight physics values for arcade feel: reduced torques by ~45%, tripled angular damping, nearly doubled leveling torque scale
- Implemented auto-hover that activates whenever R/F keys are released -- helicopter holds altitude automatically via gravity compensation + vertical velocity damping
- Separated auto-hover (always active) from lateral drift dampening (X key toggle)
- All 153 existing tests pass without modification

## Task Commits

Each task was committed atomically:

1. **Task 1: Retune flight physics values for arcade feel** - `ec602e0` (feat)
2. **Task 2: Implement auto-hover on collective release** - `d9a0cc9` (feat)

## Files Created/Modified
- `apps/game/src/content/helicopters.ts` - Arcade-tuned DEFAULT_HELICOPTER_FLIGHT values (reduced torques, increased damping, stronger stability)
- `apps/game/src/sim/helicopterFlight.ts` - Auto-hover in applyHoverAssist: gravity compensation + vertical velocity damping when collective raw === 0

## Decisions Made
- Auto-hover is always active when collective is released (not behind hover toggle) -- this is the key UX improvement making the helicopter forgiving by default
- Lateral drift dampening remains behind the X key toggle as a separate hover assist feature
- Damping factor of mass * 4.0 chosen to arrest descent quickly without oscillation
- Used `addForce` API (not `applyForce`) matching existing Rapier usage patterns in the codebase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect Rapier API call**
- **Found during:** Task 2 (Auto-hover implementation)
- **Issue:** Plan suggested `heli.body.applyForce()` but Rapier's RigidBody API uses `addForce()`
- **Fix:** Changed to `heli.body.addForce()` matching the existing pattern used in `applyRotorForces`
- **Files modified:** apps/game/src/sim/helicopterFlight.ts
- **Verification:** TypeScript compilation passes, all tests pass
- **Committed in:** d9a0cc9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial API name correction. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Flight physics are arcade-tuned and auto-hover works automatically
- Ready for remaining Phase 0 plans (enemy/missile visuals, terrain rework)
- No blockers for future phases

---
*Phase: 00-fix-the-basics*
*Completed: 2026-02-09*
