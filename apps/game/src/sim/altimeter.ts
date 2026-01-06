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
  isGrounded: boolean;
  landingState: LandingState;
  impactSeverity: number;
};

export const createAltimeterState = (): AltimeterState => ({
  altitude: Infinity,
  verticalSpeed: 0,
  horizontalSpeed: 0,
  isGrounded: false,
  landingState: LandingState.Airborne,
  impactSeverity: 0
});

const MAX_RAY_DISTANCE = 500;
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
  const ray = new physics.rapier.Ray(translation, { x: 0, y: -1, z: 0 });

  const hit = physics.world.castRay(
    ray,
    MAX_RAY_DISTANCE,
    true,
    undefined,
    undefined,
    undefined,
    heli.body
  );

  const altitude = hit?.timeOfImpact ?? Infinity;
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
  heli.altimeter.isGrounded = isGrounded;
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
