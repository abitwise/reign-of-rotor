import { appConfig, type AppConfig } from './config';
import { createRootUi } from '../ui/root';
import { FixedTimestepLoop } from '../core/loop/fixedTimestepLoop';
import { createSystemScheduler, type SystemScheduler } from '../core/loop/systemScheduler';
import { bootstrapPhysics } from '../physics/bootstrap';
import type { PhysicsWorldContext } from '../physics/world';

export type GameApp = {
  config: AppConfig;
  scheduler: SystemScheduler;
  loop: FixedTimestepLoop;
  physics: Promise<PhysicsWorldContext>;
  destroy: () => void;
};

export const createApp = (rootElement: HTMLElement, config: AppConfig = appConfig): GameApp => {
  const rootUi = createRootUi({ target: rootElement, config });
  const scheduler = createSystemScheduler();
  const physics = bootstrapPhysics(scheduler);
  const loop = new FixedTimestepLoop({
    scheduler,
    onFrame: (metrics) => rootUi.setLoopMetrics?.(metrics)
  });

  loop.start();

  return {
    config,
    scheduler,
    physics,
    loop,
    destroy: () => {
      loop.stop();
      rootUi.destroy();
    }
  };
};
