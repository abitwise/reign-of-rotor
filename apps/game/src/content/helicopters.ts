import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  maxLiftForce: 36,
  maxPitchTorque: 32,
  maxRollTorque: 32,
  maxYawTorque: 18,
  linearDamping: 0.38,
  angularDamping: 1.6
};
