# Ticket P1-11B — Avionics HUD v2 (Instruments + Alerts + Navigation Lite)

**Status:** Done  
**Last Updated:** 2026-01-17  
**Ticket ID:** P1-11B  
**Phase:** Phase 1 (MVP Demo)

---

## Summary
Expand the cockpit-first HUD with core flight instruments, power/RPM cues, navigation bearing/distance, and prioritized alerts. The HUD remains an HTML overlay that reads sim state and renders instrument widgets plus a single alert banner for the highest-priority warning.

---

## Scope
### In-scope
- Instrument widgets: IAS, VSI, attitude (pitch/roll), heading, rotor RPM, power/torque margin, optional fuel (if data exists).
- Navigation lite: bearing + distance to current waypoint/objective.
- Alert manager with priority ordering to show the most urgent alert (weapon/lock/launch + aircraft warnings).
- Tunable thresholds for avionics alerts in `content/**`.

### Out-of-scope
- Full avionics simulation or detailed VRS physics model.
- Mission/waypoint creation (only consume active waypoint if present).
- New combat/threat systems beyond reading existing state/events.

---

## Functional Requirements

### GIVEN/WHEN/THEN Scenarios
1. **Core Instruments**
   - GIVEN the helicopter is flying
   - WHEN the HUD is visible
   - THEN IAS, AGL, VSI, heading, and attitude values update in real time.

2. **Power/RPM Alerts**
   - GIVEN power margin is low or rotor RPM droops below threshold
   - WHEN near limits
   - THEN the HUD shows “POWER LIMIT” and/or “LOW ROTOR RPM”.

3. **VRS Warning (Heuristic)**
   - GIVEN steep descent with low forward speed (if VRS heuristic enabled)
   - WHEN entering the danger envelope
   - THEN the HUD shows “VRS/SETTLING” warning.

4. **Navigation Lite**
   - GIVEN a waypoint objective is active
   - WHEN the HUD is visible
   - THEN it shows bearing and distance to that waypoint.

5. **Alert Priority**
   - GIVEN multiple alerts are active
   - WHEN the HUD is visible
   - THEN only the highest-priority alert appears in the banner area.

---

## Technical Notes / Integration Constraints
- UI must remain HTML overlay and must not mutate sim state.
- Read sim state via existing providers; add new HUD-ready selectors if needed.
- Alert manager should accept both avionics warnings and combat lock/launch warnings.
- Use data-driven thresholds in `content/**` (avoid hard-coded magic numbers).

---

## Deliverables
- New HUD instrument widgets (IAS, VSI, attitude, heading, rotor RPM, power/torque).
- Navigation readout (bearing + distance) for active waypoint.
- Alert manager with priority ordering and clear short labels.
- Content config for avionics thresholds and alert priority rules.

---

## Testing Requirements
- Add/adjust unit tests for any new selectors or alert-priority logic.
- Manual smoke: verify instruments update, alerts appear at thresholds, waypoint bearing/distance updates.

---

## Definition of Done
- HUD shows required instruments and nav-lite readout.
- Alert banner displays only the highest-priority alert.
- Thresholds are data-driven in `content/**`.
- No sim state is mutated from UI.
- TICKETS.md and this plan are updated when the ticket is completed.

## Notes
- VRS warning uses a heuristic until full VRS physics exists.
- Navigation readout uses a configurable default waypoint until mission objectives are wired.
