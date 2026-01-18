# PHASE 1 Plan

## Goals
- Ship a polished browser-playable demo with:
  - Low-poly modern indie visuals (clarity-first).
  - Cockpit-first camera + readable HUD.
  - One helicopter, one map, core weapons, core threats (SAM), and 3 mission templates.
  - Mission completion allowed in-air (landing optional).
  - Stable fixed-timestep sim and solid performance.
  - Desktop-only MVP (keyboard+mouse). Provide a clear unsupported notice on mobile.

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
10. [P1-10] Camera Modes v1 (Cockpit vs Chase)
11. [P1-11] HUD v1 (Cockpit-First)
12. [P1-12] Cannon Weapon
13. [P1-13] Missile Weapon + Guidance
14. [P1-14] Enemy Units v1 (Radar + SAM)
15. [P1-15] Countermeasures + RWR
16. [P1-16] Mission Director + Templates (In-Air Completion)
17. [P1-17] Debrief Screen
18. [P1-18] Difficulty Tuning (“Arcade but Hardcore”)
19. [P1-19] Performance + Pooling + Smoke Tests
20. [P1-20] Out-of-Bounds Rules + Warning UI

## Rough focus by stage
- Stage A (Bootstrapping): P1-1 → P1-5
- Stage B (Controls + feel): P1-6 → P1-11
- Stage C (Combat): P1-12 → P1-15
- Stage D (Replayable loop): P1-16 → P1-17
- Stage E (Ship it): P1-18 → P1-19

## Definition of “MVP Demo Ready”
- Player can start a mission, complete objectives, and finish the mission while airborne.
- Landing is optional; if done, it is recorded (bonus hooks allowed).
- SAM threats are readable and avoidable with skill + countermeasures.
- Performance is stable (no obvious GC hitching during repeated combat).
- No major sim/render desync; physics remains stable across typical frame rates.

## Progress updates
- 2026-01-18: P1-7A, P1-7B, P1-11, P1-11B, P1-11C marked done in TICKETS.
