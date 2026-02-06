import type RAPIER from '@dimforge/rapier3d-compat';
import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { GameState } from '../boot/createApp';
import type { CannonState } from './cannon';
import type { MissileState } from './missile';
import type { EnemySpawn, RadarConfig, SamConfig, VehicleConfig } from '../content/enemies';
import type { CountermeasureConfig } from '../content/countermeasures';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import { createColliderForEntity, createRigidBodyForEntity, removePhysicsForEntity } from '../physics/factories';
import { clamp, dot, length, normalize, rotateTowards, rotateVector } from '../physics/math';
import { createEntityId } from '../ecs/entity';
import type { CountermeasureState } from './countermeasures';

export type EnemyUnitType = 'radar' | 'sam' | 'vehicle';

export type EnemyUnit = {
  entity: Entity;
  body: RAPIER.RigidBody;
  type: EnemyUnitType;
  health: number;
  maxHealth: number;
};

export type RadarEmitter = {
  unit: EnemyUnit;
  range: number;
};

export type SamSite = {
  unit: EnemyUnit;
  config: SamConfig;
  lockProgress: number;
  cooldownRemaining: number;
  hasLineOfSight: boolean;
};

export type EnemyVehicle = {
  unit: EnemyUnit;
  patrolPath: { x: number; y: number; z: number }[];
  patrolIndex: number;
  patrolDirection: 1 | -1;
  patrolSpeed: number;
};

export type SamMissile = {
  entity: Entity;
  body: RAPIER.RigidBody;
  target: Entity;
  source: Entity;
  lifetimeSeconds: number;
  config: SamConfig;
};

export type SamExplosionEvent = {
  position: { x: number; y: number; z: number };
  radius: number;
  damage: number;
  targetEntity: Entity | null;
  fxId: string;
};

export type EnemyState = {
  units: EnemyUnit[];
  unitMap: Map<Entity, EnemyUnit>;
  targets: Entity[];
  radarSites: RadarEmitter[];
  samSites: SamSite[];
  vehicles: EnemyVehicle[];
  samMissiles: SamMissile[];
  samMissileMap: Map<Entity, SamMissile>;
  explosionEvents: SamExplosionEvent[];
};

export type EnemyTarget = {
  entity: Entity;
  body: RAPIER.RigidBody;
};

export const createEnemyState = (): EnemyState => ({
  units: [],
  unitMap: new Map(),
  targets: [],
  radarSites: [],
  samSites: [],
  vehicles: [],
  samMissiles: [],
  samMissileMap: new Map(),
  explosionEvents: []
});

export const spawnRadarEmitter = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  config: RadarConfig,
  position: { x: number; y: number; z: number }
): RadarEmitter => {
  const entity = createEntityId();
  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: physics.rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z)
  });

  createColliderForEntity(physics, {
    entity,
    rigidBody: body,
    descriptor: physics.rapier.ColliderDesc.cylinder(config.colliderHeight * 0.5, config.colliderRadius)
  });

  const unit: EnemyUnit = {
    entity,
    body,
    type: 'radar',
    health: config.maxHealth,
    maxHealth: config.maxHealth
  };

  registerUnit(state, unit);

  const emitter: RadarEmitter = {
    unit,
    range: config.detectionRange
  };
  state.radarSites.push(emitter);

  return emitter;
};

export const spawnSamSite = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  config: SamConfig,
  position: { x: number; y: number; z: number }
): SamSite => {
  const entity = createEntityId();
  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: physics.rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z)
  });

  createColliderForEntity(physics, {
    entity,
    rigidBody: body,
    descriptor: physics.rapier.ColliderDesc.cylinder(config.colliderHeight * 0.5, config.colliderRadius)
  });

  const unit: EnemyUnit = {
    entity,
    body,
    type: 'sam',
    health: config.maxHealth,
    maxHealth: config.maxHealth
  };

  registerUnit(state, unit);

  const sam: SamSite = {
    unit,
    config,
    lockProgress: 0,
    cooldownRemaining: 0,
    hasLineOfSight: false
  };
  state.samSites.push(sam);

  return sam;
};

export const spawnVehicle = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  config: VehicleConfig,
  spawn: { position: { x: number; y: number; z: number }; patrolPath?: { x: number; y: number; z: number }[] }
): EnemyVehicle => {
  const entity = createEntityId();
  const hasPatrol = Boolean(spawn.patrolPath && spawn.patrolPath.length > 1);
  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: (hasPatrol
      ? physics.rapier.RigidBodyDesc.kinematicPositionBased()
      : physics.rapier.RigidBodyDesc.fixed()
    ).setTranslation(spawn.position.x, spawn.position.y, spawn.position.z)
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

  const unit: EnemyUnit = {
    entity,
    body,
    type: 'vehicle',
    health: config.maxHealth,
    maxHealth: config.maxHealth
  };

  registerUnit(state, unit);

  const vehicle: EnemyVehicle = {
    unit,
    patrolPath: spawn.patrolPath ?? [],
    patrolIndex: 0,
    patrolDirection: 1,
    patrolSpeed: config.patrolSpeed
  };
  state.vehicles.push(vehicle);

  return vehicle;
};

