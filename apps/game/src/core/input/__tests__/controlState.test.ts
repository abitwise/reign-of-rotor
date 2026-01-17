import { describe, expect, it } from 'vitest';
import { createControlState, updateControlState, type ControlTuning } from '../controlState';
import { createPlayerInputState } from '../playerInput';

const makeTuning = (overrides: Partial<ControlTuning> = {}): ControlTuning => ({
  collective: { expo: 1, smoothingTau: 0, slewRate: 0 },
  cyclicX: { expo: 1, smoothingTau: 0, slewRate: 0 },
  cyclicY: { expo: 1, smoothingTau: 0, slewRate: 0 },
  yaw: { expo: 1, smoothingTau: 0, slewRate: 0 },
  ...overrides
});

describe('control state processing', () => {
  it('applies expo curve to signed axes', () => {
    const tuning = makeTuning({
      cyclicX: { expo: 2, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.cyclicX = 0.5;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicX.filtered).toBeCloseTo(0.25, 4);

    input.cyclicX = -0.5;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicX.filtered).toBeCloseTo(-0.25, 4);
  });

  it('smooths toward the target based on time constant', () => {
    const tuning = makeTuning({
      yaw: { expo: 1, smoothingTau: 0.5, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();
    input.yaw = 1;

    updateControlState(state, input, tuning, 0.1);

    expect(state.yaw.filtered).toBeGreaterThan(0);
    expect(state.yaw.filtered).toBeLessThan(1);
  });

  it('limits slew rate when target changes abruptly', () => {
    const tuning = makeTuning({
      cyclicY: { expo: 1, smoothingTau: 0, slewRate: 1 }
    });
    const state = createControlState();
    const input = createPlayerInputState();
    input.cyclicY = 1;

    updateControlState(state, input, tuning, 0.1);

    expect(state.cyclicY.filtered).toBeCloseTo(0.1, 4);
  });
});
