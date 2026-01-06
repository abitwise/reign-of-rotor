import { beforeAll, describe, expect, it } from 'vitest';
import { createPlayerInputState } from '../../core/input/playerInput';
import type { FixedStepContext } from '../../core/loop/types';
import { DEFAULT_HELICOPTER_FLIGHT } from '../../content/helicopters';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { createHelicopterFlightSystem, spawnPlayerHelicopter } from '../helicopterFlight';

describe('helicopter flight system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  const stepContext: FixedStepContext = {
    fixedDeltaMs: 16,
    fixedDeltaSeconds: 1 / 60,
    stepIndex: 0,
    elapsedMs: 0
  };

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('applies upward force based on collective input', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    input.collective = 1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input);
    const system = createHelicopterFlightSystem(heli);

    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    expect(heli.body.linvel().y).toBeGreaterThan(0);
  });

  it('applies yaw torque from input', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    input.yaw = 1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input);
    const system = createHelicopterFlightSystem(heli);

    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    expect(heli.body.angvel().y).toBeGreaterThan(0);
  });
});