export const spawnEnemiesFromConfig = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  spawns: EnemySpawn[],
  configs: { radar: RadarConfig; sam: SamConfig; vehicle: VehicleConfig }
): void => {
  spawns.forEach((spawn) => {
    switch (spawn.type) {
      case 'radar':
        spawnRadarEmitter(state, physics, configs.radar, spawn.position);
        break;
      case 'sam':
        spawnSamSite(state, physics, configs.sam, spawn.position);
        break;
      case 'vehicle':
        spawnVehicle(state, physics, configs.vehicle, {
          position: spawn.position,
          patrolPath: spawn.patrolPath
        });
        break;
      default:
        break;
    }
  });
};

export const createEnemySystem = ({
  physics,
  state,
  target,
  cannon,
  missiles,
  gameState,
  countermeasures,
  countermeasureConfig
}: {
  physics: PhysicsWorldContext;
  state: EnemyState;
  target: EnemyTarget;
  cannon: CannonState;
  missiles: MissileState;
  gameState: GameState;
  countermeasures?: CountermeasureState;
  countermeasureConfig?: CountermeasureConfig;
}): LoopSystem => ({
  id: 'sim.enemies',
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    state.explosionEvents.length = 0;

    if (gameState.isPaused) {
      return;
    }

    updateSamSites(state, physics, target, fixedDeltaSeconds);
    updateSamMissiles(
      state,
      physics,
      target,
      fixedDeltaSeconds,
      countermeasures,
      countermeasureConfig
    );
    handleSamMissileCollisions(state, physics);
    updateVehiclePatrols(state, fixedDeltaSeconds);
    applyDamageEvents(state, physics, cannon.damageEvents);
    applyDamageEvents(state, physics, missiles.damageEvents);
  }
});

const registerUnit = (state: EnemyState, unit: EnemyUnit): void => {
  state.units.push(unit);
  state.unitMap.set(unit.entity, unit);
  state.targets.push(unit.entity);
};

const removeUnitByEntity = (state: EnemyState, physics: PhysicsWorldContext, entity: Entity): void => {
  const unit = state.unitMap.get(entity);
  if (!unit) {
    return;
  }
  removePhysicsForEntity(physics, entity);
  state.unitMap.delete(entity);
  removeByPredicate(state.units, (candidate) => candidate.entity === entity);
  removeByPredicate(state.targets, (candidate) => candidate === entity);
  removeByPredicate(state.radarSites, (candidate) => candidate.unit.entity === entity);
  removeByPredicate(state.samSites, (candidate) => candidate.unit.entity === entity);
  removeByPredicate(state.vehicles, (candidate) => candidate.unit.entity === entity);
};

const removeByPredicate = <T>(array: T[], predicate: (value: T) => boolean): void => {
  const index = array.findIndex(predicate);
  if (index >= 0) {
    array.splice(index, 1);
  }
};

const updateSamSites = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  target: EnemyTarget,
  dt: number
): void => {
  for (const sam of state.samSites) {
    if (sam.cooldownRemaining > 0) {
      sam.cooldownRemaining = Math.max(0, sam.cooldownRemaining - dt);
    }

    const hasTarget = isTargetWithinSamArc(sam, target);
    sam.hasLineOfSight = hasTarget && (!sam.config.requireLineOfSight || hasLineOfSight(physics, sam, target));

    if (!sam.hasLineOfSight) {
      sam.lockProgress = 0;
      continue;
    }

    if (sam.config.lockTimeSeconds <= 0) {
      sam.lockProgress = 1;
    } else {
      sam.lockProgress = clamp(sam.lockProgress + dt / sam.config.lockTimeSeconds, 0, 1);
    }

    if (sam.lockProgress >= 1 && sam.cooldownRemaining <= 0) {
      spawnSamMissile(state, physics, sam, target);
      sam.cooldownRemaining = sam.config.cooldownSeconds;
      sam.lockProgress = 0;
    }
  }
};

