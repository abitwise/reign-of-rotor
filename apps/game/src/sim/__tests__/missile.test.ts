import { beforeAll, describe, expect, it } from 'vitest';
import type { FixedStepContext } from '../../core/loop/types';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { createPlayerInputState } from '../../core/input/playerInput';
import { createControlState } from '../../core/input/controlState';
import { spawnPlayerHelicopter } from '../helicopterFlight';
import { createEntityId } from '../../ecs/entity';
import { createColliderForEntity, createRigidBodyForEntity } from '../../physics/factories';
import { DEFAULT_HELICOPTER_FLIGHT } from '../../content/helicopters';
import { createMissileState, createMissileSystem } from '../missile';

const stepContext: FixedStepContext = {
  fixedDeltaMs: 16,
  fixedDeltaSeconds: 1 / 60,
  stepIndex: 0,
  elapsedMs: 0
};

describe('missile system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('acquires lock after sustained aim within cone and range', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, createControlState());
    heli.body.setTranslation({ x: 0, y: 1, z: 0 }, true);

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 1, 50)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(1)
    });

    physics.world.propagateModifiedBodyPositionsToColliders();

    const config = {
      name: 'Test Missile',
      ammo: 2,
      cooldownSeconds: 0.5,
      lockTimeSeconds: 0.2,
      lockConeDegrees: 30,
      lockRange: 200,
      requireLineOfSight: false,
      speed: 100,
      turnRateDeg: 60,
      maxFlightSeconds: 5,
      proximityRadius: 4,
      damage: 50,
      explosionRadius: 8,
      launchOffset: { x: 0, y: 0, z: 2 },
      colliderRadius: 0.2,
      explosionFx: 'test-explosion'
    };

    const missileState = createMissileState(config);
    const system = createMissileSystem({
      heli,
      physics,
      config,
      state: missileState,
      gameState: { isPaused: false },
      targets: () => [targetEntity]
    });

    for (let i = 0; i < 20; i += 1) {
      physics.step(stepContext.fixedDeltaSeconds);
      system.step(stepContext);
    }

    expect(missileState.lockStatus).toBe('LOCKED');
    expect(missileState.lockProgress).toBe(1);
    expect(missileState.lockTarget).toBe(targetEntity);
    expect(missileState.hasCandidate).toBe(true);
  });

  it('blocks lock when line of sight is obstructed', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, createControlState());
    heli.body.setTranslation({ x: 0, y: 1, z: 0 }, true);

    const blockerEntity = createEntityId();
    const blockerBody = createRigidBodyForEntity(physics, {
      entity: blockerEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 1, 20)
    });
    createColliderForEntity(physics, {
      entity: blockerEntity,
      rigidBody: blockerBody,
      descriptor: rapier.ColliderDesc.ball(2)
    });

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 1, 40)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(2)
    });

    physics.world.propagateModifiedBodyPositionsToColliders();

    const config = {
      name: 'LOS Missile',
      ammo: 1,
      cooldownSeconds: 0.5,
      lockTimeSeconds: 0.1,
      lockConeDegrees: 20,
      lockRange: 200,
      requireLineOfSight: true,
      speed: 100,
      turnRateDeg: 90,
      maxFlightSeconds: 5,
      proximityRadius: 4,
      damage: 50,
      explosionRadius: 8,
      launchOffset: { x: 0, y: 0, z: 2 },
      colliderRadius: 0.2,
      explosionFx: 'test-explosion'
    };

    const missileState = createMissileState(config);
    const system = createMissileSystem({
      heli,
      physics,
      config,
      state: missileState,
      gameState: { isPaused: false },
      targets: () => [targetEntity]
    });

    for (let i = 0; i < 10; i += 1) {
      physics.step(stepContext.fixedDeltaSeconds);
      system.step(stepContext);
    }

    expect(missileState.lockStatus).toBe('FREE');
    expect(missileState.hasCandidate).toBe(false);
    expect(missileState.lockTarget).toBe(null);
  });

  it('launches missiles and guides toward the target', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    input.fireMissile = true;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, createControlState());
    heli.body.setTranslation({ x: 0, y: 1, z: 0 }, true);

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(15, 1, 40)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(1)
    });

    physics.world.propagateModifiedBodyPositionsToColliders();

    const config = {
      name: 'Guidance Missile',
      ammo: 1,
      cooldownSeconds: 0.1,
      lockTimeSeconds: 0,
      lockConeDegrees: 45,
      lockRange: 200,
      requireLineOfSight: false,
      speed: 120,
      turnRateDeg: 120,
      maxFlightSeconds: 5,
      proximityRadius: 4,
      damage: 50,
      explosionRadius: 8,
      launchOffset: { x: 0, y: 0, z: 2 },
      colliderRadius: 0.2,
      explosionFx: 'test-explosion'
    };

    const missileState = createMissileState(config);
    const system = createMissileSystem({
      heli,
      physics,
      config,
      state: missileState,
      gameState: { isPaused: false },
      targets: () => [targetEntity]
    });

    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);

    expect(missileState.missiles).toHaveLength(1);
    expect(missileState.ammoRemaining).toBe(0);

    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);

    const missile = missileState.missiles[0];
    const velocity = missile.body.linvel();
    expect(velocity.x).toBeGreaterThan(0);
  });
});
