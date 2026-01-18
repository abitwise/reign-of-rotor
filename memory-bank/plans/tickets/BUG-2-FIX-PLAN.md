# BUG-2 Fix Plan — World scale still 100x100 units (needs 10 km x 10 km)

## Ticket summary
- World bounds are still 100x100 units, so terrain/props/physics clamp to a tiny area.
- Terrain streaming and physics/prop collider streaming are limited to very small radii and tile sizing.
- Goal: update world to 10 km x 10 km while keeping streaming budgets reasonable and preserving sim/render separation.

## Requirements (from TICKETS.md)
- World bounds must reflect 10 km x 10 km (10,000 x 10,000 units) instead of 100x100.
- Terrain rendering and physics/props streaming must operate within the expanded bounds (no clamping to 100x100).
- Keep fixed-timestep behavior; do not make sim depend on render FPS.

## Relevant files
- apps/game/src/content/world.ts (bounds, tile size, LOD ring config, spawn zones)
- apps/game/src/render/terrain/terrainChunkManager.ts (LOD ring radius usage)
- apps/game/src/render/props/propDressingManager.ts (tile streaming)
- apps/game/src/sim/terrain/terrainColliders.ts (physics ground streaming)
- apps/game/src/sim/terrain/propColliders.ts (prop colliders streaming)
- apps/game/src/content/__tests__/world.test.ts (tile math expectations)

## Root-cause hypothesis to validate
The world bounds and tile sizing remain at the original MVP 100x100 constraints, so all streaming and collider generation clamps to a very small area. Increasing bounds and recalibrating tile size/LOD ring radii should expand the playable area without changing system architecture.

## Plan
1. **Confirm constraints**: Review world config usage and tests to ensure changes are localized to data/config (no ECS schema changes).
2. **Update world configuration**:
   - Set bounds to $[-5000, 5000]$ for both X and Z (10 km x 10 km).
   - Increase `tileSize` to $100$ to keep tile counts and streaming budgets reasonable.
   - Adjust LOD ring radii to cover a larger visible area per tile size while keeping mesh counts bounded.
   - Update spawn zones to be distributed across the expanded world.
3. **Update tests**:
   - Fix world tile math tests to reflect the new bounds/tile size (origin tile index and tile centers).
4. **Validate streaming behavior**:
   - Ensure terrain/prop colliders still stream around the player (no changes needed beyond config).

## Success criteria
- World bounds are 10,000 x 10,000 units.
- Terrain/props/physics stream within the larger bounds and are no longer limited to 100x100.
- Unit tests related to world configuration pass with updated expectations.

## Notes / constraints
- Avoid architecture changes or ECS schema changes.
- Keep sim/render separation intact.
- Keep allocations minimal in hot paths.
