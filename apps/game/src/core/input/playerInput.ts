import { SystemPhase, type LoopSystem } from '../loop/types';
import type { SystemScheduler } from '../loop/systemScheduler';
import { KeyboardInputSampler, type KeyboardEventTarget } from './keyboardInput';

export type InputAxisBinding = {
  positive: string[];
  negative: string[];
  deadzone?: number;
  scale?: number;
};

export type PlayerInputBindings = {
  collective: InputAxisBinding;
  cyclicX: InputAxisBinding;
  cyclicY: InputAxisBinding;
  yaw: InputAxisBinding;
};

export type PlayerInputState = {
  collective: number;
  cyclicX: number;
  cyclicY: number;
  yaw: number;
  toggleStability: boolean; // One-frame pulse
  toggleHover: boolean;      // One-frame pulse
  togglePause: boolean;      // One-frame pulse
};

// Alias used by ECS-facing layers.
export type CPlayerInput = PlayerInputState;

export const DEFAULT_PLAYER_INPUT_BINDINGS: PlayerInputBindings = {
  collective: {
    positive: ['KeyR', 'PageUp'],
    negative: ['KeyF', 'PageDown']
  },
  cyclicX: {
    positive: ['KeyD', 'ArrowRight'],
    negative: ['KeyA', 'ArrowLeft']
  },
  cyclicY: {
    positive: ['KeyW', 'ArrowUp'],
    negative: ['KeyS', 'ArrowDown']
  },
  yaw: {
    positive: ['KeyE'],
    negative: ['KeyQ']
  }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const resolveAxis = (binding: InputAxisBinding, sampler: KeyboardInputSampler): number => {
  const scale = binding.scale ?? 1;
  const deadzone = binding.deadzone ?? 0;

  const positivePressed = binding.positive.some((code) => sampler.isPressed(code));
  const negativePressed = binding.negative.some((code) => sampler.isPressed(code));

  let value = 0;
  if (positivePressed && !negativePressed) {
    value = 1;
  } else if (negativePressed && !positivePressed) {
    value = -1;
  }

  const scaled = value * scale;
  if (Math.abs(scaled) < deadzone) {
    return 0;
  }

  return clamp(scaled, -1, 1);
};

export const createPlayerInputState = (): PlayerInputState => ({
  collective: 0,
  cyclicX: 0,
  cyclicY: 0,
  yaw: 0,
  toggleStability: false,
  toggleHover: false,
  togglePause: false
});

export const samplePlayerInput = (
  state: PlayerInputState,
  sampler: KeyboardInputSampler,
  bindings: PlayerInputBindings = DEFAULT_PLAYER_INPUT_BINDINGS
): PlayerInputState => {
  state.collective = resolveAxis(bindings.collective, sampler);
  state.cyclicX = resolveAxis(bindings.cyclicX, sampler);
  state.cyclicY = resolveAxis(bindings.cyclicY, sampler);
  state.yaw = resolveAxis(bindings.yaw, sampler);

  // Toggle keys (edge-triggered)
  state.toggleStability = sampler.wasJustPressed('KeyZ');
  state.toggleHover = sampler.wasJustPressed('KeyX');
  state.togglePause = sampler.wasJustPressed('Space');

  return state;
};

export type PlayerInputSystemOptions = {
  sampler: KeyboardInputSampler;
  bindings?: PlayerInputBindings;
  state: PlayerInputState;
};

export const createPlayerInputSystem = ({
  sampler,
  bindings = DEFAULT_PLAYER_INPUT_BINDINGS,
  state
}: PlayerInputSystemOptions): LoopSystem => ({
  id: 'input.keyboardMouse',
  phase: SystemPhase.Input,
  step: () => {
    samplePlayerInput(state, sampler, bindings);
    sampler.clearJustPressed(); // Clear edge-triggered flags after sampling
  }
});

export type PlayerInputContext = {
  bindings: PlayerInputBindings;
  state: PlayerInputState;
  sampler: KeyboardInputSampler;
  destroy: () => void;
};

export const bootstrapPlayerInput = (
  scheduler: SystemScheduler,
  target: KeyboardEventTarget | null = typeof window === 'undefined' ? null : window,
  bindings: PlayerInputBindings = DEFAULT_PLAYER_INPUT_BINDINGS
): PlayerInputContext => {
  const sampler = new KeyboardInputSampler(target);
  const state = createPlayerInputState();

  scheduler.addSystem(
    createPlayerInputSystem({
      sampler,
      bindings,
      state
    })
  );

  return {
    bindings,
    state,
    sampler,
    destroy: () => sampler.destroy()
  };
};
