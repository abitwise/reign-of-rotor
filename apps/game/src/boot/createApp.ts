import { appConfig, type AppConfig } from './config';
import { createRootUi } from '../ui/root';
import { FixedTimestepLoop } from '../core/loop/fixedTimestepLoop';
import { createSystemScheduler, type SystemScheduler } from '../core/loop/systemScheduler';
import { bootstrapPhysics } from '../physics/bootstrap';
import { createAppLayout } from './layout';
import type { PhysicsWorldContext } from '../physics/world';
import { bootstrapRenderer, type RenderContext } from '../render/bootstrap';
import { bootstrapPlayerInput, type PlayerInputContext } from '../core/input/playerInput';
import { createControlState, createControlStateSystem } from '../core/input/controlState';
import { bootstrapGameplay, type GameplayContext } from './gameplay';
import { createCameraModeToggleSystem } from '../render/camera/cameraModeSystem';
import { CONTROL_TUNING_PRESETS } from '../content/controls';

export type GameState = {
  isPaused: boolean;
};

export type GameApp = {
  config: AppConfig;
  scheduler: SystemScheduler;
  loop: FixedTimestepLoop;
  physics: Promise<PhysicsWorldContext>;
  renderer: Promise<RenderContext>;
  gameplay: Promise<GameplayContext>;
  input: PlayerInputContext;
  controlState: ReturnType<typeof createControlState>;
  gameState: GameState;
  destroy: () => void;
};

export const createApp = (rootElement: HTMLElement, config: AppConfig = appConfig): GameApp => {
  const layout = createAppLayout(rootElement);
  const scheduler = createSystemScheduler();
  const input = bootstrapPlayerInput(
    scheduler,
    rootElement.ownerDocument?.defaultView ?? (typeof window === 'undefined' ? null : window)
  );
  const controlState = createControlState();
  scheduler.addSystem(
    createControlStateSystem({
      input: input.state,
      state: controlState,
      tuning: CONTROL_TUNING_PRESETS.normal
    })
  );
  const gameState: GameState = { isPaused: false };
  const rootUi = createRootUi({ target: layout.uiHost, config, bindings: input.bindings, gameState });
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

  const gameplay = Promise.all([physics, renderer])
    .then(async ([physicsContext, renderContext]) => {
      // Wire up the transform provider now that we have both physics and renderer
      renderContext.setTransformProvider((entity) => physicsContext.getEntityTransform(entity));
      scheduler.addSystem(
        createCameraModeToggleSystem({
          input: input.state,
          onToggle: () => renderContext.toggleCameraMode()
        })
      );

      const gameplayContext = bootstrapGameplay({
        physics: physicsContext,
        scheduler,
        input: input.state,
        controlState,
        gameState
      });

      rootUi.setFlightReadoutProvider?.(() => gameplayContext.player.altimeter);
      rootUi.setAssistsProvider?.(() => gameplayContext.player.assists);
      rootUi.setCameraModeProvider?.(() => renderContext.getCameraModeLabel());

      // Wait for mesh to be loaded before setting camera target
      await renderContext.bindEntityMesh(gameplayContext.player.entity, 'apache-gunship');
      renderContext.setCameraTarget(gameplayContext.player.entity);
      renderContext.setTerrainFocus(gameplayContext.player.entity);
      renderContext.setPropDressingFocus(gameplayContext.player.entity);

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
    controlState,
    loop,
    gameState,
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
