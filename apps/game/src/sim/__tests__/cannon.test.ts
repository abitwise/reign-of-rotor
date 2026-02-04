import { beforeAll, describe, expect, it } from 'vitest';
import type { FixedStepContext } from '../../core/loop/types';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { createPlayerInputState } from '../../core/input/playerInput';
import { createControlState } from '../../core/input/controlState';
import { spawnPlayerHelicopter } from '../helicopterFlight';
import { createCannonState, createCannonSystem } from '../cannon';
import { createEntityId } from '../../ecs/entity';
import { createColliderForEntity, createRigidBodyForEntity } from '../../physics/factories';
import { DEFAULT_HELICOPTER_FLIGHT } from '../../content/helicopters';

const stepContext: FixedStepContext = {
  fixedDeltaMs: 16,
  fixedDeltaSeconds: 1 / 60,
  stepIndex: 0,
  elapsedMs: 0
};

describe('cannon system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('fires a raycast shot and records hit + damage events', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    input.fireCannon = true;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, createControlState(), {
      yawRateTuning: { maxRateRad: 1.4, damping: 0.65 }
    });
    heli.body.setTranslation({ x: 0, y: 1, z: 0 }, true);

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 1, 10)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(1)
    });

    physics.world.propagateModifiedBodyPositionsToColliders();

    const config = {
      name: 'Test Cannon',
      ammo: 3,
      cooldownSeconds: 0.5,
      range: 50,
      damage: 12,
      muzzleOffset: { x: 0, y: 0, z: 2 },
      impactFx: 'test-impact'
    };

    const cannonState = createCannonState(config);
    const system = createCannonSystem({
      heli,
      physics,
      config,
      state: cannonState,
      gameState: { isPaused: false }
    });

    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);

    expect(cannonState.ammoRemaining).toBe(2);
    expect(cannonState.cooldownRemaining).toBeGreaterThan(0);
    expect(cannonState.impactEvents).toHaveLength(1);
    expect(cannonState.damageEvents).toHaveLength(1);
    expect(cannonState.impactEvents[0].targetEntity).toBe(targetEntity);
    expect(cannonState.damageEvents[0].amount).toBe(12);
  });

  it('respects cooldown before allowing the next shot', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    input.fireCannon = true;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, createControlState(), {
      yawRateTuning: { maxRateRad: 1.4, damping: 0.65 }
    });

    const config = {
      name: 'Cooldown Cannon',
      ammo: 2,
      cooldownSeconds: 0.4,
      range: 20,
      damage: 6,
      muzzleOffset: { x: 0, y: 0, z: 1.5 },
      impactFx: 'test-impact'
    };

    const cannonState = createCannonState(config);
    const system = createCannonSystem({
      heli,
      physics,
      config,
      state: cannonState,
      gameState: { isPaused: false }
    });

    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);
    const ammoAfterFirstShot = cannonState.ammoRemaining;

    system.step(stepContext);

    expect(cannonState.ammoRemaining).toBe(ammoAfterFirstShot);
    expect(cannonState.impactEvents).toHaveLength(0);
  });
});
