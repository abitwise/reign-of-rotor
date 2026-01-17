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

  it('applies unsigned expo curve to collective axis', () => {
    const tuning = makeTuning({
      collective: { expo: 2, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    // Positive values use unsigned expo
    input.collective = 0.5;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.collective.filtered).toBeCloseTo(0.25, 4);

    input.collective = 0.7;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.collective.filtered).toBeCloseTo(0.49, 4);
  });

  it('preserves negative collective values for braking', () => {
    const tuning = makeTuning({
      collective: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.collective = -1;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.collective.filtered).toBeCloseTo(-1, 4);

    input.collective = -0.5;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.collective.filtered).toBeCloseTo(-0.5, 4);
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

  it('applies trim to cyclic and yaw axes', () => {
    const tuning = makeTuning({
      cyclicX: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    state.trim.cyclicX = 0.2;
    input.cyclicX = 0.3;
    updateControlState(state, input, tuning, 1 / 60);

    expect(state.cyclicX.filtered).toBeCloseTo(0.5, 4);
  });

  it('clamps trim-adjusted values to axis range', () => {
    const tuning = makeTuning({
      yaw: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    state.trim.yaw = 0.5;
    input.yaw = 0.8;
    updateControlState(state, input, tuning, 1 / 60);

    // Should clamp to 1.0
    expect(state.yaw.filtered).toBeCloseTo(1, 4);
  });

  it('handles expo = 1 as linear response', () => {
    const tuning = makeTuning({
      cyclicX: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.cyclicX = 0.5;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicX.filtered).toBeCloseTo(0.5, 4);
  });

  it('handles smoothingTau = 0 as instant response', () => {
    const tuning = makeTuning({
      yaw: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.yaw = 1;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.yaw.filtered).toBeCloseTo(1, 4);
  });

  it('handles slewRate = 0 as no rate limiting', () => {
    const tuning = makeTuning({
      cyclicY: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.cyclicY = 1;
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicY.filtered).toBeCloseTo(1, 4);
  });

  it('combines expo, smoothing, and slew correctly', () => {
    const tuning = makeTuning({
      cyclicX: { expo: 2, smoothingTau: 0.1, slewRate: 5 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.cyclicX = 1;

    // First step: expo (1^2 = 1), then smooth/slew
    updateControlState(state, input, tuning, 1 / 60);
    const firstValue = state.cyclicX.filtered;
    expect(firstValue).toBeGreaterThan(0);
    expect(firstValue).toBeLessThan(1);

    // Second step: should continue toward target
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicX.filtered).toBeGreaterThan(firstValue);
    expect(state.cyclicX.filtered).toBeLessThanOrEqual(1);
  });

  it('clamps raw input to axis min/max bounds', () => {
    const tuning = makeTuning({
      cyclicX: { expo: 1, smoothingTau: 0, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.cyclicX = 5; // Out of bounds
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicX.raw).toBe(1);
    expect(state.cyclicX.filtered).toBe(1);

    input.cyclicX = -5; // Out of bounds
    updateControlState(state, input, tuning, 1 / 60);
    expect(state.cyclicX.raw).toBe(-1);
    expect(state.cyclicX.filtered).toBe(-1);
  });

  it('stores raw input separately from filtered output', () => {
    const tuning = makeTuning({
      yaw: { expo: 2, smoothingTau: 0.2, slewRate: 2 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.yaw = 0.5;
    updateControlState(state, input, tuning, 1 / 60);

    expect(state.yaw.raw).toBe(0.5);
    expect(state.yaw.filtered).not.toBe(0.5); // Should be different due to processing
  });

  it('handles very small smoothing tau values efficiently', () => {
    const tuning = makeTuning({
      cyclicX: { expo: 1, smoothingTau: 0.0001, slewRate: 0 }
    });
    const state = createControlState();
    const input = createPlayerInputState();

    input.cyclicX = 1;
    updateControlState(state, input, tuning, 1 / 60);
    
    // With tau < 0.001, should behave like instant response
    expect(state.cyclicX.filtered).toBeCloseTo(1, 4);
  });
});
