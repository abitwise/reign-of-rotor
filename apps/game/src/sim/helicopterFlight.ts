import type RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerInputState } from '../core/input/playerInput';
import { SystemPhase, type LoopSystem } from '../core/loop/types';
import type { CHelicopterAssists, CHelicopterFlight } from '../ecs/components/helicopter';
import { createEntityId } from '../ecs/entity';
import { createColliderForEntity, createRigidBodyForEntity } from '../physics/factories';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import { createAltimeterState, type AltimeterState } from './altimeter';
import type { GameState } from '../boot/createApp';

export type PlayerHelicopter = {
  entity: Entity;
  body: RAPIER.RigidBody;
  flight: CHelicopterFlight;
  assists: CHelicopterAssists;
  input: PlayerInputState;
  altimeter: AltimeterState;
};

export const createGroundPlane = (physics: PhysicsWorldContext): Entity => {
  const entity = createEntityId();
  const { rapier } = physics;

  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: rapier.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0)
  });

  createColliderForEntity(physics, {
    entity,
    rigidBody: body,
    descriptor: rapier.ColliderDesc.cuboid(48, 0.25, 48).setFriction(1.1)
  });

  return entity;
};

export const spawnPlayerHelicopter = (
  physics: PhysicsWorldContext,
  flight: CHelicopterFlight,
  input: PlayerInputState,
  startHeight = 0.8
): PlayerHelicopter => {
  const entity = createEntityId();
  const { rapier } = physics;

  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: rapier.RigidBodyDesc.dynamic().setTranslation(0, startHeight, 0).setCcdEnabled(true)
  });

  body.setLinearDamping(flight.linearDamping);
  body.setAngularDamping(flight.angularDamping);

  createColliderForEntity(physics, {
    entity,
    rigidBody: body,
    descriptor: rapier.ColliderDesc.cuboid(1.2, 0.6, 2.5).setDensity(flight.density)
  });

  return {
    entity,
    body,
    flight,
    assists: { stability: true, hover: false },
    input,
    altimeter: createAltimeterState()
  };
};

export const createHelicopterFlightSystem = (heli: PlayerHelicopter, gameState: GameState): LoopSystem => ({
  id: `sim.helicopterFlight.${heli.entity}`,
  phase: SystemPhase.Simulation,
  step: () => {
    // Toggle body type based on pause state
    if (gameState.isPaused) {
      if (heli.body.bodyType() !== 1) { // 1 = Kinematic
        heli.body.setBodyType(1, true); // Set to kinematic
      }
      return;
    } else {
      if (heli.body.bodyType() !== 0) { // 0 = Dynamic
        heli.body.setBodyType(0, true); // Set to dynamic
      }
    }
    
    applyRotorForces(heli);
    applyControlTorques(heli);
    applyStabilityAssist(heli);
    applyHoverAssist(heli);
  }
});

export const createAssistToggleSystem = (heli: PlayerHelicopter): LoopSystem => ({
  id: `sim.assistToggle.${heli.entity}`,
  phase: SystemPhase.Simulation,
  step: () => {
    if (heli.input.toggleStability) {
      heli.assists.stability = !heli.assists.stability;
    }
    if (heli.input.toggleHover) {
      heli.assists.hover = !heli.assists.hover;
    }
  }
});

export const createPauseToggleSystem = (input: PlayerInputState, gameState: GameState): LoopSystem => ({
  id: 'sim.pauseToggle',
  phase: SystemPhase.Simulation,
  step: () => {
    if (input.togglePause) {
      gameState.isPaused = !gameState.isPaused;
    }
  }
});

const applyRotorForces = (heli: PlayerHelicopter): void => {
  const liftInput = clamp01((heli.input.collective + 1) / 2);
  if (liftInput <= 0) {
    return;
  }

  const magnitude = heli.flight.maxLiftForce * liftInput;
  const rotation = heli.body.rotation();
  const forceDirection = rotateVector({ x: 0, y: 1, z: 0 }, rotation);

  heli.body.addForce(
    {
      x: forceDirection.x * magnitude,
      y: forceDirection.y * magnitude,
      z: forceDirection.z * magnitude
    },
    true
  );

  heli.body.wakeUp();
};

const applyControlTorques = (heli: PlayerHelicopter): void => {
  const pitchTorque = -heli.input.cyclicY * heli.flight.maxPitchTorque;
  const yawTorque = heli.input.yaw * heli.flight.maxYawTorque;
  const rollTorque = -heli.input.cyclicX * heli.flight.maxRollTorque;

  heli.body.addTorque(
    {
      x: pitchTorque,
      y: yawTorque,
      z: rollTorque
    },
    true
  );
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const rotateVector = (
  vector: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number; w: number }
): { x: number; y: number; z: number } => {
  const { x, y, z } = vector;
  const qx = rotation.x;
  const qy = rotation.y;
  const qz = rotation.z;
  const qw = rotation.w;

  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx
  };
};

const applyStabilityAssist = (heli: PlayerHelicopter): void => {
  if (!heli.assists.stability) {
    return;
  }

  // Only apply stability assist when player is not actively controlling rotation
  const hasRotationInput =
    Math.abs(heli.input.cyclicX) > 0.01 ||
    Math.abs(heli.input.cyclicY) > 0.01 ||
    Math.abs(heli.input.yaw) > 0.01;

  if (hasRotationInput) {
    return;
  }

  const angularVelocity = heli.body.angvel();
  const dampingFactor = 0.94; // Per-tick damping (0.94 = 94% retained, 6% removed)
  const counterTorqueScale = 0.4; // Strength of leveling torque

  // Apply angular damping
  heli.body.setAngvel(
    {
      x: angularVelocity.x * dampingFactor,
      y: angularVelocity.y * dampingFactor,
      z: angularVelocity.z * dampingFactor
    },
    true
  );

  // Apply counter-torque to level out
  const counterTorque = {
    x: -angularVelocity.x * heli.flight.maxPitchTorque * counterTorqueScale,
    y: -angularVelocity.y * heli.flight.maxYawTorque * counterTorqueScale,
    z: -angularVelocity.z * heli.flight.maxRollTorque * counterTorqueScale
  };

  heli.body.addTorque(counterTorque, true);
};

const applyHoverAssist = (heli: PlayerHelicopter): void => {
  if (!heli.assists.hover) {
    return;
  }

  // Hover assist activates when collective is in "hover range"
  const collectiveInput = clamp01((heli.input.collective + 1) / 2);
  const isInHoverRange = collectiveInput >= 0.3 && collectiveInput <= 0.7;

  if (!isInHoverRange) {
    return;
  }

  const linearVelocity = heli.body.linvel();
  const lateralDampingFactor = 0.88; // Stronger damping for lateral drift

  // Dampen lateral (X/Z) velocity to reduce drift
  heli.body.setLinvel(
    {
      x: linearVelocity.x * lateralDampingFactor,
      y: linearVelocity.y, // Don't dampen vertical velocity
      z: linearVelocity.z * lateralDampingFactor
    },
    true
  );
};

