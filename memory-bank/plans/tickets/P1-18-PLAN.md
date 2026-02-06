# P1-18 Difficulty Tuning: “Arcade but Hardcore” — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-06

## Summary
Introduce difficulty presets that tune SAM lock/accuracy/damage, add a player damage model with subsystem degradation curves, and capture minimal session telemetry (average mission time, deaths, and causes) without coupling UI to sim.

## Requirements (from TICKETS.md)
- Define tuning presets (Easy/Normal/Hard) for SAM accuracy/lock time/damage scaling.
- Tune subsystem degradation curves.
- Add minimal telemetry (average mission time, deaths, causes).

## Relevant Docs
- `memory-bank/PRODUCT.md` (damage severity target; cockpit-first HUD).
- `memory-bank/ARCHITECTURE.md` (sim authoritative; UI read-only; fixed timestep).
- `memory-bank/CONTRIBUTING.md` (data-driven configs; no render → sim mutation).
- `memory-bank/LONG_TERM_MEMORY.md` (damage policy; fixed timestep invariants).

## Implementation Plan
1. **Difficulty presets + tuning adapters**
   - Add a `content/difficulty.ts` module with Easy/Normal/Hard presets.
   - Provide helpers to apply SAM tuning multipliers (lock time, accuracy, damage).
   - Include player damage scaling and subsystem degradation curve config in the presets.
2. **Player damage state + subsystem degradation**
   - Add a `sim/playerDamage.ts` module with hull + subsystem health (engine/rotor/avionics/weapons/sensors).
   - Apply curve-driven degradation to flight/assist/weapon behavior (power, lift/torque, stability, lock capability).
   - Wire in SAM explosion damage and crash impacts; set mission status to failed when hull reaches zero.
3. **Telemetry capture**
   - Add a lightweight telemetry state that records total mission time, average duration, death counts, and causes.
   - Update on mission completion/failure and log a concise summary for now (no UI coupling).
4. **Bootstrap wiring**
   - Thread difficulty preset into gameplay bootstrap (SAM config + player damage config + telemetry system).
5. **Tests**
   - Add unit tests for player damage curve application and telemetry aggregation.

## Acceptance Criteria
- SAM behavior reflects difficulty presets (lock time, accuracy, damage) without breaking existing mission flow.
- Player damage reduces capability before total failure; subsystem curves are data-driven.
- Mission fails when player hull reaches zero or crash impact applies fatal damage.
- Telemetry records average mission time and death causes for the session.

## Notes
- Keep sim data in `sim/**` and tuning in `content/**`.
- Avoid per-frame allocations; reuse arrays and inline math helpers.
- Ensure any UI remains read-only if surfaced later.
