export type HelicopterFlightTuning = {
  density: number;
  maxLiftForce: number;
  maxPitchTorque: number;
  maxRollTorque: number;
  maxYawTorque: number;
  linearDamping: number;
  angularDamping: number;
  stabilityAngularDamping: number;
  stabilityLevelingTorqueScale: number;
  stabilityLevelingDeadzone: number;
  nominalRotorRpm: number;
  minRotorRpm: number;
  maxRotorRpm: number;
  rpmResponse: number;
  rpmMarginToTarget: number;
  powerAvailable: number;
  powerCollectiveScale: number;
  powerManeuverScale: number;
  powerSpeedRelief: number;
  powerSpeedReference: number;
  powerMaxRequired: number;
  minAuthorityScale: number;
  powerMarginForFullAuthority: number;
};

export type HelicopterAssists = {
  stability: boolean;
  hover: boolean;
};

export type CHelicopterFlight = HelicopterFlightTuning;
export type CHelicopterAssists = HelicopterAssists;
