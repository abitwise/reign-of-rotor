import type { AltimeterState } from '../sim/altimeter';
import type { PlayerHelicopter } from '../sim/helicopterFlight';
import type { CannonState } from '../sim/cannon';
import type { CountermeasureState } from '../sim/countermeasures';
import type { MissileState } from '../sim/missile';
import type { EnemyState } from '../sim/enemies';
import type { MissionRuntime, MissionObjectiveStatus } from '../sim/missionDirector';
import type { MissionStatsState } from '../sim/missionStats';
import type { CannonConfig, MissileConfig } from '../content/weapons';
import { rotateVector } from '../physics/math';
import {
  AVIONICS_ALERT_THRESHOLDS,
  ALERT_PRIORITY_ORDER,
  RWR_WARNING_LABELS
} from '../content/avionics';

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

export type CombatReadout = {
  weaponName: string | null;
  ammo: number | null;
  missileAmmo: number | null;
  countermeasureAmmo: number | null;
  lockState: string | null;
};

export type MissionObjectiveReadout = {
  label: string;
  status: MissionObjectiveStatus;
  progress: string | null;
};

export type MissionReadout = {
  title: string;
  summary: string;
  objectives: MissionObjectiveReadout[];
  completion: {
    available: boolean;
    promptActive: boolean;
    continueSelected: boolean;
    completed: boolean;
  };
};

export type DebriefReadout = {
  active: boolean;
  title: string;
  outcomeLabel: string;
  elapsedSeconds: number;
  kills: number;
  damageDealt: number;
  shotsFired: number;
  cannonShots: number;
  missileShots: number;
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

export const buildCombatReadout = (
  cannonState: CannonState,
  cannonConfig: CannonConfig,
  missileState: MissileState,
  missileConfig: MissileConfig,
  countermeasures?: CountermeasureState | null
): CombatReadout => ({
  weaponName: cannonConfig.name,
  ammo: cannonState.ammoRemaining,
  missileAmmo: missileState.ammoRemaining,
  countermeasureAmmo: countermeasures?.ammoRemaining ?? null,
  lockState: formatMissileLockState(missileState, missileConfig)
});

export const buildThreatReadout = (
  enemies: EnemyState,
  player: PlayerHelicopter,
  labels = RWR_WARNING_LABELS
): ThreatReadout | null => {
  if (enemies.samMissiles.some((missile) => missile.target === player.entity)) {
    return { warning: labels.launch, level: 'launch' };
  }

  if (enemies.samSites.some((sam) => sam.hasLineOfSight && sam.lockProgress > 0)) {
    return { warning: labels.lock, level: 'lock' };
  }

  const playerPos = player.body.translation();
  const hasScan = enemies.radarSites.some((radar) => {
    const origin = radar.unit.body.translation();
    const dx = origin.x - playerPos.x;
    const dy = origin.y - playerPos.y;
    const dz = origin.z - playerPos.z;
    return dx * dx + dy * dy + dz * dz <= radar.range * radar.range;
  });

  if (hasScan) {
    return { warning: labels.scan, level: 'scan' };
  }

  return null;
};

export const buildMissionReadout = (mission: MissionRuntime | null): MissionReadout | null => {
  if (!mission) {
    return null;
  }

  return {
    title: mission.templateName,
    summary: mission.summary,
    objectives: mission.objectives.map((objective) => ({
      label: objective.label,
      status: objective.status,
      progress: formatObjectiveProgress(objective)
    })),
    completion: { ...mission.completion }
  };
};

export const buildDebriefReadout = (
  mission: MissionRuntime | null,
  stats: MissionStatsState | null
): DebriefReadout | null => {
  if (!mission || !stats || !stats.debriefActive) {
    return null;
  }

  return {
    active: stats.debriefActive,
    title: mission.templateName,
    outcomeLabel: mission.status === 'completed' ? 'Mission Complete' : 'Mission Failed',
    elapsedSeconds: stats.elapsedSeconds,
    kills: stats.kills,
    damageDealt: stats.damageDealt,
    shotsFired: stats.totalShots,
    cannonShots: stats.cannonShots,
    missileShots: stats.missileShots
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

const formatMissileLockState = (state: MissileState, config: MissileConfig): string => {
  if (state.lockStatus === 'LOCKED') {
    return 'LOCK';
  }

  if (state.lockStatus === 'ACQUIRING') {
    const percent = Math.round(state.lockProgress * 100);
    return `ACQ ${percent}%`;
  }

  if (!state.hasCandidate || config.lockRange <= 0) {
    return 'NO TARGET';
  }

  return 'SEARCH';
};

export const selectPriorityAlert = (
  alerts: AlertCandidate[],
  priorityOrder: readonly string[] = ALERT_PRIORITY_ORDER
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

const formatObjectiveProgress = (objective: MissionRuntime['objectives'][number]): string | null => {
  if (objective.type === 'escort') {
    return objective.status === 'complete' ? 'Arrived' : 'En route';
  }

  if (objective.requiredCount <= 0) {
    return null;
  }

  const clamped = Math.min(objective.destroyedCount, objective.requiredCount);
  return `${clamped}/${objective.requiredCount}`;
};
