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

export type ControlAxisTuning = {
  expo: number;
  smoothingTau: number;
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
  if (tau <= 0) {
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
  updateAxis(state.collective, clamp01(input.collective), tuning.collective, dtSeconds, 0, 1);
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
