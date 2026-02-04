# P1-13 Missile Weapon: Acquire/Lock/Launch + Guidance — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-05

## Summary
Implement missile lock-on behavior, launch/spawn logic, and guidance/explosion handling for the player helicopter. The system should respect reticle-centric targeting, lock timers, and optional LOS gating while remaining sim-driven and decoupled from rendering.

## Requirements (from TICKETS.md)
- Lock state machine + timers (cone/range; optional LOS).
- Missile spawn + physics.
- Guidance system + explosion.

## Relevant Docs
- `memory-bank/PRODUCT.md` (targeting/lock invariants, HUD expectations).
- `memory-bank/ARCHITECTURE.md` (sim/physics/render separation, raycast usage).
- `memory-bank/CONTRIBUTING.md` (coding standards, tests, data-driven tuning).
- `memory-bank/LONG_TERM_MEMORY.md` (avoid per-frame allocations, fixed timestep).

## Implementation Plan
1. **Define missile tuning + state**
   - Add missile configuration in `content` (lock cone, range, lock time, LOS, speed, turn rate, seeker delays, damage/explosion radius).
   - Create sim-side missile state: ammo, cooldown, lock progress, current target, and per-tick event queues.
2. **Target selection + lock state machine**
   - Implement reticle-centric target scoring (angle off forward + distance).
   - Enforce cone/range checks and lock timer; reset on break.
   - Optional LOS check using Rapier raycast to candidate target.
3. **Missile spawn + physics**
   - Add a missile entity factory: rigid body + collider, initial velocity from heli muzzle/launch point.
   - Track missile entities in a lightweight pool/list (no GC-heavy allocations).
4. **Guidance + explosion**
   - Implement guidance system: steer missile toward target using turn-rate-limited angular velocity.
   - Trigger explosion on proximity or collision; emit damage/FX events for future systems.
5. **Input + HUD wiring**
   - Add fire-missile input binding and update combat readout to show lock state and missile ammo.
6. **Tests**
   - Add unit tests for lock timing/LOS gating, target selection, and missile guidance behaviors.

## Acceptance Criteria
- Missile lock requires sustained aim within cone/range, resets on break, and respects LOS when enabled.
- Firing a missile spawns a physics entity with guidance toward the locked target.
- Missile impacts trigger explosion events with damage data for later systems.
- HUD readouts show lock state and ammo.
- Tests cover lock state transitions, LOS gating, and guidance response.

## Notes
- Keep sim deterministic-ish and avoid per-frame allocations in hot loops.
- Keep UI/render read-only; expose state via gameplay context only.
- Missile targeting accepts an injected target provider; gameplay currently supplies an empty list until enemy entities land.
