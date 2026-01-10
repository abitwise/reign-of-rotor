# Ticket P1-10 — Camera Modes v1: Cockpit vs Chase + Visibility Policy

**Status:** Done  
**Last Updated:** 2026-01-07  
**Ticket ID:** P1-10  
**Phase:** Phase 1 (MVP Demo)  

---

## Summary
Introduce an explicit camera mode toggle so players can switch between:
- **Cockpit (first-person HUD-only)** — do not render the helicopter model.
- **Chase (third-person)** — render the helicopter model.

This ticket exists to fix current camera issues before HUD work begins. It must define camera movement behavior (pose sources, smoothing, clamps, snap policy) and must not change simulation/physics behavior.

---

## Scope
### In-scope
- A single keybind toggles camera mode at runtime.
- Camera movement requirements for both modes:
  - Target/pose source rules.
  - Translation + rotation smoothing behavior.
  - Look clamp behavior.
  - Snap-to-target behavior.
- Render visibility policy:
  - Cockpit mode hides helicopter visuals.
  - Chase mode shows helicopter visuals.
- Instructions overlay text updated to show the camera toggle and current camera mode.

### Out-of-scope
- Chase camera obstruction avoidance (MVP explicitly **no avoidance**).
- Persistence of camera mode across reloads (session-only state is sufficient).
- Fully modeled cockpit interior.

---

## Functional Requirements

### GIVEN/WHEN/THEN Scenarios

1. **Mode Toggle**
   - GIVEN the game is running
   - WHEN the player presses the camera toggle keybind (default `V`)
   - THEN the camera mode toggles between Cockpit ↔ Chase
   - AND the mode change takes effect immediately (same frame)
   - AND the instructions overlay displays the current camera mode

2. **Cockpit Mode: No Helicopter Visible**
   - GIVEN camera mode is Cockpit
   - WHEN rendering the scene
   - THEN the helicopter mesh(es) are not visible
   - AND no change is made to the helicopter’s physics bodies/colliders (collisions still occur)

3. **Chase Mode: Helicopter Visible**
   - GIVEN camera mode is Chase
   - WHEN rendering the scene
   - THEN the helicopter mesh(es) are visible
   - AND no change is made to the helicopter’s physics bodies/colliders

4. **Mouse Look Behavior**
   - GIVEN either camera mode
   - WHEN the player moves the mouse in pointer-lock (or drag-look fallback)
   - THEN the camera look yaw/pitch offsets update smoothly
   - AND mouse look affects only camera orientation (not flight cyclic)

---

## Camera Movement Requirements (Authoritative)

### Common (Both Modes)
- **Target:** camera tracks the player helicopter entity’s authoritative transform provider.
- **Update frequency:** camera updates in the render loop (per-frame), never in the fixed timestep sim.
- **Smoothing model:** exponential smoothing or equivalent (lerp/slerp) applied to:
  - Translation (camera position)
  - Rotation (camera orientation)
- **Snap policy:** if target displacement exceeds a snap threshold, camera snaps to the desired pose to prevent extreme catch-up (e.g., on teleport/spawn).
- **Look clamps:** yaw and pitch clamps prevent extreme angles; clamps are mode-specific.

### Cockpit (First-Person, HUD-only)
- **Pose source priority:**
  1) Prefer a named attachment node in the helicopter render asset: `@cam_cockpit`.
  2) Fallback to a numeric local offset relative to the helicopter root if the attachment does not exist.
- **Default fallback offset (local):** `{ x: 0, y: 1.55, z: 0.15 }`.
- **Smoothing:** tighter than chase (more stable, less lag). Recommended defaults:
  - position smoothing factor: `0.20`
  - rotation smoothing factor: `0.30`
  - snap threshold: `8 m`
- **Clamps:** tighter to match head-look intent. Recommended defaults:
  - yaw clamp: ±110°
  - pitch clamp: −75° to +75°
- **Visibility policy:** hide the helicopter visual mesh tree. This must not remove physics bodies/colliders.

### Chase (Third-Person)
- **Pose source:** fixed offset relative to helicopter root (no need for `@cam_chase` in MVP).
- **Default offset (local):** `{ x: 0, y: 2.4, z: -7.5 }`.
- **Smoothing:** slightly looser than cockpit (allows minor lag for readability). Recommended defaults:
  - position smoothing factor: `0.14`
  - rotation smoothing factor: `0.22`
  - snap threshold: `12 m`
- **Clamps:** wider to allow better situational awareness. Recommended defaults:
  - yaw clamp: ±160°
  - pitch clamp: −80° to +80°
- **Obstruction:** none in MVP (camera may clip through world).

---

## Technical Notes / Integration Constraints
- Render is read-only: do not write gameplay state from camera/render.
- Mode state can live in render/UI state (not ECS).
- Hiding the helicopter must be done strictly at render layer (e.g., mesh visibility), never by removing colliders/bodies.
- Prefer minimal API surface changes: keep camera rig modular so future obstruction avoidance can be added without affecting sim.

---

## Deliverables
- A camera mode enum/state and a toggle keybind integrated into input/UI.
- A camera rig implementation that supports both mode configurations and selects the correct pose source.
- A render-layer visibility toggle for the helicopter mesh tree driven by camera mode.
- Instructions overlay updated with:
  - camera toggle key
  - current camera mode

---

## Testing Requirements
- Unit test(s) covering:
  - toggling mode changes the mode value
  - cockpit mode sets helicopter mesh visibility to hidden
  - chase mode sets helicopter mesh visibility to visible
- Camera movement (smoothing/clamp/snap) can be validated by existing camera rig tests or new targeted tests if needed.

---

## Definition of Done
- Camera toggle works at runtime and is shown in the instructions overlay.
- Cockpit mode hides helicopter visuals and does not impact collisions.
- Chase mode shows helicopter visuals.
- Camera movement behavior matches the requirements in this plan.
- TICKETS.md and PHASE1-PLAN.md reflect the new ticket ordering.
