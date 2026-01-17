import type RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerInputState } from '../core/input/playerInput';
import type { ControlState } from '../core/input/controlState';
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
  control: ControlState;
  altimeter: AltimeterState;
};

export const spawnPlayerHelicopter = (
  physics: PhysicsWorldContext,
  flight: CHelicopterFlight,
  input: PlayerInputState,
  control: ControlState,
  options: { startHeight?: number; startPosition?: { x: number; y?: number; z: number } } = {}
): PlayerHelicopter => {
  const entity = createEntityId();
  const { rapier } = physics;
  const startHeight = options.startHeight ?? 0.8;
  const startPosition = options.startPosition ?? { x: 0, y: startHeight, z: 0 };

  const body = createRigidBodyForEntity(physics, {
    entity,
    descriptor: rapier.RigidBodyDesc.dynamic()
      .setTranslation(startPosition.x, startPosition.y ?? startHeight, startPosition.z)
      .setCcdEnabled(true)
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
    control,
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
        
        // Ensure helicopter doesn't start below ground when unpausing
        const translation = heli.body.translation();
        if (translation.y < 0.5) {
          heli.body.setTranslation({ x: translation.x, y: 0.8, z: translation.z }, true);
          heli.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          heli.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }
    
    applyRotorForces(heli);
    applyCollectiveDownBrake(heli);
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
  // Collective is normalized to [0, 1] via the control processing layer.
  // With keyboard sampling, idle state is 0 (no keys pressed) to avoid applying lift at rest.
  const liftInput = clamp01(heli.control.collective.filtered);
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
  const pitchTorque = -heli.control.cyclicY.filtered * heli.flight.maxPitchTorque;
  const yawTorque = heli.control.yaw.filtered * heli.flight.maxYawTorque;
  const rollTorque = -heli.control.cyclicX.filtered * heli.flight.maxRollTorque;

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

  const angularVelocity = heli.body.angvel();
  const dampingFactor = 0.94; // Per-tick damping (0.94 = 94% retained, 6% removed)

  // Always apply some angular damping when stability is enabled.
  // With binary keyboard inputs, this prevents rapid uncontrolled flips while still allowing manual control.
  heli.body.setAngvel(
    {
      x: angularVelocity.x * dampingFactor,
      y: angularVelocity.y * dampingFactor,
      z: angularVelocity.z * dampingFactor
    },
    true
  );

  // Only apply leveling (counter-torque) when player is not actively controlling rotation.
  const hasRotationInput =
    Math.abs(heli.control.cyclicX.filtered) > 0.01 ||
    Math.abs(heli.control.cyclicY.filtered) > 0.01 ||
    Math.abs(heli.control.yaw.filtered) > 0.01;

  if (hasRotationInput) {
    return;
  }
  const counterTorqueScale = 0.4; // Strength of leveling torque

  // Apply counter-torque to level out
  const counterTorque = {
    x: -angularVelocity.x * heli.flight.maxPitchTorque * counterTorqueScale,
    y: -angularVelocity.y * heli.flight.maxYawTorque * counterTorqueScale,
    z: -angularVelocity.z * heli.flight.maxRollTorque * counterTorqueScale
  };

  heli.body.addTorque(counterTorque, true);
};

const applyCollectiveDownBrake = (heli: PlayerHelicopter): void => {
  // PageDown / collective-down should make it easier to reduce upward velocity.
  // We do *not* apply a constant downward thrust (unrealistic); instead, we add a small vertical brake
  // only when the helicopter is moving upward.
  if (heli.input.collective >= 0) {
    return;
  }

  const linearVelocity = heli.body.linvel();
  if (linearVelocity.y <= 0) {
    return;
  }

  const strength = clamp01(-heli.input.collective); // map [-1..0) -> (0..1]
  const brakeFactor = 1 - 0.18 * strength; // up to 18% per tick extra reduction

  heli.body.setLinvel(
    {
      x: linearVelocity.x,
      y: linearVelocity.y * brakeFactor,
      z: linearVelocity.z
    },
    true
  );
  heli.body.wakeUp();
};

const applyHoverAssist = (heli: PlayerHelicopter): void => {
  if (!heli.assists.hover) {
    return;
  }

  // Hover assist activates when collective is in "hover range"
  const collectiveInput = heli.control.collective.filtered;
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
