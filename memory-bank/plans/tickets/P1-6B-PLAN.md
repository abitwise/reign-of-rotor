# Ticket P1-6B — Keyboard Yaw-Rate Controller (K/M Usability)

**Status:** Done  
**Last Updated:** 2026-01-18

## Summary
Introduce a yaw-rate controller for keyboard inputs so Q/E map to a desired yaw rate instead of direct pedal deflection. The controller should ramp smoothly, cap yaw rate, and apply stronger damping than pitch/roll for more controllable keyboard yaw behavior.

## Objectives
- Convert keyboard yaw input into a desired yaw-rate target with tunable ramp and limits.
- Implement a yaw-rate controller that compares desired rate to current angular velocity and outputs a bounded yaw command.
- Provide tuning configuration for max yaw rate, ramp time, and damping strength.
- Add test coverage for the yaw-rate controller behavior and bounds.

## Deliverables
- Updated control processing/data model to carry desired yaw-rate targets.
- Helicopter yaw torque application that uses the yaw-rate controller instead of direct yaw input.
- Tuning presets in `content/controls.ts` with yaw-rate parameters.
- Unit tests validating ramping, clamping, and controller response.

## Notes
- Keep mouse look camera-only; do not map mouse to cyclic or yaw.
- Apply stronger damping on yaw-rate control than pitch/roll to prevent over-rotation.
- Avoid per-frame allocations in control or flight loops.
- Implemented yaw-rate control with a bounded rate error controller and added tests for clamp behavior.
