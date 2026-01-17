import { beforeAll, describe, expect, it } from 'vitest';
import { createPlayerInputState } from '../../core/input/playerInput';
import { createControlState } from '../../core/input/controlState';
import type { FixedStepContext } from '../../core/loop/types';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { spawnPlayerHelicopter } from '../helicopterFlight';
import { createAltimeterSystem, LandingState } from '../altimeter';
import { DEFAULT_HELICOPTER_FLIGHT } from '../../content/helicopters';
import { createTerrainColliderManager } from '../terrain/terrainColliders';

const stepContext: FixedStepContext = {
  fixedDeltaMs: 16,
  fixedDeltaSeconds: 1 / 60,
  stepIndex: 0,
  elapsedMs: 0
};

describe('altimeter system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;
  const yawRateTuning = { maxRateRad: 1.6, damping: 0.8 };

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('reports altitude based on a downward raycast', () => {
    const physics = createPhysicsWorld(rapier);
    const terrain = createTerrainColliderManager(physics);
    terrain.update({ x: 0, z: 0 });

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, createPlayerInputState(), createControlState(), {
      yawRateTuning
    });

    physics.step(stepContext.fixedDeltaSeconds);
    heli.body.setTranslation({ x: 0, y: 10, z: 0 }, true);
    physics.world.propagateModifiedBodyPositionsToColliders();

    const system = createAltimeterSystem(heli, physics);
    system.step(stepContext);

    expect(heli.altimeter.altitude).toBeGreaterThan(9.5);
    expect(heli.altimeter.altitude).toBeLessThan(10.5);
  });

  it('marks the helicopter as landed on gentle contact', () => {
    const physics = createPhysicsWorld(rapier);
    const terrain = createTerrainColliderManager(physics);
    terrain.update({ x: 0, z: 0 });

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, createPlayerInputState(), createControlState(), {
      yawRateTuning
    });

    physics.step(stepContext.fixedDeltaSeconds);
    heli.body.setTranslation({ x: 0, y: 0.35, z: 0 }, true);
    heli.body.setLinvel({ x: 0, y: -0.25, z: 0 }, true);
    physics.world.propagateModifiedBodyPositionsToColliders();

    const system = createAltimeterSystem(heli, physics);
    system.step(stepContext);

    expect(heli.altimeter.isGrounded).toBe(true);
    expect(heli.altimeter.landingState).toBe(LandingState.Landed);
    expect(heli.altimeter.impactSeverity).toBeGreaterThan(0);
  });

  it('flags a hard landing when the impact speed is high', () => {
    const physics = createPhysicsWorld(rapier);
    const terrain = createTerrainColliderManager(physics);
    terrain.update({ x: 0, z: 0 });

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, createPlayerInputState(), createControlState(), {
      yawRateTuning
    });

    physics.step(stepContext.fixedDeltaSeconds);
    heli.body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    heli.body.setLinvel({ x: 0, y: -6, z: 0 }, true);
    physics.world.propagateModifiedBodyPositionsToColliders();

    const system = createAltimeterSystem(heli, physics);
    system.step(stepContext);

    expect(heli.altimeter.landingState).toBe(LandingState.HardLanding);
    expect(heli.altimeter.impactSeverity).toBeGreaterThanOrEqual(6);
  });
});
