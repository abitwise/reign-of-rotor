import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorldContext } from './world';
import type { Entity } from './types';

export type RigidBodyFactoryOptions = {
  entity: Entity;
  descriptor: RAPIER.RigidBodyDesc;
};

export type ColliderFactoryOptions = {
  entity: Entity;
  descriptor: RAPIER.ColliderDesc;
  rigidBody?: RAPIER.RigidBody;
  activeEvents?: number;
};

export const createRigidBodyForEntity = (
  context: PhysicsWorldContext,
  { entity, descriptor }: RigidBodyFactoryOptions
): RAPIER.RigidBody => {
  const rigidBody = context.world.createRigidBody(descriptor);
  context.handles.linkRigidBody(entity, rigidBody);
  return rigidBody;
};

export const createColliderForEntity = (
  context: PhysicsWorldContext,
  { entity, descriptor, rigidBody, activeEvents }: ColliderFactoryOptions
): RAPIER.Collider => {
  const collider = rigidBody
    ? context.world.createCollider(descriptor, rigidBody)
    : context.world.createCollider(descriptor);

  collider.setActiveEvents(activeEvents ?? context.rapier.ActiveEvents.COLLISION_EVENTS);
  context.handles.linkCollider(entity, collider);

  return collider;
};

export const removePhysicsForEntity = (
  context: PhysicsWorldContext,
  entity: Entity,
  wakeUpBodies = true
): void => {
  const { rigidBodyHandle, colliderHandles } = context.handles.removeEntity(entity);

  colliderHandles.forEach((handle) => {
    const collider = context.world.getCollider(handle);
    if (collider) {
      context.world.removeCollider(collider, wakeUpBodies);
    }
  });

  if (rigidBodyHandle !== undefined) {
    const rigidBody = context.world.getRigidBody(rigidBodyHandle);
    if (rigidBody) {
      context.world.removeRigidBody(rigidBody);
    }
  }
};
