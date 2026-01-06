import type RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsHandleMap } from './handleMap';
import type { Entity } from './types';

export type CollisionEvent = {
  a: Entity;
  b: Entity;
  started: boolean;
};

export class CollisionEventBuffer {
  private events: CollisionEvent[] = [];

  beginStep(): void {
    this.events.length = 0;
  }

  read(): readonly CollisionEvent[] {
    return this.events;
  }

  drainFromQueue(queue: RAPIER.EventQueue, handles: PhysicsHandleMap): void {
    queue.drainCollisionEvents((handleA, handleB, started) => {
      const a = handles.getEntityFromCollider(handleA);
      const b = handles.getEntityFromCollider(handleB);

      if (a === undefined || b === undefined) {
        return;
      }

      this.events.push({ a, b, started });
    });
  }
}