const updateSamMissiles = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  target: EnemyTarget,
  dt: number,
  countermeasures?: CountermeasureState,
  countermeasureConfig?: CountermeasureConfig
): void => {
  for (let i = state.samMissiles.length - 1; i >= 0; i -= 1) {
    const missile = state.samMissiles[i];
    missile.lifetimeSeconds += dt;

    if (missile.lifetimeSeconds > missile.config.missileMaxFlightSeconds) {
      removeSamMissile(state, physics, missile);
      state.samMissiles.splice(i, 1);
      continue;
    }

    const config = missile.config;

    const targetBody = target.entity === missile.target ? target.body : null;
    if (
      targetBody &&
      countermeasures &&
      countermeasureConfig &&
      countermeasures.activeRemaining > 0 &&
      countermeasures.decoyPosition &&
      missile.target === target.entity
    ) {
      const decoyPos = countermeasures.decoyPosition;
      const missilePos = missile.body.translation();
      const dx = missilePos.x - decoyPos.x;
      const dy = missilePos.y - decoyPos.y;
      const dz = missilePos.z - decoyPos.z;
      const radius = countermeasureConfig.decoyRadius;
      if (dx * dx + dy * dy + dz * dz <= radius * radius) {
        missile.target = null;
        continue;
      }
    }
    if (!targetBody) {
      continue;
    }

    const missilePos = missile.body.translation();
    const targetPos = targetBody.translation();
    const toTarget = {
      x: targetPos.x - missilePos.x,
      y: targetPos.y - missilePos.y,
      z: targetPos.z - missilePos.z
    };
    const distance = length(toTarget);
    if (distance <= config.missileProximityRadius) {
      explodeSamMissile(state, physics, missile, config, target.entity);
      state.samMissiles.splice(i, 1);
      continue;
    }

    const desiredDirection = normalize(toTarget);
    const currentVelocity = missile.body.linvel();
    const currentDirection = normalize({
      x: currentVelocity.x,
      y: currentVelocity.y,
      z: currentVelocity.z
    });
    const maxTurnRadians = (config.missileTurnRateDeg * Math.PI / 180) * dt;
    const nextDirection = rotateTowards(currentDirection, desiredDirection, maxTurnRadians);
    missile.body.setLinvel(
      {
        x: nextDirection.x * config.missileSpeed,
        y: nextDirection.y * config.missileSpeed,
        z: nextDirection.z * config.missileSpeed
      },
      true
    );
  }
};

const handleSamMissileCollisions = (state: EnemyState, physics: PhysicsWorldContext): void => {
  const collisions = physics.collisions.read();
  for (const collision of collisions) {
    if (!collision.started) {
      continue;
    }
    const missile = state.samMissileMap.get(collision.a) ?? state.samMissileMap.get(collision.b);
    if (!missile) {
      continue;
    }
    const config = missile.config;
    const other = missile.entity === collision.a ? collision.b : collision.a;
    if (other === missile.source) {
      continue;
    }
    explodeSamMissile(state, physics, missile, config, other);
    const index = state.samMissiles.indexOf(missile);
    if (index >= 0) {
      state.samMissiles.splice(index, 1);
    }
  }
};

const updateVehiclePatrols = (state: EnemyState, dt: number): void => {
  for (const vehicle of state.vehicles) {
    if (vehicle.patrolPath.length < 2 || vehicle.patrolSpeed <= 0) {
      continue;
    }

    const body = vehicle.unit.body;
    const translation = body.translation();
    const target = vehicle.patrolPath[vehicle.patrolIndex];
    const toTarget = {
      x: target.x - translation.x,
      y: target.y - translation.y,
      z: target.z - translation.z
    };
    const distance = length(toTarget);
    const step = vehicle.patrolSpeed * dt;

    if (distance <= 0.1 || step >= distance) {
      body.setTranslation({ x: target.x, y: target.y, z: target.z }, true);
      advanceVehiclePatrol(vehicle);
      continue;
    }

    const direction = normalize(toTarget);
    body.setTranslation(
      {
        x: translation.x + direction.x * step,
        y: translation.y + direction.y * step,
        z: translation.z + direction.z * step
      },
      true
    );
  }
};

const advanceVehiclePatrol = (vehicle: EnemyVehicle): void => {
  if (vehicle.patrolPath.length < 2) {
    return;
  }
  const lastIndex = vehicle.patrolPath.length - 1;
  if (vehicle.patrolDirection === 1) {
    if (vehicle.patrolIndex >= lastIndex) {
      vehicle.patrolDirection = -1;
      vehicle.patrolIndex = Math.max(0, lastIndex - 1);
    } else {
      vehicle.patrolIndex += 1;
    }
  } else {
    if (vehicle.patrolIndex <= 0) {
      vehicle.patrolDirection = 1;
      vehicle.patrolIndex = Math.min(lastIndex, 1);
    } else {
      vehicle.patrolIndex -= 1;
    }
  }
};

