import type RAPIER from '@dimforge/rapier3d-compat';
import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { PlayerInputState } from '../core/input/playerInput';
import type { PhysicsWorldContext } from '../physics/world';
import type { Entity } from '../physics/types';
import { createColliderForEntity, createRigidBodyForEntity, removePhysicsForEntity } from '../physics/factories';
import { rotateVector } from '../physics/math';
import { createEntityId } from '../ecs/entity';
import type { MissileConfig } from '../content/weapons';
import type { PlayerHelicopter } from './helicopterFlight';
import type { GameState } from '../boot/createApp';

export type MissileLockStatus = 'FREE' | 'ACQUIRING' | 'LOCKED';

export type MissileExplosionEvent = {
  position: { x: number; y: number; z: number };
  radius: number;
  damage: number;
  targetEntity: Entity | null;
  fxId: string;
};

export type MissileDamageEvent = {
  source: Entity;
  target: Entity;
  amount: number;
};

export type MissileInstance = {
  entity: Entity;
  body: RAPIER.RigidBody;
  target: Entity | null;
  lifetimeSeconds: number;
};

export type MissileState = {
  ammoRemaining: number;
  cooldownRemaining: number;
  lockStatus: MissileLockStatus;
  lockProgress: number;
  lockTarget: Entity | null;
  hasCandidate: boolean;
  missiles: MissileInstance[];
  missileMap: Map<Entity, MissileInstance>;
  explosionEvents: MissileExplosionEvent[];
  damageEvents: MissileDamageEvent[];
};

export const createMissileState = (config: MissileConfig): MissileState => ({
  ammoRemaining: config.ammo,
  cooldownRemaining: 0,
  lockStatus: 'FREE',
  lockProgress: 0,
  lockTarget: null,
  hasCandidate: false,
  missiles: [],
  missileMap: new Map(),
  explosionEvents: [],
  damageEvents: []
});

export const createMissileSystem = ({
  heli,
  physics,
  config,
  state,
  gameState,
  input = heli.input,
  targets = () => []
}: {
  heli: PlayerHelicopter;
  physics: PhysicsWorldContext;
  config: MissileConfig;
  state: MissileState;
  gameState: GameState;
  input?: PlayerInputState;
  targets?: () => readonly Entity[];
}): LoopSystem => ({
  id: `sim.missile.${heli.entity}`,
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    state.explosionEvents.length = 0;
    state.damageEvents.length = 0;

    if (gameState.isPaused) {
      return;
    }

    if (state.cooldownRemaining > 0) {
      state.cooldownRemaining = Math.max(0, state.cooldownRemaining - fixedDeltaSeconds);
    }

    updateLockState(heli, physics, config, state, targets(), fixedDeltaSeconds);

    if (
      input.fireMissile &&
      state.cooldownRemaining <= 0 &&
      state.ammoRemaining > 0 &&
      state.lockStatus === 'LOCKED' &&
      state.lockTarget !== null
    ) {
      spawnMissile(heli, physics, config, state, state.lockTarget);
      state.cooldownRemaining = config.cooldownSeconds;
      state.ammoRemaining = Math.max(0, state.ammoRemaining - 1);
    }

    handleMissileCollisions(heli, physics, state, config);
    updateMissileGuidance(physics, config, state, fixedDeltaSeconds);
  }
});

const updateLockState = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext,
  config: MissileConfig,
  state: MissileState,
  candidates: readonly Entity[],
  fixedDeltaSeconds: number
): void => {
  const selection = selectBestTarget(heli, physics, config, candidates);
  state.hasCandidate = selection !== null;

  if (!selection) {
    state.lockStatus = 'FREE';
    state.lockTarget = null;
    state.lockProgress = 0;
    return;
  }

  if (state.lockTarget !== selection.entity) {
    state.lockTarget = selection.entity;
    if (config.lockTimeSeconds <= 0) {
      state.lockStatus = 'LOCKED';
      state.lockProgress = 1;
    } else {
      state.lockStatus = 'ACQUIRING';
      state.lockProgress = 0;
    }
    return;
  }

  if (state.lockStatus === 'LOCKED') {
    state.lockProgress = 1;
    return;
  }

  if (config.lockTimeSeconds <= 0) {
    state.lockProgress = 1;
    state.lockStatus = 'LOCKED';
    return;
  }

  const nextProgress = Math.min(1, state.lockProgress + fixedDeltaSeconds / config.lockTimeSeconds);
  state.lockProgress = nextProgress;
  state.lockStatus = nextProgress >= 1 ? 'LOCKED' : 'ACQUIRING';
};

