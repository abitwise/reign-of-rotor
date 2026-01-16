import { SystemPhase, type LoopSystem } from '../../core/loop/types';
import type { PlayerHelicopter } from '../helicopterFlight';
import type { TerrainColliderManager } from './terrainColliders';

export const createTerrainStreamingSystem = (
  player: PlayerHelicopter,
  terrain: TerrainColliderManager
): LoopSystem => ({
  id: 'sim.terrainStreaming',
  phase: SystemPhase.PostPhysics,
  step: () => {
    const translation = player.body.translation();
    terrain.update({ x: translation.x, z: translation.z });
  }
});