const applyDamageEvents = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  events: { target: Entity; amount: number }[]
): void => {
  if (events.length === 0) {
    return;
  }
  for (const event of events) {
    const unit = state.unitMap.get(event.target);
    if (!unit) {
      continue;
    }
    unit.health = Math.max(0, unit.health - event.amount);
    if (unit.health <= 0) {
      removeUnitByEntity(state, physics, unit.entity);
    }
  }
};

const isTargetWithinSamArc = (sam: SamSite, target: EnemyTarget): boolean => {
  const origin = sam.unit.body.translation();
  const targetPos = target.body.translation();
  const toTarget = {
    x: targetPos.x - origin.x,
    y: targetPos.y - origin.y,
    z: targetPos.z - origin.z
  };
  const distanceToTarget = length(toTarget);
  if (distanceToTarget <= 0.001 || distanceToTarget > sam.config.lockRange) {
    return false;
  }

  const forward = normalize(rotateVector({ x: 0, y: 0, z: 1 }, sam.unit.body.rotation()));
  const direction = normalize(toTarget);
  const angleDegrees = Math.acos(clamp(dot(forward, direction), -1, 1)) * (180 / Math.PI);
  return angleDegrees <= sam.config.lockConeDegrees * 0.5;
};

const hasLineOfSight = (
  physics: PhysicsWorldContext,
  sam: SamSite,
  target: EnemyTarget
): boolean => {
  const origin = sam.unit.body.translation();
  const targetPos = target.body.translation();
  const dx = targetPos.x - origin.x;
  const dy = targetPos.y - origin.y;
  const dz = targetPos.z - origin.z;
  const direction = normalize({
    x: dx,
    y: dy,
    z: dz
  });
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const ray = new physics.rapier.Ray(origin, direction);
  const hit = physics.world.castRayAndGetNormal(
    ray,
    distance,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    (collider) => collider.parent() !== sam.unit.body
  );

  if (!hit) {
    return false;
  }
  const hitEntity = physics.handles.getEntityFromCollider(hit.collider.handle);
  return hitEntity === target.entity;
};

const spawnSamMissile = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  sam: SamSite,
  target: EnemyTarget
): void => {
  const entity = createEntityId();
  const origin = computeLaunchPosition(sam.unit.body, sam.config.missileLaunchOffset);
  const forward = normalize(rotateVector({ x: 0, y: 0, z: 1 }, sam.unit.body.rotation()));
  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: physics.rapier.RigidBodyDesc.dynamic()
      .setTranslation(origin.x, origin.y, origin.z)
      .setCanSleep(false)
      .setCcdEnabled(true)
  });

  body.setLinearDamping(0);
  body.setAngularDamping(0);
  body.setGravityScale(0, true);
  body.setLinvel(
    {
      x: forward.x * sam.config.missileSpeed,
      y: forward.y * sam.config.missileSpeed,
      z: forward.z * sam.config.missileSpeed
    },
    true
  );

  createColliderForEntity(physics, {
    entity,
    rigidBody: body,
    descriptor: physics.rapier.ColliderDesc.ball(sam.config.missileColliderRadius).setDensity(0.1)
  });

  const missile: SamMissile = {
    entity,
    body,
    target: target.entity,
    source: sam.unit.entity,
    lifetimeSeconds: 0,
    config: sam.config
  };

  state.samMissiles.push(missile);
  state.samMissileMap.set(entity, missile);
};

const explodeSamMissile = (
  state: EnemyState,
  physics: PhysicsWorldContext,
  missile: SamMissile,
  config: SamConfig,
  targetEntity: Entity | null
): void => {
  const translation = missile.body.translation();
  state.explosionEvents.push({
    position: { x: translation.x, y: translation.y, z: translation.z },
    radius: config.missileExplosionRadius,
    damage: config.missileDamage,
    targetEntity,
    fxId: config.explosionFx
  });
  removeSamMissile(state, physics, missile);
};

const removeSamMissile = (state: EnemyState, physics: PhysicsWorldContext, missile: SamMissile): void => {
  removePhysicsForEntity(physics, missile.entity);
  state.samMissileMap.delete(missile.entity);
};

const computeLaunchPosition = (
  body: RAPIER.RigidBody,
  offset: { x: number; y: number; z: number }
): { x: number; y: number; z: number } => {
  const translation = body.translation();
  const rotatedOffset = rotateVector(offset, body.rotation());
  return {
    x: translation.x + rotatedOffset.x,
    y: translation.y + rotatedOffset.y,
    z: translation.z + rotatedOffset.z
  };
};
