import { describe, expect, it } from 'vitest';
import { createMissionStatsState, createMissionStatsSystem } from '../missionStats';
import type { MissionRuntime } from '../missionDirector';
import type { CannonState } from '../cannon';
import type { MissileState } from '../missile';
import { createEnemyState } from '../enemies';
import type { GameState } from '../../boot/createApp';
import { DEFAULT_DIFFICULTY_PRESET } from '../../content/difficulty';

const baseMission: MissionRuntime = {
  seed: 1,
  templateId: 'test-mission',
  templateName: 'Test Mission',
  summary: 'Test summary',
  status: 'active',
  objectives: [],
  completion: {
    available: false,
    promptActive: false,
    continueSelected: false,
    completed: false
  },
  navigationTarget: null,
  bounds: { type: 'circle', center: { x: 0, z: 0 }, radius: 20000 }
};

const createCannonState = (): CannonState => ({
  ammoRemaining: 100,
  cooldownRemaining: 0,
  shotsFired: 0,
  impactEvents: [],
  damageEvents: [],
  impactEventPool: [],
  damageEventPool: []
});

const createMissileState = (): MissileState => ({
  ammoRemaining: 4,
  cooldownRemaining: 0,
  lockStatus: 'FREE',
  lockProgress: 0,
  lockTarget: null,
  hasCandidate: false,
  missilesFired: 0,
  missiles: [],
  missilePool: [],
  missileMap: new Map(),
  explosionEvents: [],
  damageEvents: [],
  explosionEventPool: [],
  damageEventPool: []
});

describe('mission stats system', () => {
  it('accumulates time, kills, damage, and shots while active', () => {
    const stats = createMissionStatsState();
    const mission: MissionRuntime = { ...baseMission };
    const enemies = createEnemyState();
    enemies.killedUnits.push(1, 2);

    const cannon = createCannonState();
    cannon.shotsFired = 3;
    cannon.damageEvents.push({ source: 1, target: 2, amount: 10 });

    const missiles = createMissileState();
    missiles.missilesFired = 1;
    missiles.damageEvents.push({ source: 3, target: 4, amount: 5 });

    const gameState: GameState = { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET };

    const system = createMissionStatsSystem({
      stats,
      mission,
      enemies,
      cannon,
      missiles,
      gameState
    });

    system.step({ fixedDeltaMs: 1000, fixedDeltaSeconds: 1, stepIndex: 0, elapsedMs: 0 });

    expect(stats.elapsedSeconds).toBe(1);
    expect(stats.kills).toBe(2);
    expect(stats.damageDealt).toBe(15);
    expect(stats.totalShots).toBe(4);
  });

  it('activates debrief and pauses the game when mission ends', () => {
    const stats = createMissionStatsState();
    const mission: MissionRuntime = { ...baseMission, status: 'completed' };
    const enemies = createEnemyState();
    const cannon = createCannonState();
    const missiles = createMissileState();
    const gameState: GameState = { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET };

    const system = createMissionStatsSystem({
      stats,
      mission,
      enemies,
      cannon,
      missiles,
      gameState
    });

    system.step({ fixedDeltaMs: 1000, fixedDeltaSeconds: 1, stepIndex: 0, elapsedMs: 0 });

    expect(stats.debriefActive).toBe(true);
    expect(stats.outcome).toBe('success');
    expect(gameState.isPaused).toBe(true);
  });
});
