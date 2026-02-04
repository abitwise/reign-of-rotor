import type { GameState } from './createApp';
import type { PlayerInputState } from '../core/input/playerInput';
import type { ControlState, ControlTuning } from '../core/input/controlState';
import type { SystemScheduler } from '../core/loop/systemScheduler';
import { DEFAULT_HELICOPTER_FLIGHT } from '../content/helicopters';
import { DEFAULT_CANNON_CONFIG, DEFAULT_MISSILE_CONFIG } from '../content/weapons';
import { WORLD_CONFIG, pickSpawnPoint } from '../content/world';
import {
  DEFAULT_RADAR_CONFIG,
  DEFAULT_SAM_CONFIG,
  DEFAULT_VEHICLE_CONFIG,
  buildEnemySpawns
} from '../content/enemies';
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
import { createMissileState, createMissileSystem, type MissileState } from '../sim/missile';
import { createEnemyState, createEnemySystem, spawnEnemiesFromConfig, type EnemyState } from '../sim/enemies';
import { createTerrainColliderManager } from '../sim/terrain/terrainColliders';
import { createTerrainStreamingSystem } from '../sim/terrain/terrainStreamingSystem';
import { createPropColliderManager } from '../sim/terrain/propColliders';
import { createPropColliderStreamingSystem } from '../sim/terrain/propColliderStreamingSystem';

export type GameplayContext = {
  player: PlayerHelicopter;
  cannon: CannonState;
  cannonConfig: typeof DEFAULT_CANNON_CONFIG;
  missiles: MissileState;
  missileConfig: typeof DEFAULT_MISSILE_CONFIG;
  enemies: EnemyState;
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
  const player = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState, {
    startPosition: { x: spawnPoint.x, y: 0.8, z: spawnPoint.z },
    yawRateTuning: controlTuning.yawRate
  });
  const cannonConfig = DEFAULT_CANNON_CONFIG;
  const cannon = createCannonState(cannonConfig);
  const missileConfig = DEFAULT_MISSILE_CONFIG;
  const missiles = createMissileState(missileConfig);
  const enemies = createEnemyState();
  const enemySpawns = buildEnemySpawns(spawnPoint);
  spawnEnemiesFromConfig(enemies, physics, enemySpawns, {
    radar: DEFAULT_RADAR_CONFIG,
    sam: DEFAULT_SAM_CONFIG,
    vehicle: DEFAULT_VEHICLE_CONFIG
  });
  const terrain = createTerrainColliderManager(physics);
  terrain.update(spawnPoint);
  const propColliders = createPropColliderManager(physics);
  propColliders.update(spawnPoint);

  scheduler.addSystem(createAssistToggleSystem(player));
  scheduler.addSystem(createPauseToggleSystem(input, gameState));
  scheduler.addSystem(createHelicopterFlightSystem(player, gameState));
  scheduler.addSystem(createAltimeterSystem(player, physics));
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
      gameState
    })
  );
  scheduler.addSystem(createTerrainStreamingSystem(player, terrain));
  scheduler.addSystem(createPropColliderStreamingSystem(player, propColliders));

  return { player, cannon, cannonConfig, missiles, missileConfig, enemies };
};
