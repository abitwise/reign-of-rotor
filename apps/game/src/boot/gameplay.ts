import type { PlayerInputState } from '../core/input/playerInput';
import type { SystemScheduler } from '../core/loop/systemScheduler';
import { DEFAULT_HELICOPTER_FLIGHT } from '../content/helicopters';
import type { Entity } from '../physics/types';
import type { PhysicsWorldContext } from '../physics/world';
import {
  createHelicopterFlightSystem,
  createGroundPlane,
  spawnPlayerHelicopter,
  type PlayerHelicopter
} from '../sim/helicopterFlight';

export type GameplayContext = {
  player: PlayerHelicopter;
  ground: Entity;
};

export const bootstrapGameplay = ({
  physics,
  scheduler,
  input
}: {
  physics: PhysicsWorldContext;
  scheduler: SystemScheduler;
  input: PlayerInputState;
}): GameplayContext => {
  const ground = createGroundPlane(physics);
  const player = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input);

  scheduler.addSystem(createHelicopterFlightSystem(player));

  return { player, ground };
};
