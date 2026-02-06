# P1-14 Enemy Units v1: Vehicles + Radar Site + SAM — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-06

## Summary
Add foundational enemy actors for missions: static radar emitters, SAM sites with scan/lock/fire behavior, and simple vehicle targets (static or waypoint patrol). The initial implementation is sim-only with physics bodies for targeting and damage events, keeping rendering/UI decoupled.

## Requirements (from TICKETS.md)
- Radar emitter entity.
- SAM scan/lock/fire FSM.
- Basic vehicle target entities (static or simple patrol).

## Relevant Docs
- `memory-bank/PRODUCT.md` (sim/weapon invariants, threat behavior expectations).
- `memory-bank/ARCHITECTURE.md` (sim vs render separation, fixed timestep).
- `memory-bank/CONTRIBUTING.md` (coding standards, data-driven configs).
- `memory-bank/LONG_TERM_MEMORY.md` (avoid allocations in hot loops, deterministic-ish sim).

## Implementation Plan
1. **Define enemy configs + data models**
   - Add content config for enemy units (health, collider sizes, radar range, SAM lock/fire tuning, vehicle patrol speed).
   - Define sim-side types: enemy registry, vehicle, radar, SAM state, and SAM missile instances.
2. **Spawn helpers (physics-backed)**
   - Implement spawn helpers to create fixed/kinematic bodies + colliders for radar sites, SAM launchers, and vehicles.
   - Track targetable entities in a registry for missile/cannon targeting.
3. **SAM FSM + missile behavior**
   - Implement scan/lock/fire state machine with range/cone + optional LOS checks.
   - Spawn SAM missiles with guidance toward the player and simple proximity/timeout detonation.
4. **Vehicle patrol behavior**
   - Implement optional waypoint patrol (simple back-and-forth) using kinematic translation.
5. **Damage intake for enemy units**
   - Consume cannon/missile damage events to reduce enemy health and remove destroyed units from physics + registry.
6. **Gameplay wiring + tests**
   - Wire enemy registry to missile target provider so player missiles can lock targets.
   - Add unit tests covering SAM lock/fire timing and vehicle patrol stepping.

## Acceptance Criteria
- Radar, SAM, and vehicle entities spawn with physics colliders and are targetable.
- SAM site locks the player within cone/range, fires missiles after lock, and respects cooldowns.
- Vehicle targets can be static or follow a simple patrol path.
- Damage events from cannon/missiles reduce enemy health and remove destroyed units.
- Tests validate SAM FSM timing and vehicle patrol updates.

## Notes
- Keep sim deterministic-ish and avoid per-frame allocations.
- Avoid touching render/UI unless explicitly required by the ticket.
- Enemy units are sim-only for now; rendering and UI warnings can be layered in later tickets.
