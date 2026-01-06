import type RAPIER from '@dimforge/rapier3d-compat';
import type { Entity } from './types';

export class PhysicsHandleMap {
  private entityToRigidBody = new Map<Entity, RAPIER.RigidBodyHandle>();
  private entityToColliders = new Map<Entity, Set<RAPIER.ColliderHandle>>();
  private rigidBodyToEntity = new Map<RAPIER.RigidBodyHandle, Entity>();
  private colliderToEntity = new Map<RAPIER.ColliderHandle, Entity>();

  linkRigidBody(entity: Entity, rigidBody: RAPIER.RigidBody): void {
    const handle = rigidBody.handle;
    this.entityToRigidBody.set(entity, handle);
    this.rigidBodyToEntity.set(handle, entity);
  }

  linkCollider(entity: Entity, collider: RAPIER.Collider): void {
    const handle = collider.handle;
    const collidersForEntity = this.entityToColliders.get(entity) ?? new Set<RAPIER.ColliderHandle>();

    collidersForEntity.add(handle);
    this.entityToColliders.set(entity, collidersForEntity);
    this.colliderToEntity.set(handle, entity);
  }

  getRigidBodyHandle(entity: Entity): RAPIER.RigidBodyHandle | undefined {
    return this.entityToRigidBody.get(entity);
  }

  getEntityFromRigidBody(handle: RAPIER.RigidBodyHandle): Entity | undefined {
    return this.rigidBodyToEntity.get(handle);
  }

  getEntityFromCollider(handle: RAPIER.ColliderHandle): Entity | undefined {
    return this.colliderToEntity.get(handle);
  }

  removeEntity(entity: Entity): {
    rigidBodyHandle?: RAPIER.RigidBodyHandle;
    colliderHandles: RAPIER.ColliderHandle[];
  } {
    const rigidBodyHandle = this.entityToRigidBody.get(entity);
    const colliderHandles = [...(this.entityToColliders.get(entity) ?? [])];

    if (rigidBodyHandle !== undefined) {
      this.rigidBodyToEntity.delete(rigidBodyHandle);
    }

    colliderHandles.forEach((handle) => this.colliderToEntity.delete(handle));

    this.entityToRigidBody.delete(entity);
    this.entityToColliders.delete(entity);

    return { rigidBodyHandle, colliderHandles };
  }

  clear(): void {
    this.entityToRigidBody.clear();
    this.entityToColliders.clear();
    this.rigidBodyToEntity.clear();
    this.colliderToEntity.clear();
  }
}
