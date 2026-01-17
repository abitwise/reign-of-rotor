export type AvionicsAlertThresholds = {
  powerMarginWarning: number;
  rotorRpmWarningRatio: number;
  vrs: {
    enabled: boolean;
    minDescentRate: number;
    maxForwardSpeed: number;
    maxAltitude: number;
  };
};

export type NavigationTarget = {
  label: string;
  position: { x: number; z: number };
};

export type NavigationConfig = {
  defaultTarget: NavigationTarget | null;
};

export const AVIONICS_ALERT_THRESHOLDS: AvionicsAlertThresholds = {
  powerMarginWarning: 0.1,
  rotorRpmWarningRatio: 0.93,
  vrs: {
    enabled: true,
    minDescentRate: 6,
    maxForwardSpeed: 12,
    maxAltitude: 80
  }
};

export const ALERT_PRIORITY_ORDER = [
  'MISSILE_LAUNCH',
  'MISSILE_LOCK',
  'MISSILE_SCAN',
  'POWER_LIMIT',
  'LOW_ROTOR_RPM',
  'VRS_SETTLING'
] as const;

export const NAVIGATION_CONFIG: NavigationConfig = {
  defaultTarget: {
    label: 'Waypoint',
    position: { x: 0, z: -20 }
  }
};
