# Ticket P1-3 — Rapier World Integration + Entity↔Handle Mapping

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Integrate the Rapier physics engine, creating the world and stepping it within the fixed timestep loop. Provide helpers to spawn rigid bodies and colliders while keeping a bidirectional mapping between ECS entity ids and Rapier handles so collisions can be attributed back to gameplay entities.

## Objectives
- Initialize Rapier WASM and create a physics world with gravity consistent across the sim.
- Step the physics world from the loop’s physics phase using the fixed delta.
- Offer helpers to create rigid bodies and colliders while registering entity↔handle links.
- Surface minimal collision events that resolve colliding entities via the handle map.

## Deliverables
- Physics bootstrap that loads Rapier, instantiates the world + event queue, and wires a step system into the scheduler.
- Entity-to-handle registry covering rigid bodies and colliders with lookup utilities for collision attribution.
- Factory helpers for creating rigid bodies/colliders bound to ECS entities.
- Basic collision plumbing that drains Rapier events into an inspectable buffer for downstream systems or UI.

## Notes
- Keep physics authoritative for transforms; other systems should read from Rapier rather than mutating it directly.
- Avoid allocations in the per-tick physics step and collision drain paths.
- Preserve the fixed timestep contract—render/UI must not influence Rapier stepping cadence.
- Collider helpers enable collision events by default via `ActiveEvents.COLLISION_EVENTS` for future systems to consume.
