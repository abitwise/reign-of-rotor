import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  maxLiftForce: 180,
  maxPitchTorque: 85,
  maxRollTorque: 85,
  maxYawTorque: 45,
  linearDamping: 0.65,
  angularDamping: 2.2
};
