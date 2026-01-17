import { SystemPhase, type LoopSystem } from '../core/loop/types';
import type { PhysicsWorldContext } from '../physics/world';
import type { PlayerHelicopter } from './helicopterFlight';

export enum LandingState {
  Airborne = 'airborne',
  Landed = 'landed',
  HardLanding = 'hardLanding',
  Crashed = 'crashed'
}

export type AltimeterState = {
  altitude: number;
  verticalSpeed: number;
  horizontalSpeed: number;
  heading: number;
  isGrounded: boolean;
  landingState: LandingState;
  impactSeverity: number;
};

export const createAltimeterState = (): AltimeterState => ({
  altitude: Infinity,
  verticalSpeed: 0,
  horizontalSpeed: 0,
  heading: 0,
  isGrounded: false,
  landingState: LandingState.Airborne,
  impactSeverity: 0
});

const MAX_RAY_DISTANCE = 2000;
const GROUNDED_ALTITUDE_THRESHOLD = 0.9;
const LANDED_VERTICAL_SPEED_THRESHOLD = 0.8;
const HARD_LANDING_SPEED_THRESHOLD = 4.5;
const CRASH_IMPACT_SPEED_THRESHOLD = 8;

export const createAltimeterSystem = (
  heli: PlayerHelicopter,
  physics: PhysicsWorldContext
): LoopSystem => ({
  id: `sim.altimeter.${heli.entity}`,
  phase: SystemPhase.PostPhysics,
  step: () => {
    updateAltimeter(heli, physics);
  }
});

const updateAltimeter = (heli: PlayerHelicopter, physics: PhysicsWorldContext): void => {
  const translation = heli.body.translation();
  const downRay = new physics.rapier.Ray(translation, { x: 0, y: -1, z: 0 });

  let hit = physics.world.castRay(
    downRay,
    MAX_RAY_DISTANCE,
    true,
    undefined,
    undefined,
    undefined,
    heli.body
  );

  let altitude = hit?.timeOfImpact ?? Infinity;

  // If downward ray didn't hit (e.g., helicopter below ground), try upward ray
  if (altitude === Infinity) {
    const upRay = new physics.rapier.Ray(translation, { x: 0, y: 1, z: 0 });
    hit = physics.world.castRay(
      upRay,
      MAX_RAY_DISTANCE,
      true,
      undefined,
      undefined,
      undefined,
      heli.body
    );
    if (hit) {
      altitude = -hit.timeOfImpact; // Negative because we're below ground
    }
  }
  const velocity = heli.body.linvel();
  const verticalSpeed = velocity.y;
  const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  const downwardSpeed = Math.max(0, -verticalSpeed);

  const wasGrounded = heli.altimeter.isGrounded;
  const isGrounded = altitude <= GROUNDED_ALTITUDE_THRESHOLD;

  if (heli.altimeter.landingState === LandingState.Crashed) {
    heli.altimeter.altitude = altitude;
    heli.altimeter.verticalSpeed = verticalSpeed;
    heli.altimeter.horizontalSpeed = horizontalSpeed;
    heli.altimeter.heading = computeHeadingDegrees(heli.body.rotation());
    heli.altimeter.isGrounded = isGrounded;
    return;
  }

  if (isGrounded && !wasGrounded) {
    heli.altimeter.impactSeverity = downwardSpeed;
    heli.altimeter.landingState = resolveLandingStateFromImpact(downwardSpeed);
  } else if (!isGrounded) {
    heli.altimeter.landingState = LandingState.Airborne;
    heli.altimeter.impactSeverity = 0;
  }

  heli.altimeter.altitude = altitude;
  heli.altimeter.verticalSpeed = verticalSpeed;
  heli.altimeter.horizontalSpeed = horizontalSpeed;
  heli.altimeter.heading = computeHeadingDegrees(heli.body.rotation());
  heli.altimeter.isGrounded = isGrounded;
};

const computeHeadingDegrees = (rotation: { x: number; y: number; z: number; w: number }): number => {
  const forward = rotateVector({ x: 0, y: 0, z: 1 }, rotation);
  const headingRadians = Math.atan2(forward.x, forward.z);
  const headingDegrees = (headingRadians * 180) / Math.PI;
  return (headingDegrees + 360) % 360;
};

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

const resolveLandingStateFromImpact = (impactSpeed: number): LandingState => {
  if (impactSpeed >= CRASH_IMPACT_SPEED_THRESHOLD) {
    return LandingState.Crashed;
  }

  if (impactSpeed >= HARD_LANDING_SPEED_THRESHOLD) {
    return LandingState.HardLanding;
  }

  if (impactSpeed <= LANDED_VERTICAL_SPEED_THRESHOLD) {
    return LandingState.Landed;
  }

  return LandingState.Airborne;
};
