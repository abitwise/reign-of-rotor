import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

// Arcade-smooth tuning: forgiving flight with usable authority.
// Designed for "Battlefield helicopter" feel: fun first, sim second.
//
// Force/torque authority is sized against the player body's actual mass and
// rotational inertia (collider cuboid 2.4 x 1.2 x 5.0 m at density 200 => ~2880 kg,
// weight ~28.3 kN; I_pitch ~6345, I_roll ~1728, I_yaw ~7382 kg*m^2). The previous
// values (maxLiftForce 240, torques 10/8/10) were orders of magnitude too small for
// this mass, so collective could not out-lift gravity and cyclic barely rotated the
// body. Collective now commands climb/descend ABOUT the auto-hover point
// (gravity compensation is always active, see applyHoverAssist), so maxLiftForce is
// the climb/descend thrust above/below weight (~3.1 m/s^2 authority), not the sole
// upward force.
export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  density: 200,
  maxLiftForce: 9000,
  maxPitchTorque: 26000,
  maxRollTorque: 8000,
  maxYawTorque: 26000,
  linearDamping: 0.6,
  angularDamping: 3.0,
  stabilityAngularDamping: 0.95,
  stabilityLevelingTorqueScale: 1.2,
  stabilityLevelingDeadzone: 0.01,
  nominalRotorRpm: 1,
  minRotorRpm: 0.6,
  maxRotorRpm: 1.05,
  rpmResponse: 2.4,
  rpmMarginToTarget: 0.35,
  powerAvailable: 1,
  powerCollectiveScale: 0.85,
  powerManeuverScale: 0.45,
  powerSpeedRelief: 0.2,
  powerSpeedReference: 30,
  powerMaxRequired: 1.35,
  minAuthorityScale: 0.55,
  powerMarginForFullAuthority: 0.15
};
