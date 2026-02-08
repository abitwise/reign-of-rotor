import { beforeAll, describe, expect, it } from 'vitest';
import type { FixedStepContext } from '../../core/loop/types';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { createPlayerInputState } from '../../core/input/playerInput';
import { createControlState } from '../../core/input/controlState';
import { spawnPlayerHelicopter } from '../helicopterFlight';
import { DEFAULT_HELICOPTER_FLIGHT } from '../../content/helicopters';
import { DEFAULT_DIFFICULTY_PRESET } from '../../content/difficulty';
import { createCountermeasureState, createCountermeasureSystem } from '../countermeasures';

const stepContext: FixedStepContext = {
  fixedDeltaMs: 16,
  fixedDeltaSeconds: 1 / 60,
  stepIndex: 0,
  elapsedMs: 0
};

describe('countermeasure system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('deploys countermeasures with ammo and cooldown tracking', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, createControlState());

    const config = {
      name: 'Test CM',
      ammo: 2,
      cooldownSeconds: 1,
      decoyActiveSeconds: 0.5,
      decoyRadius: 50
    };

    const state = createCountermeasureState(config);
    const system = createCountermeasureSystem({
      heli,
      config,
      state,
      gameState: { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET }
    });

    input.deployCountermeasure = true;
    system.step(stepContext);

    expect(state.ammoRemaining).toBe(1);
    expect(state.cooldownRemaining).toBeGreaterThan(0);
    expect(state.activeRemaining).toBeGreaterThan(0);
    expect(state.decoyPosition).not.toBeNull();
    expect(state.deployedThisFrame).toBe(true);

    input.deployCountermeasure = true;
    system.step(stepContext);

    expect(state.ammoRemaining).toBe(1);
  });
});
