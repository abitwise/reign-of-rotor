import { beforeAll, describe, expect, it } from 'vitest';
import type { CollisionEvent } from '../collisions';
import { createColliderForEntity, createRigidBodyForEntity } from '../factories';
import { loadRapier } from '../rapierInstance';
import { createPhysicsWorld } from '../world';

describe('physics world integration', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('steps the world and exposes transforms for mapped entities', () => {
    const physics = createPhysicsWorld(rapier);

    const body = createRigidBodyForEntity(physics, {
      entity: 1,
      descriptor: rapier.RigidBodyDesc.dynamic().setTranslation(0, 1, 0)
    });

    createColliderForEntity(physics, {
      entity: 1,
      descriptor: rapier.ColliderDesc.cuboid(0.5, 0.5, 0.5),
      rigidBody: body
    });

    physics.step(1 / 60);

    const transform = physics.getEntityTransform(1);
    expect(transform).not.toBeNull();
    expect(transform?.translation.y).toBeLessThan(1);
  });

  it('records collision events with entity ids', () => {
    const physics = createPhysicsWorld(rapier);

    const groundBody = createRigidBodyForEntity(physics, {
      entity: 100,
      descriptor: rapier.RigidBodyDesc.fixed()
    });

    createColliderForEntity(physics, {
      entity: 100,
      descriptor: rapier.ColliderDesc.cuboid(2, 0.1, 2),
      rigidBody: groundBody
    });

    const fallingBody = createRigidBodyForEntity(physics, {
      entity: 200,
      descriptor: rapier.RigidBodyDesc.dynamic().setTranslation(0, 0.5, 0)
    });

    createColliderForEntity(physics, {
      entity: 200,
      descriptor: rapier.ColliderDesc.cuboid(0.25, 0.25, 0.25),
      rigidBody: fallingBody
    });

    let events: readonly CollisionEvent[] = [];
    for (let i = 0; i < 60; i += 1) {
      physics.step(1 / 60);
      events = physics.collisions.read();
      if (events.length > 0) {
        break;
      }
    }

    const collisionEvents = physics.collisions.read();
    const involvesGround = collisionEvents.some(
      (event) =>
        (event.a === 100 && event.b === 200) || (event.a === 200 && event.b === 100)
    );

    expect(collisionEvents.length).toBeGreaterThan(0);
    expect(involvesGround).toBe(true);
    expect(collisionEvents.every((event) => typeof event.started === 'boolean')).toBe(true);
  });
});
