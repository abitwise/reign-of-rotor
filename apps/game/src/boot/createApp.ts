import { appConfig, type AppConfig } from './config';
import { createRootUi } from '../ui/root';
import { FixedTimestepLoop } from '../core/loop/fixedTimestepLoop';
import { createSystemScheduler, type SystemScheduler } from '../core/loop/systemScheduler';
import { bootstrapPhysics } from '../physics/bootstrap';
import { createAppLayout } from './layout';
import type { PhysicsWorldContext } from '../physics/world';
import { bootstrapRenderer, type RenderContext } from '../render/bootstrap';
import { bootstrapPlayerInput, type PlayerInputContext } from '../core/input/playerInput';
import { bootstrapGameplay, type GameplayContext } from './gameplay';

export type GameApp = {
  config: AppConfig;
  scheduler: SystemScheduler;
  loop: FixedTimestepLoop;
  physics: Promise<PhysicsWorldContext>;
  renderer: Promise<RenderContext>;
  gameplay: Promise<GameplayContext>;
  input: PlayerInputContext;
  destroy: () => void;
};

export const createApp = (rootElement: HTMLElement, config: AppConfig = appConfig): GameApp => {
  const layout = createAppLayout(rootElement);
  const scheduler = createSystemScheduler();
  const input = bootstrapPlayerInput(
    scheduler,
    rootElement.ownerDocument?.defaultView ?? (typeof window === 'undefined' ? null : window)
  );
  const rootUi = createRootUi({ target: layout.uiHost, config, bindings: input.bindings });
  const physics = bootstrapPhysics(scheduler);
  const renderer = bootstrapRenderer({
    host: layout.renderHost,
    transformProvider: () => null
  }).catch((error) => {
    console.error('Renderer failed to bootstrap', error);
    throw error;
  });
  const loop = new FixedTimestepLoop({
    scheduler,
    onFrame: (metrics) => rootUi.setLoopMetrics?.(metrics)
  });

  physics
    .then((context) =>
      renderer.then((renderContext) =>
        renderContext.setTransformProvider((entity) => context.getEntityTransform(entity))
      )
    )
    .catch((error) => {
      console.error('Failed to wire renderer to physics transforms', error);
    });

  const gameplay = physics
    .then(async (context) => {
      const gameplayContext = bootstrapGameplay({
        physics: context,
        scheduler,
        input: input.state
      });

      rootUi.setFlightReadoutProvider?.(() => gameplayContext.player.altimeter);

      const renderContext = await renderer;
      renderContext.bindEntityMesh(gameplayContext.player.entity, 'apache-gunship');
      renderContext.setCameraTarget(gameplayContext.player.entity);

      return gameplayContext;
    })
    .catch((error) => {
      console.error('Failed to bootstrap gameplay', error);
      throw error;
    });

  // Wait for gameplay to be ready before starting the loop
  gameplay.then(() => {
    loop.start();
  }).catch((error) => {
    console.error('Failed to start game loop', error);
  });

  return {
    config,
    scheduler,
    physics,
    renderer,
    gameplay,
    input,
    loop,
    destroy: () => {
      loop.stop();
      input.destroy();
      rootUi.destroy();
      renderer.then((renderContext) => renderContext.dispose()).catch((error) => {
        console.error('Error disposing renderer', error);
      });
      layout.destroy();
    }
  };
};
