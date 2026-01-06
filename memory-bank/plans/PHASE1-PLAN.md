# PHASE 1 Plan

## Goals
- Ship a polished browser-playable demo with:
  - Low-poly modern indie visuals (clarity-first).
  - Cockpit-first camera + readable HUD.
  - One helicopter, one map, core weapons, core threats (SAM), and 3 mission templates.
  - Mission completion allowed in-air (landing optional).
  - Stable fixed-timestep sim and solid performance.

## Priority order
1. [P1-1] Repo + Build + Dev UX Baseline
2. [P1-2] Fixed Timestep Loop + System Scheduler
3. [P1-3] Rapier World Integration + Mapping
4. [P1-4] Babylon Scene Bootstrap + Low-Poly Environment Stub
5. [P1-5] Render Binding Layer + Cockpit-First Camera Rig
6. [P1-6] Keyboard + Mouse Input Mapping (MVP)
7. [P1-7] Player Helicopter + Basic Flight Forces
8. [P1-8] Altimeter + Landing Detection
9. [P1-9] Assist Toggles (Stability/Hover)
10. [P1-10] HUD v1 (Cockpit-First)
11. [P1-11] Cannon Weapon
12. [P1-12] Missile Weapon + Guidance
13. [P1-13] Enemy Units v1 (Radar + SAM)
14. [P1-14] Countermeasures + RWR
15. [P1-15] Mission Director + Templates (In-Air Completion)
16. [P1-16] Debrief Screen
17. [P1-17] Difficulty Tuning (“Arcade but Hardcore”)
18. [P1-18] Performance + Pooling + Smoke Tests

## Rough focus by stage
- Stage A (Bootstrapping): P1-1 → P1-5
- Stage B (Controls + feel): P1-6 → P1-10
- Stage C (Combat): P1-11 → P1-14
- Stage D (Replayable loop): P1-15 → P1-16
- Stage E (Ship it): P1-17 → P1-18

## Definition of “MVP Demo Ready”
- Player can start a mission, complete objectives, and finish the mission while airborne.
- Landing is optional; if done, it is recorded (bonus hooks allowed).
- SAM threats are readable and avoidable with skill + countermeasures.
- Performance is stable (no obvious GC hitching during repeated combat).
- No major sim/render desync; physics remains stable across typical frame rates.
