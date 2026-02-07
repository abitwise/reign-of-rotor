import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { PlayerInputState } from '../core/input/playerInput';
import type { PhysicsWorldContext } from '../physics/world';
import type { Entity } from '../physics/types';
import { rotateVector } from '../physics/math';
import type { CannonConfig } from '../content/weapons';
import type { PlayerHelicopter } from './helicopterFlight';
import type { GameState } from '../boot/createApp';

export type CannonImpactEvent = {
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  distance: number;
  targetEntity: Entity | null;
  fxId: string;
};

export type CannonDamageEvent = {
  source: Entity;
  target: Entity;
  amount: number;
};

export type CannonState = {
  ammoRemaining: number;
  cooldownRemaining: number;
  shotsFired: number;
  impactEvents: CannonImpactEvent[];
  damageEvents: CannonDamageEvent[];
  impactEventPool: CannonImpactEvent[];
  damageEventPool: CannonDamageEvent[];
};

export const createCannonState = (config: CannonConfig): CannonState => ({
  ammoRemaining: config.ammo,
  cooldownRemaining: 0,
  shotsFired: 0,
  impactEvents: [],
  damageEvents: [],
  impactEventPool: [],
  damageEventPool: []
});

export const createCannonSystem = ({
  heli,
  physics,
  config,
  state,
  gameState,
  input = heli.input
}: {
  heli: PlayerHelicopter;
  physics: PhysicsWorldContext;
  config: CannonConfig;
  state: CannonState;
  gameState: GameState;
  input?: PlayerInputState;
}): LoopSystem => ({
  id: `sim.cannon.${heli.entity}`,
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    recycleImpactEvents(state);
    recycleDamageEvents(state);
    state.impactEvents.length = 0;
    state.damageEvents.length = 0;

    if (gameState.isPaused) {
      return;
    }

    if (state.cooldownRemaining > 0) {
      state.cooldownRemaining = Math.max(0, state.cooldownRemaining - fixedDeltaSeconds);
    }

    if (!input.fireCannon || state.cooldownRemaining > 0 || state.ammoRemaining <= 0) {
      return;
    }

    fireCannonShot(heli, physics, config, state);
  }
});

const fireCannonShot = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext,
  config: CannonConfig,
  state: CannonState
): void => {
  const origin = computeMuzzleWorldPosition(heli, config.muzzleOffset);
  const forward = rotateVector({ x: 0, y: 0, z: 1 }, heli.body.rotation());
  const ray = new physics.rapier.Ray(origin, forward);
  const hit = physics.world.castRayAndGetNormal(
    ray,
    config.range,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    (collider) => collider.parent() !== heli.body
  );

  if (hit) {
    const position = {
      x: origin.x + forward.x * hit.timeOfImpact,
      y: origin.y + forward.y * hit.timeOfImpact,
      z: origin.z + forward.z * hit.timeOfImpact
    };
    const targetEntity = physics.handles.getEntityFromCollider(hit.collider.handle) ?? null;
    const damageScale = heli.damage.effects.weaponsScale;

    const impactEvent = acquireImpactEvent(state);
    impactEvent.position.x = position.x;
    impactEvent.position.y = position.y;
    impactEvent.position.z = position.z;
    impactEvent.normal.x = hit.normal.x;
    impactEvent.normal.y = hit.normal.y;
    impactEvent.normal.z = hit.normal.z;
    impactEvent.distance = hit.timeOfImpact;
    impactEvent.targetEntity = targetEntity;
    impactEvent.fxId = config.impactFx;
    state.impactEvents.push(impactEvent);

    if (targetEntity !== null && damageScale > 0) {
      const damageEvent = acquireDamageEvent(state);
      damageEvent.source = heli.entity;
      damageEvent.target = targetEntity;
      damageEvent.amount = config.damage * damageScale;
      state.damageEvents.push(damageEvent);
    }
  }

  state.ammoRemaining = Math.max(0, state.ammoRemaining - 1);
  state.cooldownRemaining = config.cooldownSeconds;
  state.shotsFired += 1;
};

const computeMuzzleWorldPosition = (
  heli: PlayerHelicopter,
  muzzleOffset: { x: number; y: number; z: number }
): { x: number; y: number; z: number } => {
  const translation = heli.body.translation();
  const rotatedOffset = rotateVector(muzzleOffset, heli.body.rotation());
  return {
    x: translation.x + rotatedOffset.x,
    y: translation.y + rotatedOffset.y,
    z: translation.z + rotatedOffset.z
  };
};

const IMPACT_EVENT_POOL_LIMIT = 48;
const DAMAGE_EVENT_POOL_LIMIT = 48;

const recycleImpactEvents = (state: CannonState): void => {
  for (let i = 0; i < state.impactEvents.length; i += 1) {
    const event = state.impactEvents[i];
    if (state.impactEventPool.length < IMPACT_EVENT_POOL_LIMIT) {
      state.impactEventPool.push(event);
    }
  }
};

const recycleDamageEvents = (state: CannonState): void => {
  for (let i = 0; i < state.damageEvents.length; i += 1) {
    const event = state.damageEvents[i];
    if (state.damageEventPool.length < DAMAGE_EVENT_POOL_LIMIT) {
      state.damageEventPool.push(event);
    }
  }
};

const acquireImpactEvent = (state: CannonState): CannonImpactEvent => {
  return (
    state.impactEventPool.pop() ?? {
      position: { x: 0, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 0 },
      distance: 0,
      targetEntity: null,
      fxId: ''
    }
  );
};

const acquireDamageEvent = (state: CannonState): CannonDamageEvent => {
  return (
    state.damageEventPool.pop() ?? {
      source: 0 as Entity,
      target: 0 as Entity,
      amount: 0
    }
  );
};
