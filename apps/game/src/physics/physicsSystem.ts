import type { LoopSystem } from '../core/loop/types';
import { SystemPhase } from '../core/loop/types';
import type { PhysicsWorldContext } from './world';

export const createPhysicsStepSystem = (context: PhysicsWorldContext): LoopSystem => ({
  id: 'physics.stepWorld',
  phase: SystemPhase.Physics,
  step: ({ fixedDeltaSeconds }) => {
    context.step(fixedDeltaSeconds);
  }
});
