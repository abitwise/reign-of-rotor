import { SystemPhase, type LoopSystem } from '../../core/loop/types';
import type { PlayerHelicopter } from '../helicopterFlight';
import type { PropColliderManager } from './propColliders';

export const createPropColliderStreamingSystem = (
  player: PlayerHelicopter,
  colliders: PropColliderManager
): LoopSystem => ({
  id: 'sim.propColliderStreaming',
  phase: SystemPhase.PostPhysics,
  step: () => {
    const translation = player.body.translation();
    colliders.update({ x: translation.x, z: translation.z });
  }
});
