import type { GameState } from './createApp';
import type { PlayerInputState } from '../core/input/playerInput';
import type { SystemScheduler } from '../core/loop/systemScheduler';
import { DEFAULT_HELICOPTER_FLIGHT } from '../content/helicopters';
import { WORLD_CONFIG, pickSpawnPoint } from '../content/world';
import type { PhysicsWorldContext } from '../physics/world';
import {
  createHelicopterFlightSystem,
  createAssistToggleSystem,
  createPauseToggleSystem,
  spawnPlayerHelicopter,
  type PlayerHelicopter
} from '../sim/helicopterFlight';
import { createAltimeterSystem } from '../sim/altimeter';
import { createTerrainColliderManager } from '../sim/terrain/terrainColliders';
import { createTerrainStreamingSystem } from '../sim/terrain/terrainStreamingSystem';

export type GameplayContext = {
  player: PlayerHelicopter;
};

export const bootstrapGameplay = ({
  physics,
  scheduler,
  input,
  gameState
}: {
  physics: PhysicsWorldContext;
  scheduler: SystemScheduler;
  input: PlayerInputState;
  gameState: GameState;
}): GameplayContext => {
  const spawnPoint = pickSpawnPoint(WORLD_CONFIG);
  const player = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, {
    startPosition: { x: spawnPoint.x, y: 0.8, z: spawnPoint.z }
  });
  const terrain = createTerrainColliderManager(physics);
  terrain.update(spawnPoint);

  scheduler.addSystem(createAssistToggleSystem(player));
  scheduler.addSystem(createPauseToggleSystem(input, gameState));
  scheduler.addSystem(createHelicopterFlightSystem(player, gameState));
  scheduler.addSystem(createAltimeterSystem(player, physics));
  scheduler.addSystem(createTerrainStreamingSystem(player, terrain));

  return { player };
};
