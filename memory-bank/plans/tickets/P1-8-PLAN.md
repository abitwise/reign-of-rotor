# Ticket P1-8 — Altimeter Raycast + Landing Detection

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Add a physics-backed altimeter raycast to read altitude AGL each fixed tick, drive landing vs hard-landing/crash transitions, and surface the results on the HUD.

## Objectives
- Sample AGL via a downward raycast that ignores the helicopter’s own body.
- Detect landing, hard-landing, and crash thresholds from descent speed, storing impact severity for future damage hooks.
- Display altitude, vertical speed, and landing state on the HUD.

## Deliverables
- Altimeter system running in the PostPhysics phase, updating the player helicopter’s landing state from Rapier queries.
- Threshold logic that categorizes gentle landings vs hard impacts and records the latest impact severity.
- HUD readout showing AGL, vertical speed, and landing/crash state that updates during flight.

## Notes
- Keep the sim authoritative: raycast from the physics pose and avoid render-side mutation.
- Once marked crashed, keep that state sticky; other landing states reset when airborne again.
