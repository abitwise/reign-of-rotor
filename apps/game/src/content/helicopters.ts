import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  density: 200,
  maxLiftForce: 200,
  maxPitchTorque: 18,
  maxRollTorque: 16,
  maxYawTorque: 16,
  linearDamping: 0.2,
  angularDamping: 1.4,
  stabilityAngularDamping: 0.92,
  stabilityLevelingTorqueScale: 0.55,
  stabilityLevelingDeadzone: 0.02,
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
