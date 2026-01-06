export type HelicopterFlightTuning = {
  density: number;
  maxLiftForce: number;
  maxPitchTorque: number;
  maxRollTorque: number;
  maxYawTorque: number;
  linearDamping: number;
  angularDamping: number;
};

export type HelicopterAssists = {
  stability: boolean;
  hover: boolean;
};

export type CHelicopterFlight = HelicopterFlightTuning;
export type CHelicopterAssists = HelicopterAssists;
