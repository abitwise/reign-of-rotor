import type { GameState } from './createApp';
import type { PlayerInputState } from '../core/input/playerInput';
import type { ControlState, ControlTuning } from '../core/input/controlState';
import type { SystemScheduler } from '../core/loop/systemScheduler';
import { DEFAULT_HELICOPTER_FLIGHT } from '../content/helicopters';
import { DEFAULT_CANNON_CONFIG, DEFAULT_MISSILE_CONFIG } from '../content/weapons';
import { DEFAULT_COUNTERMEASURE_CONFIG } from '../content/countermeasures';
import { WORLD_CONFIG, pickSpawnPoint } from '../content/world';
import {
  DEFAULT_RADAR_CONFIG,
  DEFAULT_SAM_CONFIG,
  DEFAULT_VEHICLE_CONFIG
} from '../content/enemies';
import { createMissionPlan, DEFAULT_CONVOY_VEHICLE_CONFIG } from '../content/missions';
import type { PhysicsWorldContext } from '../physics/world';
import {
  createHelicopterFlightSystem,
  createAssistToggleSystem,
  createPauseToggleSystem,
  spawnPlayerHelicopter,
  type PlayerHelicopter
} from '../sim/helicopterFlight';
import { createAltimeterSystem } from '../sim/altimeter';
import { createCannonState, createCannonSystem, type CannonState } from '../sim/cannon';
import {
  createCountermeasureState,
  createCountermeasureSystem,
  type CountermeasureState
} from '../sim/countermeasures';
import { createMissileState, createMissileSystem, type MissileState } from '../sim/missile';
import { createEnemyState, createEnemySystem, type EnemyState } from '../sim/enemies';
import { createConvoyState, createConvoySystem, spawnConvoy, type ConvoyState } from '../sim/convoy';
import { createTerrainColliderManager } from '../sim/terrain/terrainColliders';
import { createTerrainStreamingSystem } from '../sim/terrain/terrainStreamingSystem';
import { createPropColliderManager } from '../sim/terrain/propColliders';
import { createPropColliderStreamingSystem } from '../sim/terrain/propColliderStreamingSystem';
import {
  createMissionRuntime,
  createMissionSystem,
  spawnMissionEnemies,
  type MissionRuntime
} from '../sim/missionDirector';
import {
  createMissionStatsState,
  createMissionStatsSystem,
  type MissionStatsState
} from '../sim/missionStats';

export type GameplayContext = {
  player: PlayerHelicopter;
  cannon: CannonState;
  cannonConfig: typeof DEFAULT_CANNON_CONFIG;
  countermeasures: CountermeasureState;
  countermeasureConfig: typeof DEFAULT_COUNTERMEASURE_CONFIG;
  missiles: MissileState;
  missileConfig: typeof DEFAULT_MISSILE_CONFIG;
  enemies: EnemyState;
  convoy: ConvoyState;
  mission: MissionRuntime;
  missionStats: MissionStatsState;
};

export const bootstrapGameplay = ({
  physics,
  scheduler,
  input,
  controlState,
  controlTuning,
  gameState
}: {
  physics: PhysicsWorldContext;
  scheduler: SystemScheduler;
  input: PlayerInputState;
  controlState: ControlState;
  controlTuning: ControlTuning;
  gameState: GameState;
}): GameplayContext => {
  const spawnPoint = pickSpawnPoint(WORLD_CONFIG);
  const missionSeed = Math.floor(Math.random() * 1_000_000_000);
  const missionPlan = createMissionPlan({ seed: missionSeed, playerSpawn: spawnPoint });
  const player = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState, {
    startPosition: { x: spawnPoint.x, y: 0.8, z: spawnPoint.z },
    yawRateTuning: controlTuning.yawRate
  });
  const cannonConfig = DEFAULT_CANNON_CONFIG;
  const cannon = createCannonState(cannonConfig);
  const countermeasureConfig = DEFAULT_COUNTERMEASURE_CONFIG;
  const countermeasures = createCountermeasureState(countermeasureConfig);
  const missileConfig = DEFAULT_MISSILE_CONFIG;
  const missiles = createMissileState(missileConfig);
  const enemies = createEnemyState();
  const missionTargets = spawnMissionEnemies({
    state: enemies,
    physics,
    plan: missionPlan,
    configs: {
      radar: DEFAULT_RADAR_CONFIG,
      sam: DEFAULT_SAM_CONFIG,
      vehicle: DEFAULT_VEHICLE_CONFIG
    }
  });
  const convoy = createConvoyState();
  if (missionPlan.convoyPlan) {
    spawnConvoy(convoy, physics, DEFAULT_CONVOY_VEHICLE_CONFIG, missionPlan.convoyPlan);
  }
  const mission = createMissionRuntime({
    seed: missionPlan.seed,
    templateId: missionPlan.template.id,
    templateName: missionPlan.template.name,
    summary: missionPlan.template.summary,
    objectives: missionPlan.template.objectives,
    targetsByType: missionTargets.targetsByType,
    navigationTarget: missionPlan.primaryWaypoint
      ? {
          label: missionPlan.primaryWaypoint.label,
          position: missionPlan.primaryWaypoint.position
        }
      : null
  });
  const missionStats = createMissionStatsState();
  const terrain = createTerrainColliderManager(physics);
  terrain.update(spawnPoint);
  const propColliders = createPropColliderManager(physics);
  propColliders.update(spawnPoint);

  scheduler.addSystem(createAssistToggleSystem(player));
  scheduler.addSystem(createPauseToggleSystem(input, gameState));
  scheduler.addSystem(createHelicopterFlightSystem(player, gameState));
  scheduler.addSystem(createAltimeterSystem(player, physics));
  scheduler.addSystem(
    createCountermeasureSystem({
      heli: player,
      config: countermeasureConfig,
      state: countermeasures,
      gameState
    })
  );
  scheduler.addSystem(
    createCannonSystem({
      heli: player,
      physics,
      config: cannonConfig,
      state: cannon,
      gameState
    })
  );
  scheduler.addSystem(
    createMissileSystem({
      heli: player,
      physics,
      config: missileConfig,
      state: missiles,
      gameState,
      targets: () => enemies.targets
    })
  );
  scheduler.addSystem(
    createEnemySystem({
      physics,
      state: enemies,
      target: { entity: player.entity, body: player.body },
      cannon,
      missiles,
      gameState,
      countermeasures,
      countermeasureConfig
    })
  );
  scheduler.addSystem(
    createConvoySystem({
      state: convoy,
      gameState
    })
  );
  scheduler.addSystem(
    createMissionSystem({
      mission,
      enemies,
      convoy,
      input,
      gameState
    })
  );
  scheduler.addSystem(
    createMissionStatsSystem({
      stats: missionStats,
      mission,
      enemies,
      cannon,
      missiles,
      gameState
    })
  );
  scheduler.addSystem(createTerrainStreamingSystem(player, terrain));
  scheduler.addSystem(createPropColliderStreamingSystem(player, propColliders));

  return {
    player,
    cannon,
    cannonConfig,
    countermeasures,
    countermeasureConfig,
    missiles,
    missileConfig,
    enemies,
    convoy,
    mission,
    missionStats
  };
};
