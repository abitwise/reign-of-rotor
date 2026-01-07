import type { HelicopterFlightTuning } from '../ecs/components/helicopter';

export const DEFAULT_HELICOPTER_FLIGHT: HelicopterFlightTuning = {
  density: 200,
  maxLiftForce: 200,
  maxPitchTorque: 18,
  maxRollTorque: 16,
  maxYawTorque: 16,
  linearDamping: 0.2,
  angularDamping: 1.4
};
