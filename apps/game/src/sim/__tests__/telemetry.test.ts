import { describe, expect, it } from 'vitest';
import { createTelemetryState, recordTelemetryOnMissionEnd } from '../telemetry';
import { createMissionRuntime } from '../missionDirector';
import { createMissionStatsState } from '../missionStats';
import { createPlayerDamageState } from '../playerDamage';
import { DIFFICULTY_PRESETS } from '../../content/difficulty';

const preset = DIFFICULTY_PRESETS.normal;

const createMission = (seed: number) =>
  createMissionRuntime({
    seed,
    templateId: 'test',
    templateName: 'Test Mission',
    summary: 'Telemetry test',
    objectives: [],
    targetsByType: { radar: [], sam: [], vehicle: [] },
    navigationTarget: null,
    bounds: { type: 'circle', center: { x: 0, z: 0 }, radius: 1000 }
  });

describe('telemetry', () => {
  it('records mission completion time once per seed', () => {
    const telemetry = createTelemetryState();
    const mission = createMission(1);
    const stats = createMissionStatsState();
    const damage = createPlayerDamageState(preset);

    stats.elapsedSeconds = 120;
    mission.status = 'completed';

    recordTelemetryOnMissionEnd(telemetry, mission, stats, damage);
    recordTelemetryOnMissionEnd(telemetry, mission, stats, damage);

    expect(telemetry.missionsRecorded).toBe(1);
    expect(telemetry.averageMissionSeconds).toBeCloseTo(120, 5);
  });

  it('records death causes on failure', () => {
    const telemetry = createTelemetryState();
    const mission = createMission(2);
    const stats = createMissionStatsState();
    const damage = createPlayerDamageState(preset);

    stats.elapsedSeconds = 42;
    mission.status = 'failed';
    damage.lastDamageCause = 'sam';

    recordTelemetryOnMissionEnd(telemetry, mission, stats, damage);

    expect(telemetry.deaths).toBe(1);
    expect(telemetry.deathCauses.sam).toBe(1);
  });
});
