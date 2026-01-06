import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  maxLiftForce: 60000,
  maxPitchTorque: 24000,
  maxRollTorque: 24000,
  maxYawTorque: 12000,
  linearDamping: 0.65,
  angularDamping: 2.2
};
