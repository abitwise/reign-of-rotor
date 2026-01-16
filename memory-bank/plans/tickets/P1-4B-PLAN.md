# Ticket P1-4B — World Scale Upgrade: 100x100 Map (Chunked Terrain + Streaming)

**Status:** Done  
**Last Updated:** 2026-01-07

## Summary
Expand the playable world to a 100x100 unit map using chunked terrain tiles with streaming and LOD rings. Ensure terrain visuals and physics ground stay performant and stable while the player moves, and distribute spawn positions across the expanded area.

## Objectives
- Define world bounds, coordinate conventions, and tile sizing for a 100x100 unit map.
- Implement a terrain chunk manager that loads/unloads tiles around the player by radius and assigns LOD tiers.
- Add a physics-ground streaming strategy for terrain tiles to keep collisions stable and avoid giant static colliders.
- Introduce a simple spawn-zone distribution strategy so player spawns are not concentrated near the origin.

## Deliverables
- World configuration describing bounds, tile size, LOD rings, and streaming radii.
- Render-side chunked terrain system that streams tiles and applies near/mid/far LODs.
- Physics-side terrain collider streaming that mirrors the render tiling around the player.
- Updated gameplay bootstrap to select spawn zones within world bounds and to drive terrain streaming.
- Tests covering terrain collider streaming logic and updated ground/altimeter assumptions.

## Notes
- Keep sim and render decoupled: render reads transforms; simulation manages physics state.
- Use modest world coordinates (100x100) to avoid the need for floating-origin rebasing.
- LOD implementation can be basic (subdivision density differences) as long as rings are clear and bounded.
- Update any altimeter/ground tests to reflect chunked terrain colliders instead of a single global plane.
- Spawn distribution now uses world-level spawn zones; mission spawns can build on the same zones later.
