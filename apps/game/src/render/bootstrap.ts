import {
  ArcRotateCamera,
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3
} from '@babylonjs/core';
import type { Nullable } from '@babylonjs/core/types';
import { MeshBindingSystem, type TransformProvider } from './meshBindingSystem';
import { RenderAssetLoader } from './assets/assetLoader';
import { loadAssetManifest } from './assets/manifest';
import type { Entity } from '../physics/types';

export type RenderContext = {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
  camera: ArcRotateCamera;
  bindings: MeshBindingSystem;
  assets: RenderAssetLoader;
  bindEntityMesh: (entity: Entity, meshId: string) => Promise<void>;
  dispose: () => void;
};

export type RenderBootstrapOptions = {
  host: HTMLElement;
  manifestUrl?: string;
  canvas?: HTMLCanvasElement;
  transformProvider?: TransformProvider;
  engine?: Engine;
};

const DEFAULT_CLEAR_COLOR = new Color4(0.07, 0.09, 0.12, 1);

export const bootstrapRenderer = async ({
  host,
  manifestUrl = '/assets/manifest.json',
  canvas: providedCanvas,
  transformProvider,
  engine: providedEngine
}: RenderBootstrapOptions): Promise<RenderContext> => {
  const canvas = providedCanvas ?? document.createElement('canvas');
  canvas.className = 'render-canvas';

  if (!providedCanvas) {
    host.appendChild(canvas);
  }

  const engine =
    providedEngine ??
    new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);

  const scene = new Scene(engine);
  scene.clearColor = DEFAULT_CLEAR_COLOR;

  const camera = new ArcRotateCamera(
    'bootstrapCamera',
    -Math.PI / 2,
    Math.PI / 2.6,
    18,
    new Vector3(0, 3, 0),
    scene
  );
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 160;
  camera.minZ = 0.1;
  camera.wheelPrecision = 45;
  camera.attachControl(canvas, true);

  const light = new HemisphericLight('skyLight', new Vector3(0.25, 1, 0.4), scene);
  light.intensity = 0.9;

  MeshBuilder.CreateGround(
    'ground',
    { width: 96, height: 96, subdivisions: 2 },
    scene
  ).receiveShadows = true;

  const bindings = new MeshBindingSystem({
    transformProvider: transformProvider ?? (() => null),
    onMissingTransform: (entity) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug?.(`Render binding missing transform for entity ${entity}`);
      }
    }
  });

  scene.onBeforeRenderObservable.add(() => bindings.updateFromTransforms());

  const manifest = await loadAssetManifest(manifestUrl);
  const assets = new RenderAssetLoader(scene, manifest);

  if (manifest.assets.length > 0) {
    assets
      .instantiateMesh(manifest.assets[0].id, 'manifest-preview')
      .then((mesh) => {
        mesh.position.y = 1.2;
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to instantiate preview mesh from manifest', error);
        }
      });
  }

  const resize = (): void => {
    engine.resize();
  };

  const maybeWindow: Nullable<Window> =
    typeof window === 'undefined' ? null : window;

  maybeWindow?.addEventListener('resize', resize);

  engine.runRenderLoop(() => {
    scene.render();
  });

  return {
    engine,
    scene,
    canvas,
    camera,
    bindings,
    assets,
    bindEntityMesh: async (entity: Entity, meshId: string) => {
      const mesh = await assets.instantiateMesh(meshId, `entity-${entity}-${meshId}`);
      bindings.bind(entity, mesh);
    },
    dispose: () => {
      scene.onBeforeRenderObservable.clear();
      engine.stopRenderLoop();
      maybeWindow?.removeEventListener('resize', resize);
      scene.dispose();
      engine.dispose();
    }
  };
};
