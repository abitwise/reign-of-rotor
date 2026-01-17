# Ticket P1-11C — Debug Avionics Overlay (Tuning & Telemetry)

**Status:** Done  
**Last Updated:** 2026-01-17  
**Ticket ID:** P1-11C  
**Phase:** Phase 1 (MVP Demo)

---

## Summary
Add a dev-only debug overlay that exposes input processing (raw vs filtered), trim offsets, power margin/RPM telemetry, and core avionics flags. This overlay is toggled in dev builds and should have zero runtime cost in production when disabled.

---

## Scope
### In-scope
- Debug overlay panel toggle (dev-only) wired to the existing UI container.
- Input processing telemetry: raw vs filtered ControlState per axis and trim offsets.
- Power telemetry: rotor RPM, power required/available, power margin.
- State flags: VRS heuristic status and any available flight state flags (ETL/ground effect if present).
- Optional hook for a simple thrust/vector gizmo (text readout or placeholder hook).

### Out-of-scope
- New physics/sim features for ETL/ground effect/VRS.
- Rendering a 3D vector gizmo in Babylon (unless already supported).
- Changes to fixed-timestep scheduling or ECS schemas.

---

## Functional Requirements

### GIVEN/WHEN/THEN Scenarios
1. **Toggle visibility**
   - GIVEN dev mode with debug overlay enabled
   - WHEN the player toggles the debug overlay
   - THEN the panel shows/hides without impacting simulation.

2. **Input telemetry**
   - GIVEN the helicopter is flying
   - WHEN inputs are applied
   - THEN the overlay shows raw vs filtered values for collective, cyclic X/Y, and yaw, plus trim offsets.

3. **Power/RPM telemetry**
   - GIVEN flight is active
   - WHEN power demand changes
   - THEN the overlay shows rotor RPM, power required/available, and margin values.

4. **Avionics flags**
   - GIVEN avionics thresholds are met
   - WHEN VRS heuristic is triggered
   - THEN the overlay shows the VRS flag as active (and other flags if present).

---

## Technical Notes / Integration Constraints
- Overlay must remain UI-only (HTML), reading sim state but not mutating it.
- Use existing HUD readouts or selectors for telemetry to avoid duplicating logic.
- Ensure dev-only behavior using build config (no production overhead).

---

## Deliverables
- Updated debug overlay UI with input processing and power telemetry sections.
- New readout wiring to feed control state + avionics telemetry into the overlay.
- Optional placeholder hook for thrust/vector gizmo data.

---

## Testing Requirements
- Update/add unit tests for any new readout selectors (if created).
- Manual smoke: toggle overlay, verify input/power values update.

---

## Definition of Done
- Debug overlay shows input raw/filtered values and trim offsets.
- Power/RPM/margin data visible in overlay during flight.
- VRS flag displays when heuristic triggers.
- Overlay is dev-only and toggleable.
- TICKETS.md and this plan are updated when the ticket is completed.

---

## Notes
- ETL/ground-effect flags are shown only if data exists; otherwise display N/A.
- No changes to sim/physics contracts for this ticket.
