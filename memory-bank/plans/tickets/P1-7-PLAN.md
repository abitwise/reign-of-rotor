# Ticket P1-7 — Player Helicopter Spawn + Basic Flight Forces (Rapier)

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Spawn the playable helicopter with a Rapier rigid body and baseline damping, then apply lift and control torques from the sampled keyboard inputs so the craft can take off and maneuver.

## Objectives
- Create the player helicopter entity with collider/rigid body and hook it into the render/camera bindings.
- Drive lift plus pitch/roll/yaw torques from the `CPlayerInput` state each fixed step.
- Provide damping defaults so the helicopter remains controllable while still responding to inputs.

## Deliverables
- Helicopter factory + flight system that applies rotor force and torques in the Simulation phase before the physics step.
- Ground plane collider for the spawn area and camera binding to the new Apache mesh asset.
- Tests that validate upward lift from collective input and yaw rotation from yaw input.

## Notes
- Rotor lift is applied along the body-up axis to translate tilt into directional thrust.
- Control mapping keeps W/S for pitch, A/D for roll, and Q/E for yaw while using the Apache GLB as the player mesh.
