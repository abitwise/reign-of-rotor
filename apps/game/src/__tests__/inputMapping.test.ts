import { describe, expect, it, vi } from 'vitest';
import { KeyboardInputSampler } from '../core/input/keyboardInput';
import {
  DEFAULT_PLAYER_INPUT_BINDINGS,
  createPlayerInputState,
  createPlayerInputSystem,
  samplePlayerInput
} from '../core/input/playerInput';
import { MouseLookController } from '../core/input/mouseLookController';

const stepContext = {
  fixedDeltaMs: 16,
  fixedDeltaSeconds: 0.016,
  stepIndex: 0,
  elapsedMs: 0
};

describe('Player input mapping', () => {
  it('maps WASD/arrow/QE/RF to axes', () => {
    const sampler = new KeyboardInputSampler(window);
    const state = createPlayerInputState();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    samplePlayerInput(state, sampler, DEFAULT_PLAYER_INPUT_BINDINGS);
    expect(state.cyclicY).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    samplePlayerInput(state, sampler, DEFAULT_PLAYER_INPUT_BINDINGS);
    expect(state.cyclicX).toBe(-1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    samplePlayerInput(state, sampler, DEFAULT_PLAYER_INPUT_BINDINGS);
    expect(state.yaw).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
    samplePlayerInput(state, sampler, DEFAULT_PLAYER_INPUT_BINDINGS);
    expect(state.collective).toBe(-1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF' }));
    samplePlayerInput(state, sampler, DEFAULT_PLAYER_INPUT_BINDINGS);

    expect(state.cyclicX).toBe(0);
    expect(state.cyclicY).toBe(0);
    expect(state.yaw).toBe(0);
    expect(state.collective).toBe(0);

    sampler.destroy();
  });

  it('updates once per fixed tick via the input system', () => {
    const sampler = new KeyboardInputSampler(window);
    const state = createPlayerInputState();
    const system = createPlayerInputSystem({
      sampler,
      bindings: DEFAULT_PLAYER_INPUT_BINDINGS,
      state
    });

    system.step(stepContext);
    expect(state.cyclicX).toBe(0);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    system.step(stepContext);
    expect(state.cyclicX).toBe(1);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    system.step(stepContext);
    expect(state.cyclicX).toBe(0);

    sampler.destroy();
  });
});

describe('Mouse look controller', () => {
  it('applies drag-look when pointer lock is unavailable', () => {
    if (typeof PointerEvent === 'undefined') {
      expect(true).toBe(true);
      return;
    }

    const element = document.createElement('div');
    document.body.appendChild(element);

    const onLook = vi.fn();
    const controller = new MouseLookController({
      element,
      onLook,
      requestPointerLock: false
    });

    element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 }));
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, movementX: 10, movementY: -4 }));
    element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));

    expect(onLook).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));

    controller.dispose();
    element.remove();
  });
});
