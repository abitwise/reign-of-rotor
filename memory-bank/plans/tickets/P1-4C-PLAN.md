# Ticket P1-4C — Procedural Environment Dressing v1 (Trees + Building Types)

**Status:** Done  
**Last Updated:** 2026-01-08

## Summary
Add procedural environment dressing for the 100x100 world: low-poly trees and a small set of building archetypes. Placement must be deterministic per tile, use instancing for trees, and add colliders only for gameplay-relevant building types. Configuration should be data-driven in content files.

## Objectives
- Define a prop library (tree variants + building archetypes) and biome presets with density caps.
- Generate deterministic prop placement per tile using a seeded RNG.
- Implement render-side dressing that streams with terrain tiles and uses GPU instancing for trees.
- Implement physics-side collider streaming for selected building types.
- Add tests covering deterministic placement and collider filtering.

## Deliverables
- New content config for environment dressing (prop library + biome presets + placement tunables).
- Shared placement helper that produces deterministic props per tile.
- Render-side prop dressing manager that streams with terrain and instances trees.
- Sim-side building collider manager + streaming system.
- Updated gameplay bootstrap to create/drive prop collider streaming.
- Tests for placement determinism and collider selection.

## Notes
- Keep sim and render decoupled: render reads placement output; sim only uses placement for colliders.
- Use modest per-tile densities to keep draw calls and physics colliders bounded.
- No new ECS component schemas for MVP; use static physics colliders for buildings.
 - Tree instancing uses Babylon instanced meshes per variant; building colliders remain axis-aligned for MVP.
