import { describe, expect, it } from 'vitest';
import type { YawRateControllerTuning } from '../../core/input/controlState';
import { computeYawRateCommand } from '../helicopterFlight';

describe('yaw rate controller', () => {
  const tuning: YawRateControllerTuning = {
    maxRateRad: 2,
    damping: 0.8
  };

  it('clamps the command within [-1, 1]', () => {
    const command = computeYawRateCommand(1, -10, tuning);
    expect(command).toBe(1);
  });

  it('returns near-zero command when current rate matches target', () => {
    const command = computeYawRateCommand(0.5, 1, tuning);
    expect(command).toBeCloseTo(0, 4);
  });
});
