# P1-12 Cannon Weapon (Raycast) + Hit Feedback — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-04

## Summary
Implement a raycast-based cannon weapon with cooldown/ammo, hit detection, damage application hooks, and impact FX events. Wire it into input, gameplay systems, and HUD readouts while preserving sim/render separation.

## Requirements (from TICKETS.md)
- Gun component + cooldown.
- Raycast hits + damage apply.
- Impact FX events.

## Relevant Docs
- `memory-bank/PRODUCT.md` (combat + raycast policy, sim/render separation).
- `memory-bank/ARCHITECTURE.md` (sim/physics/render responsibilities, raycast usage).
- `memory-bank/CONTRIBUTING.md` (coding standards, tests).
- `memory-bank/LONG_TERM_MEMORY.md` (raycasts for bullets/sensors, avoid render->sim writes).

## Implementation Plan
1. **Define cannon tuning/data model**
   - Add content config for cannon (range, cooldown, ammo, damage, muzzle offset, FX tag).
   - Add sim-side cannon state (ammo remaining, cooldown timer, last fired time).
2. **Extend input + HUD plumbing**
   - Add fire input to `PlayerInputState` with a default key binding.
   - Update HUD instructions and combat readout provider to show cannon name + ammo.
3. **Implement cannon system**
   - Add sim system that on fire input: checks cooldown/ammo, casts ray from muzzle, resolves hit entity via collider handle map, applies damage hook, and records impact events.
   - Ensure raycasts exclude the player rigid body.
4. **Damage + FX hooks**
   - Add lightweight damage event queue (sim-side) and a per-tick impact event list (position, normal, target entity).
   - Expose readouts/events through gameplay context for UI/debug and future render FX.
5. **Tests**
   - Add unit tests for cannon cooldown/ammo consumption and raycast hit resolution using mocked physics.

## Acceptance Criteria
- Holding/pressing the fire key triggers raycast cannon shots with cooldown and ammo tracking.
- Raycast hit records include hit position/normal and associated entity (if any).
- HUD combat panel shows weapon name and ammo.
- Tests cover cannon cooldown and hit processing.

## Notes
- Implemented sim-side impact/damage event queues for future render/FX and damage systems.
