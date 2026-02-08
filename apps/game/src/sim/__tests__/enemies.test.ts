import { beforeAll, describe, expect, it } from 'vitest';
import type { FixedStepContext } from '../../core/loop/types';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { createEntityId } from '../../ecs/entity';
import { createColliderForEntity, createRigidBodyForEntity } from '../../physics/factories';
import { createCannonState } from '../cannon';
import { createCountermeasureState } from '../countermeasures';
import { createMissileState } from '../missile';
import {
  createEnemyState,
  createEnemySystem,
  spawnSamSite,
  spawnVehicle
} from '../enemies';
import { DEFAULT_DIFFICULTY_PRESET } from '../../content/difficulty';

const stepContext: FixedStepContext = {
  fixedDeltaMs: 100,
  fixedDeltaSeconds: 0.1,
  stepIndex: 0,
  elapsedMs: 0
};

describe('enemy systems', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('locks and fires a SAM missile after the lock timer elapses', () => {
    const physics = createPhysicsWorld(rapier, { gravity: { x: 0, y: 0, z: 0 } });
    const enemyState = createEnemyState();

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 1, 80)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(1)
    });

    spawnSamSite(enemyState, physics, {
      name: 'Test SAM',
      maxHealth: 100,
      lockTimeSeconds: 0.25,
      lockConeDegrees: 60,
      lockRange: 200,
      cooldownSeconds: 1.5,
      requireLineOfSight: false,
      missileSpeed: 90,
      missileTurnRateDeg: 80,
      missileMaxFlightSeconds: 6,
      missileProximityRadius: 4,
      missileDamage: 40,
      missileExplosionRadius: 6,
      missileLaunchOffset: { x: 0, y: 1, z: 0 },
      missileColliderRadius: 0.2,
      explosionFx: 'sam-test',
      colliderRadius: 1.8,
      colliderHeight: 2
    }, { x: 0, y: 0, z: 0 });

    physics.world.propagateModifiedBodyPositionsToColliders();

    const cannonState = createCannonState({
      name: 'Test Cannon',
      ammo: 1,
      cooldownSeconds: 1,
      range: 100,
      damage: 10,
      muzzleOffset: { x: 0, y: 0, z: 0 },
      impactFx: 'impact'
    });
    const missileState = createMissileState({
      name: 'Test Missile',
      ammo: 0,
      cooldownSeconds: 1,
      lockTimeSeconds: 0,
      lockConeDegrees: 1,
      lockRange: 1,
      requireLineOfSight: false,
      speed: 1,
      turnRateDeg: 1,
      maxFlightSeconds: 1,
      proximityRadius: 1,
      damage: 1,
      explosionRadius: 1,
      launchOffset: { x: 0, y: 0, z: 0 },
      colliderRadius: 0.2,
      explosionFx: 'missile'
    });

    const system = createEnemySystem({
      physics,
      state: enemyState,
      target: { entity: targetEntity, body: targetBody },
      cannon: cannonState,
      missiles: missileState,
      gameState: { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET }
    });

    for (let i = 0; i < 5; i += 1) {
      physics.step(stepContext.fixedDeltaSeconds);
      system.step(stepContext);
    }

    expect(enemyState.samMissiles).toHaveLength(1);
    expect(enemyState.samSites[0].cooldownRemaining).toBeGreaterThan(0);
  });

  it('moves vehicles along patrol paths', () => {
    const physics = createPhysicsWorld(rapier, { gravity: { x: 0, y: 0, z: 0 } });
    const enemyState = createEnemyState();

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(1)
    });

    const vehicle = spawnVehicle(enemyState, physics, {
      name: 'Test Vehicle',
      maxHealth: 50,
      colliderHalfExtents: { x: 1, y: 1, z: 1 },
      patrolSpeed: 10
    }, {
      position: { x: 0, y: 0, z: 0 },
      patrolPath: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ]
    });

    const cannonState = createCannonState({
      name: 'Test Cannon',
      ammo: 1,
      cooldownSeconds: 1,
      range: 100,
      damage: 10,
      muzzleOffset: { x: 0, y: 0, z: 0 },
      impactFx: 'impact'
    });
    const missileState = createMissileState({
      name: 'Test Missile',
      ammo: 0,
      cooldownSeconds: 1,
      lockTimeSeconds: 0,
      lockConeDegrees: 1,
      lockRange: 1,
      requireLineOfSight: false,
      speed: 1,
      turnRateDeg: 1,
      maxFlightSeconds: 1,
      proximityRadius: 1,
      damage: 1,
      explosionRadius: 1,
      launchOffset: { x: 0, y: 0, z: 0 },
      colliderRadius: 0.2,
      explosionFx: 'missile'
    });

    const system = createEnemySystem({
      physics,
      state: enemyState,
      target: { entity: targetEntity, body: targetBody },
      cannon: cannonState,
      missiles: missileState,
      gameState: { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET }
    });

    for (let i = 0; i < 2; i += 1) {
      physics.step(stepContext.fixedDeltaSeconds);
      system.step(stepContext);
    }

    const position = vehicle.unit.body.translation();
    expect(position.x).toBeGreaterThan(0);
  });

  it('drops SAM missile lock when countermeasures are active nearby', () => {
    const physics = createPhysicsWorld(rapier, { gravity: { x: 0, y: 0, z: 0 } });
    const enemyState = createEnemyState();

    const targetEntity = createEntityId();
    const targetBody = createRigidBodyForEntity(physics, {
      entity: targetEntity,
      descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, 1, 80)
    });
    createColliderForEntity(physics, {
      entity: targetEntity,
      rigidBody: targetBody,
      descriptor: rapier.ColliderDesc.ball(1)
    });

    spawnSamSite(
      enemyState,
      physics,
      {
        name: 'Test SAM',
        maxHealth: 100,
        lockTimeSeconds: 0,
        lockConeDegrees: 60,
        lockRange: 200,
        cooldownSeconds: 1.5,
        requireLineOfSight: false,
        missileSpeed: 90,
        missileTurnRateDeg: 80,
        missileMaxFlightSeconds: 6,
        missileProximityRadius: 4,
        missileDamage: 40,
        missileExplosionRadius: 6,
        missileLaunchOffset: { x: 0, y: 1, z: 0 },
        missileColliderRadius: 0.2,
        explosionFx: 'sam-test',
        colliderRadius: 1.8,
        colliderHeight: 2
      },
      { x: 0, y: 0, z: 0 }
    );

    physics.world.propagateModifiedBodyPositionsToColliders();

    const cannonState = createCannonState({
      name: 'Test Cannon',
      ammo: 1,
      cooldownSeconds: 1,
      range: 100,
      damage: 10,
      muzzleOffset: { x: 0, y: 0, z: 0 },
      impactFx: 'impact'
    });
    const missileState = createMissileState({
      name: 'Test Missile',
      ammo: 0,
      cooldownSeconds: 1,
      lockTimeSeconds: 0,
      lockConeDegrees: 1,
      lockRange: 1,
      requireLineOfSight: false,
      speed: 1,
      turnRateDeg: 1,
      maxFlightSeconds: 1,
      proximityRadius: 1,
      damage: 1,
      explosionRadius: 1,
      launchOffset: { x: 0, y: 0, z: 0 },
      colliderRadius: 0.2,
      explosionFx: 'missile'
    });

    const countermeasures = createCountermeasureState({
      name: 'Test CM',
      ammo: 1,
      cooldownSeconds: 1,
      decoyActiveSeconds: 1,
      decoyRadius: 120
    });

    const system = createEnemySystem({
      physics,
      state: enemyState,
      target: { entity: targetEntity, body: targetBody },
      cannon: cannonState,
      missiles: missileState,
      gameState: { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET },
      countermeasures,
      countermeasureConfig: {
        name: 'Test CM',
        ammo: 1,
        cooldownSeconds: 1,
        decoyActiveSeconds: 1,
        decoyRadius: 120
      }
    });

    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);

    expect(enemyState.samMissiles).toHaveLength(1);

    countermeasures.activeRemaining = 1;
    countermeasures.decoyPosition = { x: 0, y: 1, z: 80 };

    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);

    expect(enemyState.samMissiles[0].target).toBeNaN();
  });
});