const selectBestTarget = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext,
  config: MissileConfig,
  candidates: readonly Entity[]
): { entity: Entity } | null => {
  if (!candidates.length) {
    return null;
  }

  const origin = heli.body.translation();
  const forward = normalize(rotateVector({ x: 0, y: 0, z: 1 }, heli.body.rotation()));

  let best: { entity: Entity; angle: number; distance: number } | null = null;

  for (const entity of candidates) {
    if (entity === heli.entity) {
      continue;
    }
    const targetBody = getTargetBody(physics, entity);
    if (!targetBody) {
      continue;
    }
    const targetPos = targetBody.translation();
    const toTarget = {
      x: targetPos.x - origin.x,
      y: targetPos.y - origin.y,
      z: targetPos.z - origin.z
    };
    const distance = length(toTarget);
    if (distance <= 0.001 || distance > config.lockRange) {
      continue;
    }

    const direction = normalize(toTarget);
    const angleDegrees = Math.acos(clamp(dot(forward, direction), -1, 1)) * (180 / Math.PI);
    if (angleDegrees > config.lockConeDegrees * 0.5) {
      continue;
    }

    if (config.requireLineOfSight && !hasLineOfSight(heli, physics, targetPos, distance, entity)) {
      continue;
    }

    if (!best || angleDegrees < best.angle || (Math.abs(angleDegrees - best.angle) < 0.01 && distance < best.distance)) {
      best = { entity, angle: angleDegrees, distance };
    }
  }

  if (!best) {
    return null;
  }

  return {
    entity: best.entity
  };
};

const hasLineOfSight = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext,
  targetPos: { x: number; y: number; z: number },
  distance: number,
  targetEntity: Entity
): boolean => {
  const origin = heli.body.translation();
  const direction = normalize({
    x: targetPos.x - origin.x,
    y: targetPos.y - origin.y,
    z: targetPos.z - origin.z
  });
  const ray = new physics.rapier.Ray(origin, direction);
  const hit = physics.world.castRayAndGetNormal(
    ray,
    distance,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    (collider) => collider.parent() !== heli.body
  );

  if (!hit) {
    return false;
  }

  const hitEntity = physics.handles.getEntityFromCollider(hit.collider.handle);
  return hitEntity === targetEntity;
};

const spawnMissile = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext,
  config: MissileConfig,
  state: MissileState,
  target: Entity
): void => {
  const entity = createEntityId();
  const origin = computeLaunchWorldPosition(heli, config.launchOffset);
  const forward = normalize(rotateVector({ x: 0, y: 0, z: 1 }, heli.body.rotation()));
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
      x: forward.x * config.speed,
      y: forward.y * config.speed,
      z: forward.z * config.speed
    },
    true
  );

  createColliderForEntity(physics, {
    entity,
    descriptor: physics.rapier.ColliderDesc.ball(config.colliderRadius).setDensity(0.1),
    rigidBody: body
  });

  const instance: MissileInstance = {
    entity,
    body,
    target,
    lifetimeSeconds: 0
  };

  state.missiles.push(instance);
  state.missileMap.set(entity, instance);
};

const updateMissileGuidance = (
  physics: PhysicsWorldContext,
  config: MissileConfig,
  state: MissileState,
  fixedDeltaSeconds: number
): void => {
  const maxTurnRadians = (config.turnRateDeg * Math.PI / 180) * fixedDeltaSeconds;

  for (let i = state.missiles.length - 1; i >= 0; i -= 1) {
    const missile = state.missiles[i];
    missile.lifetimeSeconds += fixedDeltaSeconds;

    if (missile.lifetimeSeconds > config.maxFlightSeconds) {
      removeMissile(physics, state, missile);
      state.missiles.splice(i, 1);
      continue;
    }

    const targetBody = missile.target !== null ? getTargetBody(physics, missile.target) : null;
    if (targetBody) {
      const missilePos = missile.body.translation();
      const targetPos = targetBody.translation();
      const toTarget = {
        x: targetPos.x - missilePos.x,
        y: targetPos.y - missilePos.y,
        z: targetPos.z - missilePos.z
      };
      const distance = length(toTarget);
      if (distance <= config.proximityRadius) {
        explodeMissile(physics, config, state, missile, missile.target);
        state.missiles.splice(i, 1);
        continue;
      }

      const desiredDirection = normalize(toTarget);
      const currentVelocity = missile.body.linvel();
      const currentDirection = normalize({
        x: currentVelocity.x,
        y: currentVelocity.y,
        z: currentVelocity.z
      });
      const nextDirection = rotateTowards(currentDirection, desiredDirection, maxTurnRadians);
      missile.body.setLinvel(
        {
          x: nextDirection.x * config.speed,
          y: nextDirection.y * config.speed,
          z: nextDirection.z * config.speed
        },
        true
      );
    }
  }
};

