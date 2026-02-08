# Requirements: Reign of Rotor

**Defined:** 2026-02-08
**Core Value:** A satisfying cockpit helicopter combat loop where the player flies, fights, and survives against deadly but fair threats -- all running in a browser with no install.

## v1 Requirements

Requirements for MVP completion. Each maps to roadmap phases.

### Mission Flow

- [ ] **FLOW-01**: Player can start a quick mission from a menu without page reload
- [ ] **FLOW-02**: Player sees a mission briefing with objectives and waypoint before flying
- [ ] **FLOW-03**: Player can pause the game and resume, restart, or quit from a pause menu
- [ ] **FLOW-04**: Player sees a debrief screen with stats (kills, accuracy, time, damage taken) after mission ends
- [ ] **FLOW-05**: Player can restart the same mission or start a new mission from the debrief screen
- [ ] **FLOW-06**: Player receives "Objectives complete" prompt when primary objectives are met
- [ ] **FLOW-07**: Player must explicitly confirm "Complete mission now" (no auto-complete)
- [ ] **FLOW-08**: Game auto-pauses when browser tab is backgrounded and shows resume overlay on return

### Combat Feedback

- [ ] **CMBT-01**: Missile lock requires sustained aim time within cone + range; breaking cone/range resets lock timer
- [ ] **CMBT-02**: Player hears missile lock acquisition tone that progresses from search to lock
- [ ] **CMBT-03**: Player sees target bracket and lock progress indicator on HUD
- [ ] **CMBT-04**: Player hears RWR warning tones that distinguish scan, lock, and launch threats
- [ ] **CMBT-05**: Player sees RWR directional threat indicators showing bearing of each threat
- [ ] **CMBT-06**: LOS check breaks missile lock when target is behind terrain

### Damage & Health

- [ ] **DMG-01**: Subsystem damage degrades helicopter performance (engine, rotor, avionics, weapons, sensors)
- [ ] **DMG-02**: Player sees subsystem health indicators on HUD showing degradation state
- [ ] **DMG-03**: Instant death reserved for extreme impacts or critical missile hits (tuned, not frequent)
- [ ] **DMG-04**: Player sees visual hit feedback (screen flash or damage vignette) when taking damage
- [ ] **DMG-05**: Helicopter destroyed OR critical hit results in mission failure
- [ ] **DMG-06**: Out-of-bounds triggers warning timer, then mission failure if not corrected

### Mission Types

- [ ] **MSNT-01**: Convoy strike mission works end-to-end (destroy enemy convoy)
- [ ] **MSNT-02**: Destroy radar/SAM site mission works end-to-end
- [ ] **MSNT-03**: Escort mission works end-to-end (protect ally convoy traveling between points)
- [ ] **MSNT-04**: Quick mission generator selects from 3 templates with seeded randomization
- [ ] **MSNT-05**: Escort convoy vehicles can be damaged and destroyed by enemies
- [ ] **MSNT-06**: Escort mission fails if all convoy vehicles are destroyed

### Audio

- [ ] **AUD-01**: Player hears rotor sound linked to RPM (pitch shifts with throttle)
- [ ] **AUD-02**: Player hears cannon fire sound when shooting
- [ ] **AUD-03**: Player hears missile launch sound
- [ ] **AUD-04**: Player hears explosion sounds when enemies are destroyed
- [ ] **AUD-05**: Player hears RWR warning beeps (distinct tones for scan/lock/launch)

### HUD Completeness

- [ ] **HUD-01**: HUD displays altitude AGL, speed, heading at all times during flight
- [ ] **HUD-02**: HUD displays current weapon, ammo count, missile count, countermeasure count
- [ ] **HUD-03**: HUD displays missile lock status (search/acquiring/locked/no target)
- [ ] **HUD-04**: HUD displays threat warning indicators with directional bearing
- [ ] **HUD-05**: HUD displays damage state (hull health + subsystem indicators)
- [ ] **HUD-06**: HUD displays waypoint bearing and distance to current objective

