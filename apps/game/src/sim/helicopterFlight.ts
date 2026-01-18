import type RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerInputState } from '../core/input/playerInput';
import type { ControlState, YawRateControllerTuning } from '../core/input/controlState';
import { SystemPhase, type LoopSystem } from '../core/loop/types';
import type { CHelicopterAssists, CHelicopterFlight } from '../ecs/components/helicopter';
import { createEntityId } from '../ecs/entity';
import { createColliderForEntity, createRigidBodyForEntity } from '../physics/factories';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import { createAltimeterState, type AltimeterState } from './altimeter';
import type { GameState } from '../boot/createApp';
import { rotateVector } from '../physics/math';

export type PlayerHelicopter = {
  entity: Entity;
  body: RAPIER.RigidBody;
  flight: CHelicopterFlight;
  yawRateTuning: YawRateControllerTuning;
  assists: CHelicopterAssists;
  input: PlayerInputState;
  control: ControlState;
  altimeter: AltimeterState;
  power: HelicopterPowerState;
};

export type HelicopterPowerState = {
  rotorRpm: number;
  powerRequired: number;
  powerAvailable: number;
  powerMargin: number;
};

const createPowerState = (flight: CHelicopterFlight): HelicopterPowerState => ({
  rotorRpm: flight.nominalRotorRpm,
  powerRequired: 0,
  powerAvailable: flight.powerAvailable,
  powerMargin: flight.powerAvailable
});

export const spawnPlayerHelicopter = (
  physics: PhysicsWorldContext,
  flight: CHelicopterFlight,
  input: PlayerInputState,
  control: ControlState,
  options: {
    startHeight?: number;
    startPosition?: { x: number; y?: number; z: number };
    yawRateTuning?: YawRateControllerTuning;
  } = {}
): PlayerHelicopter => {
  const entity = createEntityId();
  const { rapier } = physics;
  const startHeight = options.startHeight ?? 0.8;
  const startPosition = options.startPosition ?? { x: 0, y: startHeight, z: 0 };
  const yawRateTuning = options.yawRateTuning ?? { maxRateRad: 1.4, damping: 0.65 };

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
    yawRateTuning,
    assists: { stability: true, hover: false },
    input,
    control,
    altimeter: createAltimeterState(),
    power: createPowerState(flight)
  };
};

