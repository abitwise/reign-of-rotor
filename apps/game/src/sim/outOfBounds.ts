import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { GameState } from '../boot/createApp';
import type { MissionRuntime } from './missionDirector';
import type { PlayerHelicopter } from './helicopterFlight';
import type { MissionBounds, MissionBoundsConfig } from '../content/missions';

export type OutOfBoundsState = {
  active: boolean;
  secondsRemaining: number | null;
  remainingSeconds: number;
};

export const createOutOfBoundsState = (config: MissionBoundsConfig): OutOfBoundsState => ({
  active: false,
  secondsRemaining: null,
  remainingSeconds: Math.max(0, config.warningSeconds)
});

export const isWithinMissionBounds = (
  bounds: MissionBounds,
  position: { x: number; z: number }
): boolean => {
  if (bounds.type === 'rect') {
    const dx = Math.abs(position.x - bounds.center.x);
    const dz = Math.abs(position.z - bounds.center.z);
    return dx <= bounds.halfWidth && dz <= bounds.halfDepth;
  }

  const dx = position.x - bounds.center.x;
  const dz = position.z - bounds.center.z;
  return dx * dx + dz * dz <= bounds.radius * bounds.radius;
};

export const updateOutOfBoundsState = ({
  state,
  bounds,
  config,
  position,
  deltaSeconds
}: {
  state: OutOfBoundsState;
  bounds: MissionBounds;
  config: MissionBoundsConfig;
  position: { x: number; z: number };
  deltaSeconds: number;
}): boolean => {
  if (isWithinMissionBounds(bounds, position)) {
    state.active = false;
    state.secondsRemaining = null;
    state.remainingSeconds = Math.max(0, config.warningSeconds);
    return false;
  }

  const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
  state.active = true;
  state.remainingSeconds = Math.max(0, state.remainingSeconds - delta);
  state.secondsRemaining = state.remainingSeconds;
  return state.remainingSeconds <= 0;
};

export const createOutOfBoundsSystem = ({
  state,
  bounds,
  config,
  mission,
  player,
  gameState
}: {
  state: OutOfBoundsState;
  bounds: MissionBounds;
  config: MissionBoundsConfig;
  mission: MissionRuntime;
  player: PlayerHelicopter;
  gameState: GameState;
}): LoopSystem => ({
  id: `sim.outOfBounds.${player.entity}`,
  phase: SystemPhase.PostPhysics,
  step: ({ fixedDeltaSeconds }) => {
    if (gameState.isPaused || mission.status !== 'active') {
      return;
    }

    const position = player.body.translation();
    const expired = updateOutOfBoundsState({
      state,
      bounds,
      config,
      position: { x: position.x, z: position.z },
      deltaSeconds: fixedDeltaSeconds
    });

    if (expired && mission.status === 'active') {
      mission.status = 'failed';
      mission.completion.available = false;
      mission.completion.promptActive = false;
    }
  }
});
