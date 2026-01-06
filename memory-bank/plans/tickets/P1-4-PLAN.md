# Ticket P1-4 — Babylon Scene Bootstrap + Render Binding Layer

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Stand up the Babylon.js rendering stack with a minimal scene so ECS/physics entities can be visualized. Provide an asset manifest-driven loader and a binding layer that projects simulation transforms onto meshes without coupling render to the fixed timestep loop.

## Objectives
- Create the Babylon engine + scene with a placeholder camera/light and environment stub suitable for early flight tuning.
- Add a mesh registry/binding system that updates mesh transforms from authoritative entity data (ECS/physics) each render frame.
- Introduce an asset manifest (GLB/glTF) and loader skeleton that maps mesh ids to asset paths and surfaces load failures clearly during development.

## Deliverables
- Render bootstrap that mounts a canvas, configures the Babylon scene (camera, lighting, ground/sky placeholder), and hooks into the app shell.
- Binding utilities to associate entity ids with meshes and sync their transforms from the simulation/physics source of truth.
- Asset manifest JSON + loader helpers that validate manifest entries, load GLB/glTF assets, and expose clear errors or fallbacks when assets are missing.

## Notes
- Keep rendering read-only: meshes follow sim/physics transforms; the render layer must not mutate gameplay state.
- Prefer glTF/GLB assets for the manifest, but ensure missing assets fail loudly and recover gracefully in dev builds.
- Keep per-frame allocations minimal in binding/update paths to avoid render hitches.
- Placeholder glTF is included for the preview mesh; render bindings fall back to a debug box if assets are missing.