### Visual Polish

- [ ] **VFX-01**: Explosions render with particle effects when enemies are destroyed
- [ ] **VFX-02**: Missile trails render as visible smoke/fire trails
- [ ] **VFX-03**: Cannon tracers or muzzle flash visible when firing
- [ ] **VFX-04**: Terrain theater has low-poly modern indie visual style with waypoint markers

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Progression

- **PROG-01**: Player earns rank/medals based on mission performance
- **PROG-02**: Landing at base tracked as optional bonus stat
- **PROG-03**: Detailed debrief with accuracy percentage, time bonuses, rating

### Camera

- **CAM-01**: Third-person chase camera available as alternate view

### Settings

- **SET-01**: Player can adjust audio volume
- **SET-02**: Player can view and customize key bindings
- **SET-03**: Player can toggle assists (stability, hover) from settings

### Difficulty

- **DIFF-01**: Player can select difficulty (easy/normal/hard) before mission

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiplayer (co-op or PvP) | Doubles complexity, breaks determinism, indie-killer scope |
| Full realistic flight model | Months of tuning for niche within niche; current sim-feel approach is correct |
| Clickable cockpit instruments | Massive art and interaction scope; conflicts with mouse-look |
| Campaign with narrative | Content-heavy; not the core value proposition |
| Multiple helicopter types | Each needs unique tuning, art, weapons; ship one perfectly |
| Mobile/touch controls | Experience is terrible on touch; desktop only |
| Real-time minimap | Breaks cockpit immersion, reduces RWR value |
| Target cycling | Keep reticle-based targeting simple for MVP |
| Weapon loadout customization | Balance implications; fixed loadout per mission |
| Weather effects | Rendering and physics implications; future consideration |
| Persistent economy/upgrades | Distracts from core flight/combat loop |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 2 | Pending |
| FLOW-02 | Phase 2 | Pending |
| FLOW-03 | Phase 1 | Pending |
| FLOW-04 | Phase 2 | Pending |
| FLOW-05 | Phase 2 | Pending |
| FLOW-06 | Phase 2 | Pending |
| FLOW-07 | Phase 2 | Pending |
| FLOW-08 | Phase 1 | Pending |
| CMBT-01 | Phase 3 | Pending |
| CMBT-02 | Phase 3 | Pending |
| CMBT-03 | Phase 3 | Pending |
| CMBT-04 | Phase 3 | Pending |
| CMBT-05 | Phase 3 | Pending |
| CMBT-06 | Phase 3 | Pending |
| DMG-01 | Phase 3 | Pending |
| DMG-02 | Phase 3 | Pending |
| DMG-03 | Phase 3 | Pending |
| DMG-04 | Phase 3 | Pending |
| DMG-05 | Phase 3 | Pending |
| DMG-06 | Phase 3 | Pending |
| MSNT-01 | Phase 2 | Pending |
| MSNT-02 | Phase 2 | Pending |
| MSNT-03 | Phase 2 | Pending |
| MSNT-04 | Phase 2 | Pending |
| MSNT-05 | Phase 2 | Pending |
| MSNT-06 | Phase 2 | Pending |
| AUD-01 | Phase 3 | Pending |
| AUD-02 | Phase 3 | Pending |
| AUD-03 | Phase 3 | Pending |
| AUD-04 | Phase 3 | Pending |
| AUD-05 | Phase 3 | Pending |
| HUD-01 | Phase 3 | Pending |
| HUD-02 | Phase 3 | Pending |
| HUD-03 | Phase 3 | Pending |
| HUD-04 | Phase 3 | Pending |
| HUD-05 | Phase 3 | Pending |
| HUD-06 | Phase 3 | Pending |
| VFX-01 | Phase 4 | Pending |
| VFX-02 | Phase 4 | Pending |
| VFX-03 | Phase 4 | Pending |
| VFX-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after roadmap creation*
