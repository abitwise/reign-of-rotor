# Ticket P1-7B — Engine/Rotor RPM + Power Margin Model (Sim-lite Performance Limits)

**Status:** Done  
**Last Updated:** 2026-01-17

## Summary
Add a simplified engine/rotor RPM and power margin model to the helicopter flight sim so high collective and aggressive maneuvering can droop RPM and reduce authority, with smooth recovery when load reduces.

## Objectives
- Track rotor RPM, power required, power available, and power margin in sim state.
- Implement governor-like RPM behavior with inertia and tunable recovery.
- Approximate power requirement based on collective and maneuvering load.
- Scale cyclic/yaw authority based on power margin to reflect performance limits.

## Deliverables
- New flight state variables for RPM and power tracking.
- Flight controller updates to compute power requirement and apply RPM response.
- Authority scaling that reduces cyclic/yaw under low power margin.
- Optional audio/event hook for RPM droop/strain.
- Updated tuning/config values in content data or constants.

## Implementation Plan
1. Review existing flight control and tuning configs to identify where to store new RPM/power parameters.
2. Add RPM/power fields to the helicopter flight component/state and initialize defaults in entity spawn.
3. Implement simplified power requirement calculation (collective + maneuvering/drag proxy) and power available curve.
4. Add governor-like RPM response with inertia and clamp bounds; compute margin.
5. Apply authority scaling based on margin for cyclic/yaw; keep collective lift tied to RPM for droop.
6. Add optional event hook for RPM droop to drive audio later.
7. Update tests for the new power margin behavior if applicable.

## Notes
- Keep calculations deterministic and fixed-timestep friendly.
- Avoid per-frame allocations in hot sim loops.
- Authority scaling should be smooth to prevent abrupt control loss.
- Audio hooks for RPM droop are deferred; the sim exposes power state for future audio events.
