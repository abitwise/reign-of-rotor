import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { GameState } from '../boot/createApp';
import type { MissionRuntime } from './missionDirector';
import type { EnemyState } from './enemies';
import type { CannonState } from './cannon';
import type { MissileState } from './missile';

export type MissionOutcome = 'success' | 'failed';

export type MissionStatsState = {
  elapsedSeconds: number;
  kills: number;
  damageDealt: number;
  cannonShots: number;
  missileShots: number;
  totalShots: number;
  debriefActive: boolean;
  outcome: MissionOutcome | null;
};

export const createMissionStatsState = (): MissionStatsState => ({
  elapsedSeconds: 0,
  kills: 0,
  damageDealt: 0,
  cannonShots: 0,
  missileShots: 0,
  totalShots: 0,
  debriefActive: false,
  outcome: null
});

export const createMissionStatsSystem = ({
  stats,
  mission,
  enemies,
  cannon,
  missiles,
  gameState
}: {
  stats: MissionStatsState;
  mission: MissionRuntime;
  enemies: EnemyState;
  cannon: CannonState;
  missiles: MissileState;
  gameState: GameState;
}): LoopSystem => ({
  id: 'sim.missionStats',
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    if (stats.debriefActive) {
      return;
    }

    if (mission.status === 'active' && !gameState.isPaused) {
      stats.elapsedSeconds += fixedDeltaSeconds;
    }
    stats.kills += enemies.killedUnits.length;
    stats.damageDealt += sumDamage(cannon.damageEvents) + sumDamage(missiles.damageEvents);
    stats.cannonShots = cannon.shotsFired;
    stats.missileShots = missiles.missilesFired;
    stats.totalShots = stats.cannonShots + stats.missileShots;

    if (mission.status !== 'active') {
      stats.debriefActive = true;
      stats.outcome = mission.status === 'completed' ? 'success' : 'failed';
      gameState.isPaused = true;
    }
  }
});

const sumDamage = (events: { amount: number }[]): number =>
  events.reduce((total, event) => total + event.amount, 0);
