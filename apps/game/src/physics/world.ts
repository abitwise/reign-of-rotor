import type RAPIER from '@dimforge/rapier3d-compat';
import { CollisionEventBuffer } from './collisions';
import { PhysicsHandleMap } from './handleMap';
import type { Entity, Transform } from './types';

export type PhysicsWorldConfig = {
  gravity: { x: number; y: number; z: number };
};

export type PhysicsWorldContext = {
  rapier: typeof RAPIER;
  world: RAPIER.World;
  eventQueue: RAPIER.EventQueue;
  handles: PhysicsHandleMap;
  collisions: CollisionEventBuffer;
  step: (fixedDeltaSeconds: number) => void;
  getEntityTransform: (entity: Entity) => Transform | null;
};

const DEFAULT_GRAVITY = { x: 0, y: -9.81, z: 0 };

export const createPhysicsWorld = (
  rapier: typeof RAPIER,
  config: PhysicsWorldConfig = { gravity: DEFAULT_GRAVITY }
): PhysicsWorldContext => {
  const world = new rapier.World(config.gravity);
  const eventQueue = new rapier.EventQueue(true);
  const handles = new PhysicsHandleMap();
  const collisions = new CollisionEventBuffer();

  return {
    rapier,
    world,
    eventQueue,
    handles,
    collisions,
    step: (fixedDeltaSeconds: number) => {
      world.integrationParameters.dt = fixedDeltaSeconds;
      collisions.beginStep();
      world.step(eventQueue);
      collisions.drainFromQueue(eventQueue, handles);
    },
    getEntityTransform: (entity: Entity) => {
      const rigidBodyHandle = handles.getRigidBodyHandle(entity);
      if (rigidBodyHandle === undefined) {
        return null;
      }

      const rigidBody = world.getRigidBody(rigidBodyHandle);
      if (!rigidBody) {
        return null;
      }

      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();

      return {
        translation: {
          x: translation.x,
          y: translation.y,
          z: translation.z
        },
        rotation: {
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w
        }
      };
    }
  };
};
