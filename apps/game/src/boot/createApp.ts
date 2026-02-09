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
import {
  buildAvionicsReadout,
  buildCombatReadout,
  buildDebriefReadout,
  buildNavigationReadout,
  buildThreatReadout,
  buildMissionReadout
} from '../ui/hudReadouts';
import { DEFAULT_DIFFICULTY_PRESET, type DifficultyPreset } from '../content/difficulty';
import { Vector3, Quaternion } from '@babylonjs/core';
import { EnemyVisualManager } from '../render/visuals/enemyVisualManager';
import { MissileVisualManager } from '../render/visuals/missileVisualManager';
import { WeaponVfxManager } from '../render/visuals/weaponVfxManager';
import { HudMarkerManager } from '../render/visuals/hudMarkerManager';

export type GameState = {
  isPaused: boolean;
  difficultyPreset: DifficultyPreset;
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
  const gameState: GameState = { isPaused: false, difficultyPreset: DEFAULT_DIFFICULTY_PRESET };
  const rootUi = createRootUi({
    target: layout.uiHost,
    config,
    bindings: input.bindings,
    gameState
  });
  rootUi.setTrimStateProvider?.(() => controlState.trim);
  rootUi.setControlStateProvider?.(() => controlState);
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

  const visualManagerDisposers: Array<() => void> = [];

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
        controlTuning: CONTROL_TUNING_PRESETS.normal,
        gameState
      });

      rootUi.setAvionicsReadoutProvider?.(() => buildAvionicsReadout(gameplayContext.player));
      rootUi.setAssistsProvider?.(() => gameplayContext.player.assists);
      rootUi.setCameraModeProvider?.(() => renderContext.getCameraModeLabel());
      rootUi.setNavigationReadoutProvider?.(() =>
        buildNavigationReadout(gameplayContext.player, gameplayContext.mission.navigationTarget)
      );
      rootUi.setMissionReadoutProvider?.(() => buildMissionReadout(gameplayContext.mission));
      rootUi.setDebriefReadoutProvider?.(() =>
        buildDebriefReadout(gameplayContext.mission, gameplayContext.missionStats)
      );
      rootUi.setCombatReadoutProvider?.(() =>
        buildCombatReadout(
          gameplayContext.cannon,
          gameplayContext.cannonConfig,
          gameplayContext.missiles,
          gameplayContext.missileConfig,
          gameplayContext.countermeasures
        )
      );
      rootUi.setThreatReadoutProvider?.(() =>
        buildThreatReadout(gameplayContext.enemies, gameplayContext.player)
      );
      rootUi.setOutOfBoundsProvider?.(() => ({
        active: gameplayContext.outOfBounds.active,
        remainingSeconds: gameplayContext.outOfBounds.remainingSeconds
      }));
      const perfMetrics = { entityCount: 0 };
      rootUi.setPerfMetricsProvider?.(() => {
        perfMetrics.entityCount = countTrackedEntities(gameplayContext);
        return perfMetrics;
      });

      // Wait for mesh to be loaded before setting camera target
      await renderContext.bindEntityMesh(gameplayContext.player.entity, 'apache-gunship');
      renderContext.setCameraTarget(gameplayContext.player.entity);
      renderContext.setTerrainFocus(gameplayContext.player.entity);
      renderContext.setPropDressingFocus(gameplayContext.player.entity);

      // Visual managers for enemies, missiles, weapon VFX, and HUD markers
      const transformProvider = (entity: number) => physicsContext.getEntityTransform(entity);
      const enemyVisuals = new EnemyVisualManager(renderContext.scene);
      const missileVisuals = new MissileVisualManager(renderContext.scene);
      const weaponVfx = new WeaponVfxManager(renderContext.scene);
      const hudMarkers = new HudMarkerManager(layout.uiHost, 32);

      visualManagerDisposers.push(
        () => enemyVisuals.dispose(),
        () => missileVisuals.dispose(),
        () => weaponVfx.dispose(),
        () => hudMarkers.dispose()
      );

      const gunOffset = new Vector3(0, -0.1, 2.1);
      const gunOriginScratch = new Vector3();
      const rotQuat = new Quaternion();

      renderContext.scene.onBeforeRenderObservable.add(() => {
        enemyVisuals.update(gameplayContext.enemies, transformProvider);

        missileVisuals.update(
          gameplayContext.missiles.missiles,
          gameplayContext.enemies.samMissiles,
          gameplayContext.missiles.missileMap,
          gameplayContext.enemies.samMissileMap,
          transformProvider
        );

        // Compute gun origin from player helicopter transform
        const heliTransform = transformProvider(gameplayContext.player.entity);
        if (heliTransform) {
          rotQuat.set(
            heliTransform.rotation.x,
            heliTransform.rotation.y,
            heliTransform.rotation.z,
            heliTransform.rotation.w
          );
          const rotated = gunOffset.clone();
          rotated.rotateByQuaternionToRef(rotQuat, rotated);
          gunOriginScratch.set(
            heliTransform.translation.x + rotated.x,
            heliTransform.translation.y + rotated.y,
            heliTransform.translation.z + rotated.z
          );
        }
        weaponVfx.processCannonImpacts(gameplayContext.cannon.impactEvents, gunOriginScratch);

        const allExplosions = [
          ...gameplayContext.enemies.explosionEvents,
          ...gameplayContext.missiles.explosionEvents
        ];
        weaponVfx.processExplosions(allExplosions);

        hudMarkers.update(
          gameplayContext.enemies.units,
          renderContext.camera,
          renderContext.engine
        );
      });

      return gameplayContext;
    })
    .catch((error) => {
      console.error('Failed to bootstrap gameplay', error);
      throw error;
    });

  // Wait for gameplay to be ready before starting the loop
  gameplay
    .then(() => {
      loop.start();
    })
    .catch((error) => {
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
      for (const disposer of visualManagerDisposers) {
        disposer();
      }
      renderer
        .then((renderContext) => renderContext.dispose())
        .catch((error) => {
          console.error('Error disposing renderer', error);
        });
      layout.destroy();
    }
  };
};

const countTrackedEntities = (context: GameplayContext): number => {
  return (
    1 +
    context.enemies.units.length +
    context.enemies.samMissiles.length +
    context.missiles.missiles.length +
    context.convoy.vehicles.length
  );
};
