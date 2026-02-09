# Roadmap: Reign of Rotor

## Overview

The core engine, flight physics, weapons, enemies, and mission systems are built and running. Before building new features, Phase 0 fixes the broken basics: invisible enemies, invisible missiles, bad flight feel, and ugly terrain. Then four phases close the gap from "implemented" to "playable": mission flow, mission loop, combat feedback, and visual polish.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, ...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 0: Fix the Basics** - Make enemies visible, missiles visible, flight controllable, terrain decent
- [ ] **Phase 1: Mission Flow Foundation** - Game state machine, teardown/restart, pause, and tab backgrounding
- [ ] **Phase 2: Mission Loop** - Briefing, debrief, mission select, completion prompt, and all 3 mission types end-to-end
- [ ] **Phase 3: Combat Feedback** - Audio, missile lock feedback, RWR display, damage indicators, and HUD completeness
- [ ] **Phase 4: Visual Polish** - Explosions, missile trails, tracers, and terrain theater style

## Phase Details

### Phase 0: Fix the Basics
**Goal**: Make the existing game playable — enemies visible with procedural meshes, missiles visible with trails, flight arcade-smooth and fun, terrain desert/arid with hills and props
**Depends on**: Nothing (first phase — fixes before features)
**Requirements**: FIX-01 through FIX-10 (new requirements for broken basics)
**Success Criteria** (what must be TRUE):
  1. Player can see all enemy types (SAM sites, radar sites, vehicles) as distinct procedural mesh shapes in uniform military colors
  2. Player can see HUD markers showing enemy positions at distance
  3. Player missiles and SAM missiles are visible as glowing cylinders with smoke/fire trails
  4. Cannon fire shows bright tracer lines from gun toward impact
  5. Hits produce a simple explosion flash (bright flash + expanding sphere)
  6. Helicopter flight is arcade-smooth: strong auto-leveling, auto-hover on collective release, not twitchy
  7. Terrain is desert/arid with hills and valleys, no obvious tiling repetition
  8. Simple procedural props (buildings/structures) scattered on terrain
**Plans**: 3 plans

Plans:
- [x] 00-01-PLAN.md — Enemy, missile, cannon, and explosion visuals + HUD markers
- [x] 00-02-PLAN.md — Arcade flight tuning + auto-hover on collective release
- [x] 00-03-PLAN.md — Desert terrain rework + desert biome props

### Phase 1: Mission Flow Foundation
**Goal**: Player can start, pause, restart, and quit missions without page reload, and the game handles tab backgrounding gracefully
**Depends on**: Phase 0 (basics must work first)
**Requirements**: FLOW-03, FLOW-08
**Success Criteria** (what must be TRUE):
  1. Player can pause the game mid-flight and resume, restart the mission, or quit to menu from a pause overlay
  2. Switching browser tabs auto-pauses the game; returning shows a resume overlay with no time-skip or desync
  3. Player can restart a mission and play again without any page reload -- all game state tears down and reinitializes cleanly
  4. Game transitions between menu, gameplay, and end states via a formal state machine (no hard-coded boot-into-gameplay)
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Mission Loop
**Goal**: Player experiences a complete mission loop -- select a mission, read the briefing, fly and fight, confirm completion, and review results on a debrief screen
**Depends on**: Phase 1 (state machine and teardown/restart must exist)
**Requirements**: FLOW-01, FLOW-02, FLOW-04, FLOW-05, FLOW-06, FLOW-07, MSNT-01, MSNT-02, MSNT-03, MSNT-04, MSNT-05, MSNT-06
**Success Criteria** (what must be TRUE):
  1. Player can pick a quick mission from a menu without page reload and land in a briefing screen showing objectives and waypoint info
  2. Player flies a convoy strike mission end-to-end: briefing, engage convoy, objectives-complete prompt, confirm completion, debrief with stats
  3. Player flies a destroy radar/SAM mission end-to-end with the same complete flow
  4. Player flies an escort mission where convoy vehicles can be damaged/destroyed by enemies, and losing all convoy vehicles fails the mission
  5. Debrief screen shows kills, accuracy, time, and damage taken, with options to restart the same mission or start a new one
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Combat Feedback
**Goal**: Player receives clear audio, visual, and HUD feedback for all combat systems -- missile lock, threats, damage, weapons, and flight instruments feel responsive and informative
**Depends on**: Phase 2 (playable mission loop must exist so feedback can be experienced in context)
**Requirements**: CMBT-01, CMBT-02, CMBT-03, CMBT-04, CMBT-05, CMBT-06, DMG-01, DMG-02, DMG-03, DMG-04, DMG-05, DMG-06, AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, HUD-01, HUD-02, HUD-03, HUD-04, HUD-05, HUD-06
**Success Criteria** (what must be TRUE):
  1. Player hears rotor sound that shifts pitch with RPM, cannon fire, missile launch, and explosion sounds during combat
  2. Player hears escalating RWR warning tones (scan, lock, launch) and sees directional threat indicators showing bearing of each threat
  3. Missile lock requires sustained aim within cone/range; player hears acquisition tone progressing to lock, sees target bracket and lock progress on HUD, and lock breaks when target goes behind terrain
  4. HUD displays altitude AGL, speed, heading, current weapon, ammo/missile/countermeasure counts, lock status, threat warnings, and waypoint bearing/distance at all times
  5. Player sees subsystem health indicators on HUD; taking damage causes visible screen feedback (flash or vignette) and degrades helicopter performance; destruction or critical hit ends the mission
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD
- [ ] 03-04: TBD

### Phase 4: Visual Polish
**Goal**: Combat and world visuals are satisfying -- explosions, projectiles, and terrain have the low-poly modern indie look that makes hits feel impactful
**Depends on**: Phase 3 (combat systems must be feedback-complete before adding visual juice)
**Requirements**: VFX-01, VFX-02, VFX-03, VFX-04
**Success Criteria** (what must be TRUE):
  1. Destroying an enemy produces a visible particle explosion effect
  2. Fired missiles leave a visible smoke/fire trail through the air
  3. Cannon fire shows visible tracers or muzzle flash
  4. Terrain theater has a cohesive low-poly modern indie visual style with visible waypoint markers in the world
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 0 -> 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Fix the Basics | 3/3 | ✓ Complete | 2026-02-09 |
| 1. Mission Flow Foundation | 0/TBD | Not started | - |
| 2. Mission Loop | 0/TBD | Not started | - |
| 3. Combat Feedback | 0/TBD | Not started | - |
| 4. Visual Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-08*
*Last updated: 2026-02-09 — Phase 0 complete (3/3 plans, verified)*
