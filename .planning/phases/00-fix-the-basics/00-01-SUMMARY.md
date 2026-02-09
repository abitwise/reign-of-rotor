---
phase: 00-fix-the-basics
plan: 01
subsystem: render
tags: [babylon.js, procedural-mesh, particles, dom-hud, visual-managers]

# Dependency graph
requires:
  - phase: none
    provides: "First plan in first phase"
provides:
  - "EnemyVisualManager: procedural mesh rendering for SAM, radar, vehicle enemies"
  - "MissileVisualManager: glowing cylinder meshes with particle smoke/fire trails"
  - "WeaponVfxManager: cannon tracer lines and explosion flash effects"
  - "HudMarkerManager: DOM-based diamond markers for enemy screen-space positions"
  - "Visual manager wiring pattern in createApp.ts onBeforeRender"
affects: [00-fix-the-basics, 04-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Visual manager pattern: class with constructor(Scene), update(), dispose()"
    - "onBeforeRenderObservable for per-frame visual updates outside sim loop"
    - "Shared materials across pooled procedural meshes"
    - "DOM overlay markers with CSS transform positioning"

key-files:
  created:
    - apps/game/src/render/visuals/enemyVisualManager.ts
    - apps/game/src/render/visuals/missileVisualManager.ts
    - apps/game/src/render/visuals/weaponVfxManager.ts
    - apps/game/src/render/visuals/hudMarkerManager.ts
  modified:
    - apps/game/src/boot/createApp.ts

key-decisions:
  - "Visual managers use TransformProvider for position reads (consistent with meshBindingSystem pattern)"
  - "HudMarkerManager accesses EnemyUnit.body directly for position (pragmatic for DOM overlay layer)"
  - "Particle trails use tiny inline base64 texture instead of external asset file"
  - "Explosion flashes use frame-counted animation (10 frames) not time-based (simpler, deterministic)"
  - "Tracer lines live for 2 frames only (fast enough to feel instant, visible for 1-2 render frames)"

patterns-established:
  - "Visual manager lifecycle: construct with Scene, update with state+provider, dispose for cleanup"
  - "Visual managers wired in createApp.ts after gameplay bootstrap, disposal via closured disposer array"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 0 Plan 1: Enemy/Missile/Weapon Visuals Summary

**Four procedural visual managers rendering enemies as distinct mesh silhouettes, missiles with particle trails, cannon tracers, explosion flashes, and DOM-based HUD enemy markers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T11:53:48Z
- **Completed:** 2026-02-09T11:58:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All enemy types (SAM, radar, vehicle) render as distinct procedural mesh silhouettes in olive-drab military color
- Player missiles and SAM missiles render as glowing emissive cylinders with particle smoke/fire trails
- Cannon impacts produce bright yellow-orange tracer lines that flash for 2 frames
- Explosion events produce expanding bright flash spheres that fade over 10 frames
- HUD diamond markers show enemy screen-space positions as red-bordered diamonds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create enemy and missile visual managers** - `d6bf968` (feat)
2. **Task 2: Create weapon VFX, HUD markers, and wire all visual managers into render loop** - `9ec3fb6` (feat)

## Files Created/Modified
- `apps/game/src/render/visuals/enemyVisualManager.ts` - Procedural mesh creation (SAM/radar/vehicle silhouettes) with shared olive-drab material, entity lifecycle tracking
- `apps/game/src/render/visuals/missileVisualManager.ts` - Glowing cylinder meshes with ParticleSystem smoke/fire trails for player and SAM missiles
- `apps/game/src/render/visuals/weaponVfxManager.ts` - Cannon tracer lines (2-frame lifetime) and explosion flash spheres (10-frame expand+fade)
- `apps/game/src/render/visuals/hudMarkerManager.ts` - DOM-based diamond markers pooled and positioned via Vector3.Project screen-space projection
- `apps/game/src/boot/createApp.ts` - Instantiates all four visual managers, wires into onBeforeRender, adds disposal to destroy handler

## Decisions Made
- Used frame-counting for VFX animation (tracers: 2 frames, explosions: 10 frames) rather than time-based, for simplicity and render-frame alignment
- Visual managers follow the established TransformProvider pattern for reading entity positions from physics
- HUD markers use DOM elements with CSS transforms rather than Babylon.js GUI, for better text rendering and simpler screen-space positioning
- Particle trail uses inline base64 placeholder texture to avoid adding external asset files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All enemy and missile rendering systems are in place
- Next plan (00-02) can tune flight feel independently
- Phase 4 (Visual Polish) can enhance these visual managers with richer effects later

---
*Phase: 00-fix-the-basics*
*Completed: 2026-02-09*
