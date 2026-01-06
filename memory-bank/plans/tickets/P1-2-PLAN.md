# Ticket P1-2 — Fixed Timestep Loop + System Scheduler

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Implement the fixed-timestep simulation loop and deterministic system scheduler so gameplay remains stable regardless of render frame rate. The loop should clamp runaway deltas, cap per-frame catch-up, and surface instrumentation for debugging.

## Objectives
- Run simulation ticks at a fixed delta (target 60 Hz) with a catch-up strategy that avoids spiraling when frames lag.
- Define ordered system pipeline phases for deterministic execution across input, simulation, physics, and late cleanup.
- Expose per-frame timing metrics (frame delta, fixed delta, steps executed, clamped time) for debug overlays and profiling.

## Deliverables
- Loop module with start/stop controls, requestAnimationFrame driver, and delta clamping + accumulator limits.
- Scheduler that registers systems by phase and executes them in a stable order each tick.
- Debug-facing metrics object for render/UI overlays showing dt and steps-per-frame information.
- Tests covering the catch-up behavior and phase ordering.

## Notes
- Keep simulation timing independent from Babylon render frames.
- Avoid allocations in hot paths; reuse step context objects where possible.
- Clamp extreme tab-resume deltas to prevent catch-up spirals.
