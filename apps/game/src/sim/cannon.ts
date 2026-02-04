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
  impactEvents: CannonImpactEvent[];
  damageEvents: CannonDamageEvent[];
};

export const createCannonState = (config: CannonConfig): CannonState => ({
  ammoRemaining: config.ammo,
  cooldownRemaining: 0,
  impactEvents: [],
  damageEvents: []
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
    heli.body
  );

  if (hit) {
    const position = {
      x: origin.x + forward.x * hit.timeOfImpact,
      y: origin.y + forward.y * hit.timeOfImpact,
      z: origin.z + forward.z * hit.timeOfImpact
    };
    const targetEntity = physics.handles.getEntityFromCollider(hit.collider.handle) ?? null;

    state.impactEvents.push({
      position,
      normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
      distance: hit.timeOfImpact,
      targetEntity,
      fxId: config.impactFx
    });

    if (targetEntity !== null) {
      state.damageEvents.push({
        source: heli.entity,
        target: targetEntity,
        amount: config.damage
      });
    }
  }

  state.ammoRemaining = Math.max(0, state.ammoRemaining - 1);
  state.cooldownRemaining = config.cooldownSeconds;
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
