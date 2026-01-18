import type { AltimeterState } from '../sim/altimeter';
import type { PlayerHelicopter } from '../sim/helicopterFlight';
import { rotateVector } from '../physics/math';
import { AVIONICS_ALERT_THRESHOLDS, ALERT_PRIORITY_ORDER } from '../content/avionics';

export type AvionicsReadout = {
  altitude: number;
  verticalSpeed: number;
  horizontalSpeed: number;
  heading: number;
  pitch: number;
  roll: number;
  landingState: AltimeterState['landingState'];
  isGrounded: boolean;
  impactSeverity: number;
  rotorRpm: number;
  nominalRotorRpm: number;
  powerRequired: number;
  powerAvailable: number;
  powerMargin: number;
  fuelPercent?: number | null;
};

export type NavigationReadout = {
  label: string;
  bearing: number;
  distance: number;
};

export type ThreatAlertLevel = 'scan' | 'lock' | 'launch';

export type ThreatReadout = {
  warning: string | null;
  level?: ThreatAlertLevel;
};

export type AlertId =
  | 'MISSILE_SCAN'
  | 'MISSILE_LOCK'
  | 'MISSILE_LAUNCH'
  | 'POWER_LIMIT'
  | 'LOW_ROTOR_RPM'
  | 'VRS_SETTLING';

export type AlertCandidate = {
  id: AlertId;
  label: string;
};

export const buildAvionicsReadout = (player: PlayerHelicopter): AvionicsReadout => {
  const attitude = computeAttitudeDegrees(player.body.rotation());
  const { altimeter, power, flight } = player;

  return {
    altitude: altimeter.altitude,
    verticalSpeed: altimeter.verticalSpeed,
    horizontalSpeed: altimeter.horizontalSpeed,
    heading: altimeter.heading,
    pitch: attitude.pitch,
    roll: attitude.roll,
    landingState: altimeter.landingState,
    isGrounded: altimeter.isGrounded,
    impactSeverity: altimeter.impactSeverity,
    rotorRpm: power.rotorRpm,
    nominalRotorRpm: flight.nominalRotorRpm,
    powerRequired: power.powerRequired,
    powerAvailable: power.powerAvailable,
    powerMargin: power.powerMargin
  };
};

export const buildNavigationReadout = (
  player: PlayerHelicopter,
  target: { label: string; position: { x: number; z: number } } | null
): NavigationReadout | null => {
  if (!target) {
    return null;
  }

  const position = player.body.translation();
  const dx = target.position.x - position.x;
  const dz = target.position.z - position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const bearingRadians = Math.atan2(dx, dz);
  const bearing = ((bearingRadians * 180) / Math.PI + 360) % 360;

  return {
    label: target.label,
    bearing,
    distance
  };
};

export const buildAvionicsAlerts = (
  readout: AvionicsReadout,
  thresholds = AVIONICS_ALERT_THRESHOLDS
): AlertCandidate[] => {
  const alerts: AlertCandidate[] = [];

  if (Number.isFinite(readout.powerMargin) && readout.powerMargin <= thresholds.powerMarginWarning) {
    alerts.push({ id: 'POWER_LIMIT', label: 'POWER LIMIT' });
  }

  if (readout.nominalRotorRpm > 0) {
    const rpmRatio = readout.rotorRpm / readout.nominalRotorRpm;
    if (Number.isFinite(rpmRatio) && rpmRatio <= thresholds.rotorRpmWarningRatio) {
      alerts.push({ id: 'LOW_ROTOR_RPM', label: 'LOW ROTOR RPM' });
    }
  }

  if (thresholds.vrs.enabled && isVrsEnvelope(readout, thresholds)) {
    alerts.push({ id: 'VRS_SETTLING', label: 'VRS / SETTLING' });
  }

  return alerts;
};

export const toThreatAlertCandidate = (readout: ThreatReadout | null): AlertCandidate | null => {
  if (!readout?.warning) {
    return null;
  }

  switch (readout.level) {
    case 'launch':
      return { id: 'MISSILE_LAUNCH', label: readout.warning };
    case 'scan':
      return { id: 'MISSILE_SCAN', label: readout.warning };
    case 'lock':
    default:
      return { id: 'MISSILE_LOCK', label: readout.warning };
  }
};

export const selectPriorityAlert = (
  alerts: AlertCandidate[],
  priorityOrder = ALERT_PRIORITY_ORDER
): AlertCandidate | null => {
  if (!alerts.length) {
    return null;
  }

  const priorityIndex = new Map<string, number>(
    priorityOrder.map((id, index) => [id, index])
  );

  return alerts.reduce<AlertCandidate | null>((best, candidate) => {
    if (!best) {
      return candidate;
    }
    const bestIndex = priorityIndex.get(best.id) ?? priorityOrder.length;
    const candidateIndex = priorityIndex.get(candidate.id) ?? priorityOrder.length;
    return candidateIndex < bestIndex ? candidate : best;
  }, null);
};

const computeAttitudeDegrees = (rotation: { x: number; y: number; z: number; w: number }): {
  pitch: number;
  roll: number;
} => {
  const forward = rotateVector({ x: 0, y: 0, z: 1 }, rotation);
  const right = rotateVector({ x: 1, y: 0, z: 0 }, rotation);
  const pitch = -Math.atan2(forward.y, Math.hypot(forward.x, forward.z));
  const roll = -Math.atan2(right.y, Math.hypot(right.x, right.z));

  return {
    pitch: (pitch * 180) / Math.PI,
    roll: (roll * 180) / Math.PI
  };
};

export const isVrsEnvelope = (
  readout: AvionicsReadout,
  thresholds: typeof AVIONICS_ALERT_THRESHOLDS
): boolean => {
  if (!Number.isFinite(readout.verticalSpeed) || !Number.isFinite(readout.horizontalSpeed)) {
    return false;
  }

  if (!Number.isFinite(readout.altitude) || readout.altitude > thresholds.vrs.maxAltitude) {
    return false;
  }

  return (
    readout.verticalSpeed <= -thresholds.vrs.minDescentRate &&
    readout.horizontalSpeed <= thresholds.vrs.maxForwardSpeed
  );
};
