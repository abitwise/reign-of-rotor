# Ticket P1-11 — HUD v1 (Cockpit-First, HTML Overlay)

**Status:** Done  
**Last Updated:** 2026-01-08  
**Ticket ID:** P1-11  
**Phase:** Phase 1 (MVP Demo)

---

## Summary
Implement a minimal cockpit-first HUD overlay that surfaces key flight and combat awareness data, including speed, AGL, heading, weapon/ammo/lock state, and threat warnings. The HUD must also be able to display an out-of-bounds warning with a countdown when mission bounds logic is active.

---

## Scope
### In-scope
- Flight readouts for speed, AGL altitude, and heading.
- Combat panel showing weapon name, ammo count, and lock state.
- Threat warning area that can display lock/launch alerts.
- Out-of-bounds warning banner with countdown support (hidden when inactive).
- HUD remains an HTML overlay and does not mutate sim state.

### Out-of-scope
- Implementing weapon systems, lock logic, or threat detection (future tickets).
- Final avionics instrumentation (HUD v2).
- Mission bounds logic (P1-20).

---

## Functional Requirements

### GIVEN/WHEN/THEN Scenarios
1. **Flight Readouts**
   - GIVEN the helicopter is flying
   - WHEN the HUD is visible
   - THEN it shows speed, altitude AGL, and heading values updated in real time.

2. **Weapon/Ammo/Lock State**
   - GIVEN combat systems are available
   - WHEN the HUD is visible
   - THEN it displays the current weapon name, ammo count, and lock state.
   - AND if no combat data is available, the HUD shows clear placeholders (e.g., “—”).

3. **Threat Warning**
   - GIVEN a lock or launch warning is active
   - WHEN the HUD is visible
   - THEN a threat banner is shown with the warning label.
   - AND if no warning is active, the banner is hidden.

4. **Out-of-Bounds Warning**
   - GIVEN the player exits mission bounds
   - WHEN the HUD is visible
   - THEN an out-of-bounds warning appears with a countdown timer.
   - AND the banner hides when the player returns in bounds.

---

## Technical Notes / Integration Constraints
- HUD must remain an HTML overlay; no canvas rendering changes.
- UI reads sim/physics state via providers; do not mutate simulation state from UI.
- Use existing altimeter system or a lightweight sim-derived state to provide heading.
- Provide data hooks for weapon/lock/threat warnings even if systems are not yet implemented.

---

## Deliverables
- HUD panel for flight readouts with speed, AGL, and heading.
- Combat HUD panel for weapon, ammo, and lock state.
- Threat warning banner and out-of-bounds warning banner (hidden by default).
- Updated styling in `style.css` to keep cockpit-first readability.

---

## Testing Requirements
- Add/adjust unit tests if new sim state (e.g., heading) is introduced.
- Manual smoke verification: HUD shows updated values; banners show/hide with placeholder state.

---

## Definition of Done
- HUD shows speed, AGL, and heading in the cockpit overlay.
- Weapon/ammo/lock and threat warning areas are present with placeholder data until systems exist.
- Out-of-bounds banner supports countdown display and is hidden when inactive.
- No sim state is mutated from UI.
- TICKETS.md and this plan are updated when the ticket is completed.

## Notes
- Implemented HUD placeholder panels and banners in UI while deferring live combat/threat/out-of-bounds data to future systems.
