import type RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerInputState } from '../core/input/playerInput';
import { SystemPhase, type LoopSystem } from '../core/loop/types';
import type { CHelicopterAssists, CHelicopterFlight } from '../ecs/components/helicopter';
import { createEntityId } from '../ecs/entity';
import { createColliderForEntity, createRigidBodyForEntity } from '../physics/factories';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import { createAltimeterState, type AltimeterState } from './altimeter';

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
    descriptor: rapier.ColliderDesc.cuboid(1.2, 0.6, 2.5).setDensity(0.7)
  });

  return {
    entity,
    body,
    flight,
    assists: { stability: false, hover: false },
    input,
    altimeter: createAltimeterState()
  };
};

export const createHelicopterFlightSystem = (heli: PlayerHelicopter): LoopSystem => ({
  id: `sim.helicopterFlight.${heli.entity}`,
  phase: SystemPhase.Simulation,
  step: () => {
    applyRotorForces(heli);
    applyControlTorques(heli);
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
