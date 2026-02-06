import type RAPIER from '@dimforge/rapier3d-compat';
import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { GameState } from '../boot/createApp';
import type { VehicleConfig } from '../content/enemies';
import type { ConvoyPlan } from '../content/missions';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import { createColliderForEntity, createRigidBodyForEntity, removePhysicsForEntity } from '../physics/factories';
import { length, normalize } from '../physics/math';
import { createEntityId } from '../ecs/entity';

export type ConvoyVehicle = {
  entity: Entity;
  body: RAPIER.RigidBody;
  route: { x: number; y: number; z: number }[];
  routeIndex: number;
  speed: number;
  arrived: boolean;
};

export type ConvoyState = {
  vehicles: ConvoyVehicle[];
  completed: boolean;
  destination: { x: number; y: number; z: number } | null;
};

export const createConvoyState = (): ConvoyState => ({
  vehicles: [],
  completed: false,
  destination: null
});

export const spawnConvoy = (
  state: ConvoyState,
  physics: PhysicsWorldContext,
  config: VehicleConfig,
  plan: ConvoyPlan
): void => {
  state.vehicles.length = 0;
  state.completed = false;
  state.destination = plan.route.length ? plan.route[plan.route.length - 1] : null;

  const routeStart = plan.route[0] ?? { x: 0, y: 0, z: 0 };
  const routeNext = plan.route[1] ?? { x: routeStart.x, y: routeStart.y, z: routeStart.z + 1 };
  const direction = normalize({
    x: routeNext.x - routeStart.x,
    y: 0,
    z: routeNext.z - routeStart.z
  });

  for (let index = 0; index < plan.unitCount; index += 1) {
    const entity = createEntityId();
    const offset = plan.spacing * index;
    const spawnPosition = {
      x: routeStart.x - direction.x * offset,
      y: routeStart.y,
      z: routeStart.z - direction.z * offset
    };

    const body = createRigidBodyForEntity(physics, {
      entity,
      descriptor: physics.rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
        spawnPosition.x,
        spawnPosition.y,
        spawnPosition.z
      )
    });

    createColliderForEntity(physics, {
      entity,
      rigidBody: body,
      descriptor: physics.rapier.ColliderDesc.cuboid(
        config.colliderHalfExtents.x,
        config.colliderHalfExtents.y,
        config.colliderHalfExtents.z
      )
    });

    state.vehicles.push({
      entity,
      body,
      route: plan.route,
      routeIndex: 0,
      speed: plan.speed,
      arrived: false
    });
  }
};

export const createConvoySystem = ({
  state,
  gameState
}: {
  state: ConvoyState;
  gameState: GameState;
}): LoopSystem => ({
  id: 'sim.convoy',
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    if (gameState.isPaused) {
      return;
    }

    let allArrived = state.vehicles.length > 0;
    for (const vehicle of state.vehicles) {
      if (vehicle.arrived) {
        continue;
      }

      const nextPoint = vehicle.route[vehicle.routeIndex];
      if (!nextPoint) {
        vehicle.arrived = true;
        continue;
      }

      const translation = vehicle.body.translation();
      const toTarget = {
        x: nextPoint.x - translation.x,
        y: nextPoint.y - translation.y,
        z: nextPoint.z - translation.z
      };
      const distance = length(toTarget);
      const step = vehicle.speed * fixedDeltaSeconds;

      if (distance <= 0.1 || step >= distance) {
        vehicle.body.setTranslation(
          { x: nextPoint.x, y: nextPoint.y, z: nextPoint.z },
          true
        );
        if (vehicle.routeIndex >= vehicle.route.length - 1) {
          vehicle.arrived = true;
        } else {
          vehicle.routeIndex += 1;
        }
      } else {
        const direction = normalize(toTarget);
        vehicle.body.setTranslation(
          {
            x: translation.x + direction.x * step,
            y: translation.y + direction.y * step,
            z: translation.z + direction.z * step
          },
          true
        );
      }

      allArrived = allArrived && vehicle.arrived;
    }

    state.completed = allArrived && state.vehicles.length > 0;
  }
});

export const clearConvoy = (state: ConvoyState, physics: PhysicsWorldContext): void => {
  for (const vehicle of state.vehicles) {
    removePhysicsForEntity(physics, vehicle.entity);
  }
  state.vehicles.length = 0;
  state.completed = false;
  state.destination = null;
};
