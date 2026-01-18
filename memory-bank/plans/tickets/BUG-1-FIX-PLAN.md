# BUG-1 Fix Plan — Collective release keeps lift, preventing descent

## Ticket summary
- Releasing collective-up (R) leaves lift applied long enough that the helicopter keeps climbing.
- Holding collective-down (F) only brakes climb temporarily; releasing F resumes rapid climb.
- Suspected cause: lift uses `control.collective.filtered` (smoothed + slew-limited) while the collective-down path only applies a temporary vertical brake based on raw input, so lift decays too slowly when inputs return to neutral.

## Requirements (from TICKETS.md)
- Releasing R should allow stabilization or descent within a short, predictable time window.
- Holding F should produce a sustained reduction in lift (not only a brief braking effect), allowing descent.
- Keep fixed-timestep behavior; do not couple sim to render FPS.

## Relevant files
- apps/game/src/sim/helicopterFlight.ts (lift + collective-down brake)
- apps/game/src/core/input/controlState.ts (collective smoothing/slew)
- apps/game/src/content/controls.ts (tuning values)
- apps/game/src/core/input/__tests__/controlState.test.ts (input processing tests)

## Root-cause hypothesis to validate
The collective axis uses smoothing + slew limiting so release and down inputs decay too slowly. Lift continues because `applyRotorForces` clamps to [0..1] and uses the filtered value, while `applyCollectiveDownBrake` only reduces vertical velocity when the raw input is negative. The filtered collective should drop faster on release/negative input so lift is removed promptly.

## Plan
1. **Read and confirm**: Verify `applyRotorForces` only uses filtered collective and `applyCollectiveDownBrake` uses raw input. Confirm collective smoothing and slew rates in `controlState.ts` and `content/controls.ts`.
2. **Implement fix in input processing**: Add an accelerated “release/down” slew path for the collective axis so filtered collective decays faster when target decreases (release or negative input). Keep other axes unchanged.
3. **Update tests**: Add a unit test in controlState tests to verify collective decreases faster on release when slew rate is limited.
4. **Verify impact**: Ensure no architecture or ECS schema changes; keep sim/render separation intact.

## Success criteria
- On release of R, collective filtered drops quickly (within a short window), removing lift sooner.
- Holding F reduces lift consistently (filtered reaches 0/negative quickly), and descent is possible without continuous braking artifacts.
- Unit tests pass and reflect the new release behavior.

## Notes / constraints
- Avoid per-frame allocations in hot paths.
- Keep behavior deterministic under fixed-timestep loop.
- No changes to render/UI; fix should be in input processing or sim logic only.
