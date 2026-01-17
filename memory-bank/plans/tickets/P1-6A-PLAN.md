# Ticket P1-6A — Control State Normalization + Input Processing (Curves/Smoothing/Rate Limits)

**Status:** Done  
**Last Updated:** 2026-01-17

## Summary
Introduce a normalized helicopter control state and an input processing layer that converts raw keyboard input into smooth, rate-limited control axes. This layer applies configurable expo curves, smoothing, and slew limits to stabilize keyboard handling while preserving the existing mouse-look camera behavior.

## Objectives
- Define a `ControlState` with normalized collective (0..1) and cyclic/yaw axes (-1..1), keeping room for trim offsets.
- Apply per-axis expo curves, smoothing (time-constant), and slew-rate limits to raw keyboard input.
- Store both raw and filtered values for debugging and future HUD overlays.
- Provide configuration presets for Normal and Hardcore-ish tuning.

## Deliverables
- New control-processing module that samples raw `PlayerInputState` and outputs filtered `ControlState` each fixed tick.
- Tunable config presets (Normal/Hardcore-ish) exposed in data/config for future tuning.
- Updated helicopter flight system to consume the filtered control state while keeping existing toggle inputs intact.
- Unit tests covering expo, smoothing, and slew behavior.

## Notes
- Mouse look remains camera-only per MVP controls contract.
- Processing must run in the fixed timestep input phase to keep sim deterministic.
- Avoid per-frame allocations in the control processing hot path.
- Control-state presets live in `content/controls.ts` for tuning.
