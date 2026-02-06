# P1-15 Countermeasures + Threat Warning Receiver (RWR) — Plan

**Status:** Done
**Owner:** AI Agent
**Last Updated:** 2026-02-09

## Summary
Add simplified countermeasures (flares/chaff) with inventory + cooldown, integrate decoy logic for incoming SAM missiles, and wire an RWR-style threat warning feed into the HUD alert system.

## Requirements (from TICKETS.md)
- Countermeasure inventory + cooldown.
- Missile decoy/lost-lock logic.
- RWR warnings wired to HUD.

## Relevant Docs
- `memory-bank/PRODUCT.md` (threat warnings, countermeasure limits, sim/render separation).
- `memory-bank/ARCHITECTURE.md` (fixed timestep, sim owns gameplay state).
- `memory-bank/CONTRIBUTING.md` (data-driven configs, tests).
- `memory-bank/LONG_TERM_MEMORY.md` (avoid allocations in hot loops, keep sim deterministic-ish).

## Implementation Plan
1. **Define countermeasure tuning/config**
   - Add content config for countermeasure ammo, cooldown, active duration, and effective decoy radius.
   - Add labels for RWR warnings (scan/lock/launch) in a small config module for easy tuning.
2. **Extend input + HUD instructions**
   - Add a countermeasure input binding and edge-triggered state in `PlayerInputState`.
   - Update the instructions panel to show the countermeasure key.
3. **Implement countermeasure state + system**
   - Add a sim state object tracking ammo, cooldown, and active decoy window + position.
   - Implement a fixed-timestep system that consumes input, decrements timers, and records deploy events.
4. **Apply decoy logic to SAM missiles**
   - Update SAM missile guidance to drop/ignore the player target when a decoy is active within the configured radius.
   - Keep logic deterministic and lightweight (no per-frame allocations).
5. **Threat receiver readout + HUD wiring**
   - Add a threat readout helper that derives scan/lock/launch from enemy state (radar detection, SAM lock progress, SAM missiles in flight).
   - Wire the provider into `createRootUi` so alert banners include RWR warnings.
6. **Tests**
   - Add unit tests for countermeasure deployment (ammo/cooldown behavior).
   - Add unit tests for threat readout selection and SAM decoy behavior.

## Acceptance Criteria
- Countermeasures have ammo + cooldown, and deploying consumes ammo while triggering a short-lived decoy state.
- SAM missiles drop lock when the decoy is active within the configured radius.
- HUD alert banner shows SCAN / LOCK / LAUNCH warnings based on enemy activity.
- Tests validate countermeasure state transitions and threat readout selection.

## Notes
- Keep sim state separate from UI/render and avoid introducing render-driven gameplay changes.
- If tuning feels off, prefer adjusting content config rather than hardcoding values in systems.
- `pnpm test:e2e` is not defined at the workspace root, so the e2e smoke run could not be executed.
