import type { GameState } from './createApp';
import type { PlayerInputState } from '../core/input/playerInput';
import type { ControlState, ControlTuning } from '../core/input/controlState';
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
import { createPropColliderManager } from '../sim/terrain/propColliders';
import { createPropColliderStreamingSystem } from '../sim/terrain/propColliderStreamingSystem';

export type GameplayContext = {
  player: PlayerHelicopter;
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
  const terrain = createTerrainColliderManager(physics);
  terrain.update(spawnPoint);
  const propColliders = createPropColliderManager(physics);
  propColliders.update(spawnPoint);

  scheduler.addSystem(createAssistToggleSystem(player));
  scheduler.addSystem(createPauseToggleSystem(input, gameState));
  scheduler.addSystem(createHelicopterFlightSystem(player, gameState));
  scheduler.addSystem(createAltimeterSystem(player, physics));
  scheduler.addSystem(createTerrainStreamingSystem(player, terrain));
  scheduler.addSystem(createPropColliderStreamingSystem(player, propColliders));

  return { player };
};
