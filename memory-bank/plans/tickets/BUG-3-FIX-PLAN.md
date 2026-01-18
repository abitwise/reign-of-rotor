# BUG-3 Fix Plan — Helicopter Stabilization After Input Release (Arcade Hover)

## Requirements (from ticket)
- Releasing W/A/S/D should return pitch/roll toward a stable hover without sustained drift/tumble.
- Releasing Q/E should damp toward a stable heading without overshoot.
- Stabilization should be noticeably stronger with assists ON than OFF.
- Keep fixed-timestep behavior and sim/render separation.
- Prefer data-driven tuning in content for return-to-neutral rates.
- Add/extend unit tests for input processing or assist response on key release.

## Diagnosis / Current behavior
- Control inputs are smoothed and slew-limited; cyclic/yaw release uses the same slew rate as engagement, so filtered inputs can linger and delay assist activation.
- Stability assist only damps angular velocity; it does not apply an orientation-leveling torque, so a tilted helicopter can remain tilted with no angular velocity, causing drift.
- Assist activation uses filtered values, which stay nonzero after release, further delaying stabilization.

## Plan
1. **Input return-to-neutral tuning (data-driven)**
   - Extend `ControlAxisTuning` with an optional `releaseSlewMultiplier`.
   - Update control processing to apply release slew when magnitude is decreasing (works for both positive/negative inputs).
   - Add preset values for cyclic and yaw in `content/controls.ts` to speed neutral return.
   - Update control-state unit tests to cover release slew on signed axes.

2. **Stability assist leveling toward hover**
   - Add stability assist tuning to helicopter flight config (content-driven).
   - Implement leveling torque based on tilt (world-up vs body-up) when stability assist is enabled, no manual input, and trim is not active.
   - Scale leveling torque by rotor RPM/authority to respect power limits.

3. **Tests**
   - Add control-state test validating release slew multiplier for negative-to-neutral on a signed axis.
   - Add/extend stability assist test to confirm corrective torque is applied when tilted and inputs are neutral.

4. **Verification**
   - Run `pnpm test`.

## Notes
- Avoid render/UI changes; keep logic in `sim/**` and `core/input/**`.
- Keep trim behavior respected by skipping leveling when trim offsets are active.
