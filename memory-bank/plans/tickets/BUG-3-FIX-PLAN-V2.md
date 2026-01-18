# BUG-3 Fix Plan V2 — Helicopter Stabilization After Input Release (Alternative Approach)

## Problem Summary
The original BUG-3 fix addressed release slew and added leveling torque, but helicopter control still feels unstable after key release. The helicopter fights itself when transitioning from active control to stability assist.

## Root Cause Analysis

### Primary Issue: Control Torques Fight Stability Assist
When a player releases W/A/S/D or Q/E:

1. `control.cyclicX.raw` immediately becomes 0 (keyboard is released)
2. Stability assist sees `hasRotationInput = false` and starts applying leveling torque
3. **BUT** `control.cyclicX.filtered` is still non-zero and decaying slowly
4. `applyControlTorques()` continues to apply torques based on `filtered` values
5. **The control torques and stability assist fight each other**, causing instability

### Secondary Issue: Exponential Damping Factor Too Weak
The `stabilityAngularDamping = 0.92` means only 8% of angular velocity is removed per sim step. At 60Hz, this is quite slow and doesn't feel "snappy" for arcade-style controls.

### Tertiary Issue: Leveling Torque Fights Control Torques
The leveling torque applies correction when `hasRotationInput` is false, but control torques (from filtered values) continue to push the helicopter in the original direction, creating oscillation.

## Solution: Unified Release Detection

The fix is to use the same signal for BOTH control torques AND stability assist, so there's no fighting:

### Option A: Skip Control Torques When Raw Input Is Zero (Recommended)
When `raw` input is zero, don't apply control torques at all. The filtered values are only for smoothing the response WHILE actively controlling, not for continuing input after release.

**Implementation:**
```typescript
const applyControlTorques = (heli: PlayerHelicopter): void => {
  // Skip applying control torques when player has released all rotation inputs
  const hasRotationInput =
    Math.abs(heli.control.cyclicX.raw) > 0.01 ||
    Math.abs(heli.control.cyclicY.raw) > 0.01 ||
    Math.abs(heli.control.yaw.raw) > 0.01;
  
  if (!hasRotationInput) {
    return; // Let stability assist handle leveling without interference
  }
  
  // ... rest of existing control torque logic using filtered values
};
```

**Pros:**
- Clean separation: filtered values smooth input during control, stability handles release
- No fighting between systems
- Simple change with clear intent

**Cons:**
- Abrupt torque cutoff when key released (may feel slightly jerky)

### Option B: Blend Control Authority Based on Input State
Scale down control torque authority as `raw` approaches zero, so there's a smooth handoff.

**Implementation:**
```typescript
const applyControlTorques = (heli: PlayerHelicopter): void => {
  const rawInputMagnitude = Math.max(
    Math.abs(heli.control.cyclicX.raw),
    Math.abs(heli.control.cyclicY.raw),
    Math.abs(heli.control.yaw.raw)
  );
  
  // Fade out control torques as raw input goes to zero
  const inputBlend = Math.min(rawInputMagnitude * 2, 1); // 0..1 based on input
  
  // Apply torques scaled by inputBlend
  const pitchTorque = -heli.control.cyclicY.filtered * heli.flight.maxPitchTorque * torqueScale * inputBlend;
  // etc.
};
```

**Pros:**
- Smoother transition from control to stabilization

**Cons:**
- More complex
- May still have residual fighting during blend transition

### Option C: Make Filtered Values Decay Faster on Release (Current Approach - Not Working Well Enough)
This was the original fix approach with `releaseSlewMultiplier`. The problem is it still doesn't eliminate the fighting, just shortens the duration.

## Recommended Fix: Option A + Tuning Improvements

### Changes Required:

1. **`applyControlTorques()` in `helicopterFlight.ts`:**
   - Add early return when `raw` rotation inputs are all zero
   - This eliminates the fighting between control torques and stability assist

2. **Tune stability assist parameters in `helicopters.ts`:**
   - Increase `stabilityAngularDamping` from 0.92 to ~0.85 for faster angular velocity decay
   - Increase `stabilityLevelingTorqueScale` from 0.55 to ~0.7 for stronger return-to-level

3. **Add/update tests:**
   - Test that control torques are NOT applied when raw input is zero
   - Test that stability assist properly levels when control inputs are released

## Implementation Tasks

- [x] Modify `applyControlTorques()` to skip torque application when raw rotation inputs are zero
- [x] Update `DEFAULT_HELICOPTER_FLIGHT` tuning values for stronger stabilization
- [x] Add unit tests for the new behavior
- [x] Verify fix with manual testing (fly, release controls, observe stabilization)

## Notes
- This approach aligns with the principle that `filtered` values are for smoothing during active control, not for continuing effects after release
- The stability assist uses `raw` for detection, so control torques should respect the same signal
- Trim behavior remains unchanged (trim offsets are applied during filtering, not in control torques directly)
