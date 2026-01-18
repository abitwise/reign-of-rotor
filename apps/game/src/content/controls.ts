import type { ControlTuning } from '../core/input/controlState';

export type ControlPresetId = 'normal' | 'hardcore';

/**
 * Control tuning presets that define the feel of helicopter controls.
 *
 * - **normal**: More forgiving controls with higher smoothing/expo for casual play.
 *   Provides gentler response curves and more stability at the cost of some responsiveness.
 *
 * - **hardcore**: Snappier, more responsive controls with lower smoothing for experienced players.
 *   Offers more direct control and faster reactions but requires more skill to fly smoothly.
 */
export const CONTROL_TUNING_PRESETS: Record<ControlPresetId, ControlTuning> = {
  normal: {
    collective: { expo: 1.2, smoothingTau: 0.18, slewRate: 1.6, releaseSlewMultiplier: 3 },
    cyclicX: { expo: 1.6, smoothingTau: 0.12, slewRate: 4.5, releaseSlewMultiplier: 2.4 },
    cyclicY: { expo: 1.6, smoothingTau: 0.12, slewRate: 4.5, releaseSlewMultiplier: 2.4 },
    // Note: For the "normal" preset we intentionally use a slightly higher yaw input
    // smoothingTau (0.22 vs 0.16 in "hardcore"). This extra filtering happens in the
    // input stage to soften small stick/pedal jitters and reduce abrupt step inputs,
    // making yaw turns easier to control for casual players. The yaw-rate controller
    // still provides dynamic damping; this smoothing only shapes the commanded input
    // signal and is not a substitute for the rate controller's damping behavior.
    yaw: { expo: 1.8, smoothingTau: 0.22, slewRate: 3.5, releaseSlewMultiplier: 2.6 },
    yawRate: { maxRateRad: 1.4, damping: 0.65 }
  },
  hardcore: {
    collective: { expo: 1.35, smoothingTau: 0.1, slewRate: 2.2, releaseSlewMultiplier: 3 },
    cyclicX: { expo: 1.25, smoothingTau: 0.08, slewRate: 6, releaseSlewMultiplier: 2.1 },
    cyclicY: { expo: 1.25, smoothingTau: 0.08, slewRate: 6, releaseSlewMultiplier: 2.1 },
    yaw: { expo: 1.4, smoothingTau: 0.16, slewRate: 4.8, releaseSlewMultiplier: 2.3 },
    yawRate: { maxRateRad: 1.8, damping: 0.75 }
  }
};
