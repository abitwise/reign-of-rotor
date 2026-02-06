import { beforeAll, describe, expect, it } from 'vitest';
import type { FixedStepContext } from '../../core/loop/types';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import { createEnemyState, spawnRadarEmitter } from '../enemies';
import { DEFAULT_RADAR_CONFIG } from '../../content/enemies';
import { createPlayerInputState } from '../../core/input/playerInput';
import { createConvoyState } from '../convoy';
import { createMissionRuntime, createMissionSystem } from '../missionDirector';

const stepContext: FixedStepContext = {
  fixedDeltaMs: 16,
  fixedDeltaSeconds: 1 / 60,
  stepIndex: 0,
  elapsedMs: 0
};

describe('mission director', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('prompts for completion once objectives are met and honors continue/confirm', () => {
    const physics = createPhysicsWorld(rapier);
    const enemies = createEnemyState();
    const radar = spawnRadarEmitter(enemies, physics, DEFAULT_RADAR_CONFIG, { x: 0, y: 0, z: 0 });

    const mission = createMissionRuntime({
      seed: 99,
      templateId: 'radar-sweep',
      templateName: 'Radar Sweep',
      summary: 'Test summary',
      objectives: [
        {
          id: 'radar',
          label: 'Destroy radar site',
          type: 'destroy',
          targetType: 'radar',
          requiredCount: 1
        }
      ],
      targetsByType: {
        radar: [radar.unit.entity],
        sam: [],
        vehicle: []
      },
      navigationTarget: null
    });

    const input = createPlayerInputState();
    const system = createMissionSystem({
      mission,
      enemies,
      convoy: createConvoyState(),
      input,
      gameState: { isPaused: false }
    });

    system.step(stepContext);
    expect(mission.completion.available).toBe(false);

    enemies.unitMap.delete(radar.unit.entity);
    enemies.radarSites.length = 0;
    enemies.units.length = 0;

    system.step(stepContext);
    expect(mission.completion.available).toBe(true);
    expect(mission.completion.promptActive).toBe(true);

    input.continueMission = true;
    system.step(stepContext);
    expect(mission.completion.promptActive).toBe(false);
    expect(mission.completion.continueSelected).toBe(true);

    input.continueMission = false;
    input.confirmMissionComplete = true;
    system.step(stepContext);
    expect(mission.status).toBe('completed');
  });
});
