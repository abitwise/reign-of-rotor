---
phase: 00-fix-the-basics
plan: 03
subsystem: render
tags: [babylon.js, terrain, procedural, vertex-displacement, noise, desert, biome]

# Dependency graph
requires:
  - phase: none
    provides: existing terrain chunk manager and prop dressing system
provides:
  - Desert terrain with vertex-displaced hills and per-vertex sand colors
  - Multi-octave terrainHeight() function exported for reuse
  - Desert biome preset dominating 70% of tile generation
  - Desert building archetypes (hut, compound, tower)
  - Eliminated green patches (density 0)
affects: [01-mission-flow, terrain-colliders, altimeter]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-vertex color instead of tiled DynamicTexture for terrain appearance"
    - "Multi-octave value noise with smoothstep for procedural heightmaps"
    - "Biome weighting via pickBiome() probability distribution"

key-files:
  created: []
  modified:
    - apps/game/src/render/terrain/terrainChunkManager.ts
    - apps/game/src/content/propDressing.ts

key-decisions:
  - "Vertex colors over texture: avoids tiling artifacts, simpler material pipeline"
  - "8m base amplitude with 3 octaves: visible hills that keep flat physics colliders usable"
  - "Desert biome at 70% with industrial and farmland for remaining 30%"

patterns-established:
  - "terrainHeight(worldX, worldZ): exported height function for consistent terrain queries across systems"
  - "Desert biome as default theater: all props/buildings use sandy/tan palette"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 0 Plan 3: Desert Terrain and Biome Summary

**Vertex-displaced desert terrain with multi-octave hills, per-vertex sand colors, and desert biome props replacing tiled grid**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T11:53:52Z
- **Completed:** 2026-02-09T11:56:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced tiled DynamicTexture grid terrain with per-vertex sandy desert colors and subtle noise variation
- Added multi-octave value noise vertex displacement creating gentle rolling hills (~8m amplitude)
- Introduced desert biome preset (70% of tiles) with 3 new sandy building archetypes and zero tree density
- Eliminated green patches entirely (density set to 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Desert terrain material and heightmap hills** - `56ecb6f` (feat)
2. **Task 2: Desert biome props and updated prop rendering** - `205cf69` (feat)

## Files Created/Modified
- `apps/game/src/render/terrain/terrainChunkManager.ts` - Replaced DynamicTexture material with vertex colors; added terrainHeight() noise function and vertex displacement in chunk creation
- `apps/game/src/content/propDressing.ts` - Added desert building archetypes, desert biome preset, updated pickBiome weighting, set greenPatchDensity to 0, updated settlement building variants

## Decisions Made
- Used per-vertex colors (RGBA Float32Array) instead of any texture to completely avoid tiling artifacts. Material diffuseColor set to white so vertex colors pass through unmodified.
- Kept base amplitude at 8m with 3 octaves (frequency 0.002 base) -- creates visible rolling hills but stays gentle enough that flat physics colliders still work without terrain-conforming collision shapes.
- Desert biome dominates at 70% with industrial (15%) and farmland (15%) for variety. Removed temperate and greenbelt biomes from the distribution.
- New desert building archetypes use sandy/tan hex colors (#c4a87a, #b8a070, #a89060) consistent with arid theater.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Terrain visual foundation is complete for the desert theater
- terrainHeight() is exported and available for future systems (e.g., terrain-conforming colliders, prop placement elevation)
- Note: Physics terrain colliders still use flat planes -- a future task could use terrainHeight() to create height-conforming colliders if needed
- All existing tests pass (153/153), build succeeds, lint clean

---
*Phase: 00-fix-the-basics*
*Completed: 2026-02-09*
