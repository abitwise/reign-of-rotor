# P1-9 — Assist Toggles: Stability + Hover Assist

**Status:** Done  
**Last Updated:** 2026-01-06  
**Ticket ID:** P1-9  
**Phase:** Phase 1 (MVP Demo)  

---

## Summary
Add optional flight assists to make helicopter handling more accessible on keyboard+mouse while preserving the option for experienced players to disable them for manual control.

---

## Functional Requirements

### GIVEN/WHEN/THEN Scenarios

1. **Stability Assist**
   - GIVEN stability assist is enabled (default ON)
   - WHEN the player releases cyclic/yaw inputs
   - THEN the helicopter automatically dampens angular velocity and applies counter-torque to level out

2. **Hover Assist**
   - GIVEN hover assist is enabled (default OFF)
   - WHEN the player reduces collective to hover range
   - THEN lateral velocity is damped to reduce drift
   - AND (optional for MVP) altitude hold may stabilize vertical position

3. **Toggle Controls**
   - GIVEN the player presses the stability toggle key (Z)
   - WHEN in-flight
   - THEN stability assist state toggles ON/OFF

   - GIVEN the player presses the hover assist toggle key (X)
   - WHEN in-flight
   - THEN hover assist state toggles ON/OFF

4. **HUD Indicators**
   - GIVEN assists are enabled/disabled
   - WHEN viewing the HUD
   - THEN clear visual indicators show which assists are currently active

---

## Technical Implementation

### Changes to Helicopter Flight System
1. **Stability Assist Logic**
   - Read `CHelicopterAssists.stability` flag
   - When enabled and no player input for pitch/roll/yaw:
     - Apply angular damping factor (multiply angular velocity by damping < 1.0)
     - Apply counter-torque proportional to angular velocity to level out
   - Tuning values:
     - Stability damping factor: 0.92–0.96 per tick
     - Counter-torque scale: 0.3–0.5 × max torque

2. **Hover Assist Logic**
   - Read `CHelicopterAssists.hover` flag
   - When enabled and collective is in hover range (e.g., 0.3–0.7):
     - Apply lateral velocity damping (reduce X/Z linear velocity)
     - (Optional for MVP) Apply light vertical velocity correction toward zero when near hover collective
   - Tuning values:
     - Lateral damping factor: 0.85–0.90 per tick
     - Hover collective range: 0.3–0.7 normalized
     - (Optional) Vertical correction: subtle nudge proportional to difference from hover altitude

3. **Default States**
   - Stability assist: **ON** by default (easier for KB+mouse)
   - Hover assist: **OFF** by default (player opt-in for more arcade feel)

### Changes to Input System
1. Add toggle keys to `PlayerInputState`:
   ```typescript
   toggleStability?: boolean;   // One-frame pulse on 'Z' press
   toggleHover?: boolean;        // One-frame pulse on 'X' press
   ```

2. Update `KeyboardInputSampler` or add a separate toggle handler:
   - Detect key down edge (not held) for 'Z' and 'X'
   - Set pulse flags in input state for one frame
   - Reset flags after processing

3. In flight system, detect pulses and toggle `CHelicopterAssists` flags accordingly

### Changes to UI (HUD)
1. Add assist status section to flight HUD:
   ```
   Assists:
   [●] Stability    (ON)
   [ ] Hover       (OFF)
   ```

2. Update indicators in real-time when assist states change

3. Show toggle key hints in instructions panel:
   ```
   Z — Toggle Stability Assist
   X — Toggle Hover Assist
   ```

---

## Testing Requirements

### Unit Tests
1. **Stability Assist**
   - Test that angular velocity decays faster when stability assist is ON
   - Test that no assist is applied when player is actively inputting cyclic/yaw
   - Test toggle behavior (ON → OFF → ON)

2. **Hover Assist**
   - Test that lateral velocity decays when hover assist is ON and collective in range
   - Test that assist does not apply outside hover collective range
   - Test toggle behavior (OFF → ON → OFF)

3. **Input Toggle Logic**
   - Test that 'Z' key toggles stability state
   - Test that 'X' key toggles hover state
   - Test that holding key does not spam toggles (edge detection)

### Manual Testing
1. Spawn helicopter, toggle assists on/off via HUD
2. Verify HUD indicators update correctly
3. Verify flight feel changes noticeably with assists enabled/disabled
4. Verify instructions panel shows new keybinds

---

## Risks & Considerations

- **Tuning Balance:** Assist strength must feel helpful but not "auto-pilot"
- **Input Conflict:** Ensure toggle keys (Z/X) don't conflict with future weapon/system bindings
- **Performance:** Assist logic runs every fixed tick; keep computations lightweight
- **User Feedback:** HUD must clearly show assist state to avoid confusion

---

## Definition of Done

- [x] Stability assist system implemented with angular damping and counter-torque
- [x] Hover assist system implemented with lateral velocity damping
- [x] Toggle keys (Z/X) wired to input system
- [x] HUD indicators show assist states
- [x] Instructions panel updated with toggle key hints
- [x] Unit tests added for assist logic
- [x] Manual testing confirms flight feel and HUD updates
- [x] TICKETS.md status updated to "Done"
- [x] This plan file updated with completion notes

---

## Notes / Deviations

### Implementation Complete
All requirements implemented successfully:

1. **Stability Assist**
   - Default: ON
   - Applies angular damping (0.94 per tick) and counter-torque (0.4x max torque)
   - Only activates when no active rotation input detected
   - Smoothly levels helicopter when player releases controls

2. **Hover Assist**
   - Default: OFF (player opt-in)
   - Activates when collective in range 0.3-0.7
   - Applies lateral velocity damping (0.88 per tick)
   - Helps reduce drift during hover maneuvers

3. **Toggle Controls**
   - Z key toggles stability assist ON/OFF
   - X key toggles hover assist ON/OFF
   - Edge-triggered input prevents spam
   - HUD updates in real-time

4. **UI/HUD**
   - New assists HUD panel at bottom-left
   - Visual indicators: ● (ON) / ○ (OFF)
   - Color coding: green for ON, gray for OFF
   - Toggle key hints in instructions panel

5. **Testing**
   - 10 unit tests added covering:
     - Stability assist damping behavior
     - Hover assist lateral damping
     - Toggle functionality
     - Proper activation conditions
   - All tests pass successfully

### Tuning Values Used
- Stability damping factor: 0.94 (6% reduction per tick)
- Stability counter-torque scale: 0.4 (40% of max torque)
- Hover lateral damping: 0.88 (12% reduction per tick)
- Hover collective range: 0.3–0.7 (normalized)

### No Deviations
Implementation matches plan exactly. No architectural changes or unexpected issues encountered.

