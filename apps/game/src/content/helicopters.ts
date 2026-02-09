import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

// Arcade-smooth tuning: low torques + high damping + aggressive leveling = forgiving flight.
// Designed for "Battlefield helicopter" feel: fun first, sim second.
export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  density: 200,
  maxLiftForce: 240,
  maxPitchTorque: 10,
  maxRollTorque: 8,
  maxYawTorque: 10,
  linearDamping: 0.6,
  angularDamping: 3.0,
  stabilityAngularDamping: 0.7,
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
