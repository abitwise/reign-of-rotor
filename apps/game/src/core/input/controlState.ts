import { SystemPhase, type LoopSystem } from '../loop/types';
import type { PlayerInputState } from './playerInput';

export type ControlAxisState = {
  raw: number;
  filtered: number;
};

export type ControlTrimState = {
  cyclicX: number;
  cyclicY: number;
  yaw: number;
};

export type ControlState = {
  collective: ControlAxisState;
  cyclicX: ControlAxisState;
  cyclicY: ControlAxisState;
  yaw: ControlAxisState;
  trim: ControlTrimState;
};

/**
 * Tuning parameters for a single control axis.
 *
 * These settings control how raw input is transformed into filtered control values.
 */
export type ControlAxisTuning = {
  /**
   * Exponent for the exponential input curve (gamma).
   * Values > 1 reduce sensitivity near the center; 1 means a linear response.
   */
  expo: number;
  /**
   * Time constant for exponential smoothing, in seconds.
   * Larger values increase smoothing (and lag); 0 disables smoothing.
   */
  smoothingTau: number;
  /**
   * Maximum allowed rate of change of the filtered value, in units per second.
   * Higher values allow faster transitions; 0 disables rate limiting.
   */
  slewRate: number;
};

export type ControlTuning = {
  collective: ControlAxisTuning;
  cyclicX: ControlAxisTuning;
  cyclicY: ControlAxisTuning;
  yaw: ControlAxisTuning;
};

export const createControlState = (): ControlState => ({
  collective: { raw: 0, filtered: 0 },
  cyclicX: { raw: 0, filtered: 0 },
  cyclicY: { raw: 0, filtered: 0 },
  yaw: { raw: 0, filtered: 0 },
  trim: { cyclicX: 0, cyclicY: 0, yaw: 0 }
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const clamp01 = (value: number): number => clamp(value, 0, 1);

const applyExpoSigned = (value: number, gamma: number): number => {
  if (gamma <= 1) {
    return value;
  }
  return Math.sign(value) * Math.pow(Math.abs(value), gamma);
};

const applyExpoUnsigned = (value: number, gamma: number): number => {
  if (gamma <= 1) {
    return value;
  }
  return Math.pow(value, gamma);
};

const applySmoothing = (current: number, target: number, dt: number, tau: number): number => {
  // Use a minimum threshold to avoid unnecessary exp calculations for effectively-disabled smoothing
  if (tau < 0.001) {
    return target;
  }
  const alpha = 1 - Math.exp(-dt / tau);
  return current + alpha * (target - current);
};

const applySlew = (current: number, target: number, dt: number, rate: number): number => {
  if (rate <= 0) {
    return target;
  }
  const maxDelta = rate * dt;
  const delta = clamp(target - current, -maxDelta, maxDelta);
  return current + delta;
};

const updateAxis = (
  axis: ControlAxisState,
  rawInput: number,
  tuning: ControlAxisTuning,
  dt: number,
  min: number,
  max: number,
  trim = 0
): void => {
  const raw = clamp(rawInput, min, max);
  axis.raw = raw;

  const expoValue = min < 0 ? applyExpoSigned(raw, tuning.expo) : applyExpoUnsigned(raw, tuning.expo);
  const trimmed = clamp(expoValue + trim, min, max);
  const smoothed = applySmoothing(axis.filtered, trimmed, dt, tuning.smoothingTau);
  axis.filtered = applySlew(axis.filtered, smoothed, dt, tuning.slewRate);
};

export const updateControlState = (
  state: ControlState,
  input: PlayerInputState,
  tuning: ControlTuning,
  dtSeconds: number
): void => {
  // Collective supports bidirectional input: [0, 1] for lift, negative for braking
  updateAxis(state.collective, input.collective, tuning.collective, dtSeconds, -1, 1);
  updateAxis(state.cyclicX, input.cyclicX, tuning.cyclicX, dtSeconds, -1, 1, state.trim.cyclicX);
  updateAxis(state.cyclicY, input.cyclicY, tuning.cyclicY, dtSeconds, -1, 1, state.trim.cyclicY);
  updateAxis(state.yaw, input.yaw, tuning.yaw, dtSeconds, -1, 1, state.trim.yaw);
};

export type ControlStateSystemOptions = {
  input: PlayerInputState;
  state: ControlState;
  tuning: ControlTuning;
};

export const createControlStateSystem = ({ input, state, tuning }: ControlStateSystemOptions): LoopSystem => ({
  id: 'input.controlState',
  phase: SystemPhase.Input,
  step: (context) => {
    updateControlState(state, input, tuning, context.fixedDeltaSeconds);
  }
});
