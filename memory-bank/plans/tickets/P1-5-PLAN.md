# Ticket P1-5 — Render Binding Layer + Cockpit-First Camera Rig

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Project the simulation/physics transforms onto Babylon meshes and introduce a cockpit-first camera rig with smoothing and pointer-lock-friendly mouse look. The render layer should stay read-only, following the authoritative transforms provided by the simulation/physics stack while giving players a stable cockpit view.

## Objectives
- Keep the mesh binding layer synchronized with authoritative entity transforms and resilient to missing data.
- Provide a cockpit-first camera rig that follows an entity’s transform with configurable offset, smoothing, and clamps to avoid nausea.
- Add minimal mouse-look and pointer lock hooks so the cockpit camera can be steered without interfering with future input mapping.

## Deliverables
- Render bootstrap wiring that updates mesh bindings from the transform provider every frame and exposes a clear API to retarget bindings.
- A cockpit camera rig that reads entity transforms, applies offsets, and smooths translation/rotation for stable first-person viewing.
- Mouse-look handling with pointer lock support that feeds look offsets into the camera rig without coupling to simulation inputs.

## Notes
- Rendering must remain read-only; transforms come from the sim/physics provider, and render should not mutate gameplay state.
- Prioritize low-allocation update paths for per-frame camera and binding updates.
- Third-person camera remains out-of-scope for MVP; keep the rig modular so alternative views can be added later without entangling with sim state.
