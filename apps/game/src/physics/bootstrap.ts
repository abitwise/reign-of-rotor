import type { SystemScheduler } from '../core/loop/systemScheduler';
import { createPhysicsStepSystem } from './physicsSystem';
import { loadRapier } from './rapierInstance';
import { createPhysicsWorld, type PhysicsWorldContext } from './world';

export const bootstrapPhysics = async (scheduler: SystemScheduler): Promise<PhysicsWorldContext> => {
  const rapier = await loadRapier();
  const physics = createPhysicsWorld(rapier);

  scheduler.addSystem(createPhysicsStepSystem(physics));

  return physics;
};
