import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { PlayerInputState } from '../core/input/playerInput';
import type { CountermeasureConfig } from '../content/countermeasures';
import type { PlayerHelicopter } from './helicopterFlight';
import type { GameState } from '../boot/createApp';

export type CountermeasureState = {
  ammoRemaining: number;
  cooldownRemaining: number;
  activeRemaining: number;
  decoyPosition: { x: number; y: number; z: number } | null;
  deployedThisFrame: boolean;
};

export const createCountermeasureState = (config: CountermeasureConfig): CountermeasureState => ({
  ammoRemaining: config.ammo,
  cooldownRemaining: 0,
  activeRemaining: 0,
  decoyPosition: null,
  deployedThisFrame: false
});

export const createCountermeasureSystem = ({
  heli,
  config,
  state,
  gameState,
  input = heli.input
}: {
  heli: PlayerHelicopter;
  config: CountermeasureConfig;
  state: CountermeasureState;
  gameState: GameState;
  input?: PlayerInputState;
}): LoopSystem => ({
  id: `sim.countermeasures.${heli.entity}`,
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    state.deployedThisFrame = false;

    if (gameState.isPaused) {
      return;
    }

    if (state.cooldownRemaining > 0) {
      state.cooldownRemaining = Math.max(0, state.cooldownRemaining - fixedDeltaSeconds);
    }

    if (state.activeRemaining > 0) {
      state.activeRemaining = Math.max(0, state.activeRemaining - fixedDeltaSeconds);
      if (state.activeRemaining <= 0) {
        state.decoyPosition = null;
      }
    }

    if (input.deployCountermeasure && state.cooldownRemaining <= 0 && state.ammoRemaining > 0) {
      const translation = heli.body.translation();
      state.ammoRemaining = Math.max(0, state.ammoRemaining - 1);
      state.cooldownRemaining = config.cooldownSeconds;
      state.activeRemaining = config.decoyActiveSeconds;
      state.decoyPosition = { x: translation.x, y: translation.y, z: translation.z };
      state.deployedThisFrame = true;
    }
  }
});
