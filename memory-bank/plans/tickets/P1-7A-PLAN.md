# Ticket P1-7A — Trim System v1 (Force Trim + Stored Neutral Offsets)

**Status:** Done  
**Last Updated:** 2026-01-17

## Summary
Implement a simple trim model so players can set a new neutral for cyclic and yaw, reducing constant correction on keyboard. Add input bindings for force trim/reset and surface trim state in the HUD/debug overlays.

## Objectives
- Add force-trim and reset-trim input actions to the keyboard mapping.
- Apply trim offsets in control processing without breaking fixed-timestep determinism.
- Provide a HUD indicator when trim is active plus debug readouts for trim values.

## Deliverables
- Updated `PlayerInputState` with trim actions and default key bindings.
- Control-state processing that captures and clears trim offsets on input toggles.
- HUD updates (instructions + trim indicator) and debug overlay readout for trim values.
- Unit tests covering trim capture/reset behavior.

## Implementation Plan
1. Extend input state/bindings to include Force Trim and Reset Trim toggles.
2. Update control-state processing to capture trim offsets from current control values and clear them on reset.
3. Wire trim state into the UI: add a HUD indicator, update instructions, and expose trim values in the debug overlay.
4. Add/adjust tests for trim capture/reset logic.

## Notes
- Trim acts as an offset on control axes (cyclic X/Y and yaw) and should not directly manipulate physics.
- Keep processing in the Input phase to preserve fixed-timestep determinism.
- Avoid per-frame allocations in control processing.
- Force trim captures the current filtered control values and applies them as the new neutral offsets.
