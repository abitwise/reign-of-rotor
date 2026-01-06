import type { GameState } from './createApp';
import type { PlayerInputState } from '../core/input/playerInput';
import type { SystemScheduler } from '../core/loop/systemScheduler';
import { DEFAULT_HELICOPTER_FLIGHT } from '../content/helicopters';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import {
  createHelicopterFlightSystem,
  createAssistToggleSystem,
  createPauseToggleSystem,
  createGroundPlane,
  spawnPlayerHelicopter,
  type PlayerHelicopter
} from '../sim/helicopterFlight';
import { createAltimeterSystem } from '../sim/altimeter';

export type GameplayContext = {
  player: PlayerHelicopter;
  ground: Entity;
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
  const ground = createGroundPlane(physics);
  const player = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input);

  scheduler.addSystem(createAssistToggleSystem(player));
  scheduler.addSystem(createPauseToggleSystem(input, gameState));
  scheduler.addSystem(createHelicopterFlightSystem(player, gameState));
  scheduler.addSystem(createAltimeterSystem(player, physics));

  return { player, ground };
};