const handleMissileCollisions = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext,
  state: MissileState,
  config: MissileConfig
): void => {
  const collisions = physics.collisions.read();
  for (const collision of collisions) {
    if (!collision.started) {
      continue;
    }
    const missile = state.missileMap.get(collision.a) ?? state.missileMap.get(collision.b);
    if (!missile) {
      continue;
    }
    const other = missile.entity === collision.a ? collision.b : collision.a;
    if (other === heli.entity) {
      continue;
    }
    explodeMissile(physics, config, state, missile, other);
    const index = state.missiles.indexOf(missile);
    if (index >= 0) {
      state.missiles.splice(index, 1);
    }
  }
};

const explodeMissile = (
  physics: PhysicsWorldContext,
  config: MissileConfig,
  state: MissileState,
  missile: MissileInstance,
  target: Entity | null
): void => {
  const translation = missile.body.translation();
  state.explosionEvents.push({
    position: { x: translation.x, y: translation.y, z: translation.z },
    radius: config.explosionRadius,
    damage: config.damage,
    targetEntity: target,
    fxId: config.explosionFx
  });

  if (target !== null) {
    state.damageEvents.push({
      source: missile.entity,
      target,
      amount: config.damage
    });
  }

  removeMissile(physics, state, missile);
};

const removeMissile = (physics: PhysicsWorldContext, state: MissileState, missile: MissileInstance): void => {
  removePhysicsForEntity(physics, missile.entity);
  state.missileMap.delete(missile.entity);
};

const computeLaunchWorldPosition = (
  heli: PlayerHelicopter,
  offset: { x: number; y: number; z: number }
): { x: number; y: number; z: number } => {
  const translation = heli.body.translation();
  const rotatedOffset = rotateVector(offset, heli.body.rotation());
  return {
    x: translation.x + rotatedOffset.x,
    y: translation.y + rotatedOffset.y,
    z: translation.z + rotatedOffset.z
  };
};

const getTargetBody = (
  physics: PhysicsWorldContext,
  target: Entity
): RAPIER.RigidBody | null => {
  const handle = physics.handles.getRigidBodyHandle(target);
  if (handle === undefined) {
    return null;
  }
  return physics.world.getRigidBody(handle) ?? null;
};

const length = (value: { x: number; y: number; z: number }): number =>
  Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);

const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalize = (value: { x: number; y: number; z: number }): { x: number; y: number; z: number } => {
  const magnitude = length(value);
  if (magnitude <= 0.00001) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: value.x / magnitude,
    y: value.y / magnitude,
    z: value.z / magnitude
  };
};

const rotateTowards = (
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  maxRadiansDelta: number
): { x: number; y: number; z: number } => {
  const dotValue = clamp(dot(from, to), -1, 1);
  const angle = Math.acos(dotValue);
  if (angle <= 0.00001) {
    return to;
  }
  const clampedAngle = Math.min(angle, maxRadiansDelta);
  const t = clampedAngle / angle;
  const sinAngle = Math.sin(angle);
  if (sinAngle <= 0.00001) {
    return to;
  }
  const coeffFrom = Math.sin((1 - t) * angle) / sinAngle;
  const coeffTo = Math.sin(t * angle) / sinAngle;
  const blended = {
    x: from.x * coeffFrom + to.x * coeffTo,
    y: from.y * coeffFrom + to.y * coeffTo,
    z: from.z * coeffFrom + to.z * coeffTo
  };
  return normalize(blended);
};
