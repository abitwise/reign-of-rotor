import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { MissionRuntime } from './missionDirector';
import type { MissionStatsState } from './missionStats';
import type { PlayerDamageState, DamageCause } from './playerDamage';
import type { GameState } from '../boot/createApp';

export type TelemetryState = {
  missionsRecorded: number;
  totalMissionSeconds: number;
  averageMissionSeconds: number;
  deaths: number;
  deathCauses: Record<DamageCause, number>;
  lastRecordedSeed: number | null;
};

export const createTelemetryState = (): TelemetryState => ({
  missionsRecorded: 0,
  totalMissionSeconds: 0,
  averageMissionSeconds: 0,
  deaths: 0,
  deathCauses: { sam: 0, crash: 0, unknown: 0 },
  lastRecordedSeed: null
});

export const recordTelemetryOnMissionEnd = (
  telemetry: TelemetryState,
  mission: MissionRuntime,
  stats: MissionStatsState,
  playerDamage: PlayerDamageState
): void => {
  if (mission.status === 'active') {
    return;
  }

  if (telemetry.lastRecordedSeed === mission.seed) {
    return;
  }

  telemetry.lastRecordedSeed = mission.seed;
  telemetry.missionsRecorded += 1;
  telemetry.totalMissionSeconds += stats.elapsedSeconds;
  telemetry.averageMissionSeconds = telemetry.totalMissionSeconds / telemetry.missionsRecorded;

  if (mission.status === 'failed') {
    telemetry.deaths += 1;
    const cause = playerDamage.lastDamageCause ?? 'unknown';
    telemetry.deathCauses[cause] = (telemetry.deathCauses[cause] ?? 0) + 1;
  }
};

export const createTelemetrySystem = ({
  telemetry,
  mission,
  stats,
  playerDamage,
  gameState
}: {
  telemetry: TelemetryState;
  mission: MissionRuntime;
  stats: MissionStatsState;
  playerDamage: PlayerDamageState;
  gameState: GameState;
}): LoopSystem => ({
  id: 'sim.telemetry',
  phase: SystemPhase.PostPhysics,
  step: () => {
    if (gameState.isPaused && mission.status === 'active') {
      return;
    }

    const wasRecorded = telemetry.lastRecordedSeed === mission.seed;
    recordTelemetryOnMissionEnd(telemetry, mission, stats, playerDamage);

    if (!wasRecorded && telemetry.lastRecordedSeed === mission.seed) {
      console.info(
        '[Telemetry]',
        `Missions=${telemetry.missionsRecorded}`,
        `AvgTime=${telemetry.averageMissionSeconds.toFixed(1)}s`,
        `Deaths=${telemetry.deaths}`,
        `Causes=${JSON.stringify(telemetry.deathCauses)}`
      );
    }
  }
});