export const createHelicopterFlightSystem = (heli: PlayerHelicopter, gameState: GameState): LoopSystem => ({
  id: `sim.helicopterFlight.${heli.entity}`,
  phase: SystemPhase.Simulation,
  step: (context) => {
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

    updatePowerModel(heli, context.fixedDeltaSeconds);
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
  // Collective supports bidirectional input: positive for lift, negative to reduce lift (allowing descent).
  // With keyboard sampling, idle state is 0 (no keys pressed) to avoid applying lift at rest.
  const rawCollective = heli.control.collective.raw;
  if (rawCollective === 0) {
    return;
  }
  const liftInput = rawCollective > 0
    ? clamp01(heli.control.collective.filtered)
    : -clamp01(-rawCollective);

  // Guard against invalid nominal rotor RPM (zero or negative) to avoid division errors.
  if (heli.flight.nominalRotorRpm <= 0) {
    return;
  }

  const rotorRpmScale = clamp(heli.power.rotorRpm / heli.flight.nominalRotorRpm, 0, 1.1);
  const magnitude = heli.flight.maxLiftForce * liftInput * rotorRpmScale;
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
  // Guard against invalid nominal rotor RPM (zero or negative) to avoid division errors.
  if (heli.flight.nominalRotorRpm <= 0) {
    return;
  }

  // Skip control torques when raw rotation inputs are zero.
  // This prevents fighting between lingering filtered values and stability assist.
  // Filtered values smooth the response during active control, but should not
  // continue applying torques after the player releases the keys.
  const hasRotationInput =
    Math.abs(heli.control.cyclicX.raw) > 0.01 ||
    Math.abs(heli.control.cyclicY.raw) > 0.01 ||
    Math.abs(heli.control.yaw.raw) > 0.01;

  if (!hasRotationInput) {
    return;
  }

  const authorityScale = computeAuthorityScale(heli);
  const rotorRpmScale = clamp(heli.power.rotorRpm / heli.flight.nominalRotorRpm, 0, 1.1);
  const torqueScale = authorityScale * rotorRpmScale;
  const pitchTorque = -heli.control.cyclicY.filtered * heli.flight.maxPitchTorque * torqueScale;
  const yawTorque =
    computeYawRateCommand(heli.control.yaw.filtered, heli.body.angvel().y, heli.yawRateTuning) *
    heli.flight.maxYawTorque *
    torqueScale;
  const rollTorque = -heli.control.cyclicX.filtered * heli.flight.maxRollTorque * torqueScale;

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
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const computeAuthorityScale = (heli: PlayerHelicopter): number => {
  const powerMarginForFullAuthority = heli.flight.powerMarginForFullAuthority;
  if (powerMarginForFullAuthority <= 0) {
    // Fallback to full authority for invalid values (zero or negative) to avoid division errors.
    return 1;
  }
  const authorityBlend = clamp(heli.power.powerMargin / powerMarginForFullAuthority, 0, 1);
  return heli.flight.minAuthorityScale + (1 - heli.flight.minAuthorityScale) * authorityBlend;
};

export const computeYawRateCommand = (
  desiredYawRateNormalized: number,
  currentYawRate: number,
  tuning: YawRateControllerTuning
): number => {
  const desiredYawRate = clamp(desiredYawRateNormalized, -1, 1) * tuning.maxRateRad;
  const rateError = desiredYawRate - currentYawRate;
  return clamp(rateError * tuning.damping, -1, 1);
};

const applyStabilityAssist = (heli: PlayerHelicopter): void => {
  if (!heli.assists.stability) {
    return;
  }

  const angularVelocity = heli.body.angvel();
  const dampingFactor = heli.flight.stabilityAngularDamping;

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
    Math.abs(heli.control.cyclicX.raw) > 0.01 ||
    Math.abs(heli.control.cyclicY.raw) > 0.01 ||
    Math.abs(heli.control.yaw.raw) > 0.01;
  const hasTrim =
    Math.abs(heli.control.trim.cyclicX) > 0.01 ||
    Math.abs(heli.control.trim.cyclicY) > 0.01 ||
    Math.abs(heli.control.trim.yaw) > 0.01;

  if (hasRotationInput || hasTrim) {
    return;
  }
  const counterTorqueScale = 0.4; // Strength of damping torque

  // Apply counter-torque to level out
  const counterTorque = {
    x: -angularVelocity.x * heli.flight.maxPitchTorque * counterTorqueScale,
    y: -angularVelocity.y * heli.flight.maxYawTorque * counterTorqueScale,
    z: -angularVelocity.z * heli.flight.maxRollTorque * counterTorqueScale
  };

  heli.body.addTorque(counterTorque, true);

  if (heli.flight.nominalRotorRpm <= 0) {
    return;
  }

  const rotation = heli.body.rotation();
  const upVector = rotateVector({ x: 0, y: 1, z: 0 }, rotation);
  const tiltMagnitude = Math.hypot(upVector.x, upVector.z);
  if (tiltMagnitude < heli.flight.stabilityLevelingDeadzone) {
    return;
  }

  const authorityScale = computeAuthorityScale(heli);
  const rotorRpmScale = clamp(heli.power.rotorRpm / heli.flight.nominalRotorRpm, 0, 1.1);
  const torqueScale = heli.flight.stabilityLevelingTorqueScale * authorityScale * rotorRpmScale;
  const levelingTorque = {
    x: -upVector.z * heli.flight.maxPitchTorque * torqueScale,
    y: 0,
    z: upVector.x * heli.flight.maxRollTorque * torqueScale
  };

  heli.body.addTorque(levelingTorque, true);
};

const updatePowerModel = (heli: PlayerHelicopter, dt: number): void => {
  const collectiveInput = heli.control.collective.raw > 0
    ? clamp01(heli.control.collective.filtered)
    : 0;
  const cyclicLoad = Math.hypot(heli.control.cyclicX.filtered, heli.control.cyclicY.filtered);
  const yawLoad = Math.abs(heli.control.yaw.filtered) * 0.6;
  const maneuverLoad = clamp01(cyclicLoad + yawLoad);
  const linearVelocity = heli.body.linvel();
  const speed = Math.sqrt(
    linearVelocity.x * linearVelocity.x +
      linearVelocity.y * linearVelocity.y +
      linearVelocity.z * linearVelocity.z
  );
  let speedRelief = 0;
  if (heli.flight.powerSpeedReference > 0) {
    speedRelief =
      clamp01(speed / heli.flight.powerSpeedReference) * heli.flight.powerSpeedRelief;
  }

  const powerRequired = clamp(
    collectiveInput * heli.flight.powerCollectiveScale +
      maneuverLoad * heli.flight.powerManeuverScale -
      speedRelief,
    0,
    heli.flight.powerMaxRequired
  );
  const powerAvailable = heli.flight.powerAvailable;
  const powerMargin = powerAvailable - powerRequired;
  const rpmTarget = clamp(
    heli.flight.nominalRotorRpm + powerMargin * heli.flight.rpmMarginToTarget,
    heli.flight.minRotorRpm,
    heli.flight.maxRotorRpm
  );
  const response = 1 - Math.exp(-heli.flight.rpmResponse * dt);

  heli.power.rotorRpm = clamp(
    heli.power.rotorRpm + (rpmTarget - heli.power.rotorRpm) * response,
    heli.flight.minRotorRpm,
    heli.flight.maxRotorRpm
  );
  heli.power.powerRequired = powerRequired;
  heli.power.powerAvailable = powerAvailable;
  heli.power.powerMargin = powerMargin;
};

const applyCollectiveDownBrake = (heli: PlayerHelicopter): void => {
  // PageDown / collective-down should make it easier to reduce upward velocity.
  // We do *not* apply a constant downward thrust (unrealistic); instead, we add a small vertical brake
  // only when the helicopter is moving upward.
  if (heli.control.collective.raw > 0) {
    return;
  }

  const linearVelocity = heli.body.linvel();
  if (linearVelocity.y <= 0) {
    return;
  }

  const strength = clamp01(-heli.control.collective.raw); // map [-1..0) -> (0..1]
  const neutralBrake = 0.06; // gentle bleed when collective is neutral
  const inputBrake = 0.18 * strength; // stronger brake when holding collective-down
  const brakeFactor = clamp(1 - (neutralBrake + inputBrake), 0.7, 1);

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
