import type { ControlTuning } from '../core/input/controlState';

export type ControlPresetId = 'normal' | 'hardcore';

export const CONTROL_TUNING_PRESETS: Record<ControlPresetId, ControlTuning> = {
  normal: {
    collective: { expo: 1.2, smoothingTau: 0.18, slewRate: 1.6 },
    cyclicX: { expo: 1.6, smoothingTau: 0.12, slewRate: 4.5 },
    cyclicY: { expo: 1.6, smoothingTau: 0.12, slewRate: 4.5 },
    yaw: { expo: 1.8, smoothingTau: 0.16, slewRate: 3.5 }
  },
  hardcore: {
    collective: { expo: 1.35, smoothingTau: 0.1, slewRate: 2.2 },
    cyclicX: { expo: 1.25, smoothingTau: 0.08, slewRate: 6 },
    cyclicY: { expo: 1.25, smoothingTau: 0.08, slewRate: 6 },
    yaw: { expo: 1.4, smoothingTau: 0.12, slewRate: 4.8 }
  }
};
