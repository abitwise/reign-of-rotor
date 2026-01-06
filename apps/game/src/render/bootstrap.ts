import {
  Color4,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Quaternion,
  Scene,
  UniversalCamera,
  Vector3
} from '@babylonjs/core';
import type { Nullable } from '@babylonjs/core/types';
import { MeshBindingSystem, type TransformProvider } from './meshBindingSystem';
import { RenderAssetLoader } from './assets/assetLoader';
import { loadAssetManifest } from './assets/manifest';
import type { Entity } from '../physics/types';
import { CockpitCameraRig } from './camera/cockpitRig';
import { MouseLookController } from '../core/input/mouseLookController';

export type RenderContext = {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
  camera: UniversalCamera;
  cameraRig: CockpitCameraRig;
  bindings: MeshBindingSystem;
  assets: RenderAssetLoader;
  setTransformProvider: (provider: TransformProvider) => void;
  setCameraTarget: (entity: Entity | null) => void;
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

  const camera = new UniversalCamera('cockpitCamera', new Vector3(0, 1.6, -5), scene);
  camera.inputs.clear();
  camera.rotationQuaternion = new Quaternion();
  camera.minZ = 0.05;
  camera.maxZ = 5000;
  camera.fov = 0.94;

  const light = new HemisphericLight('skyLight', new Vector3(0.25, 1, 0.4), scene);
  light.intensity = 0.9;

  MeshBuilder.CreateGround(
    'ground',
    { width: 96, height: 96, subdivisions: 2 },
    scene
  ).receiveShadows = true;

  const transformReader = transformProvider ?? (() => null);

  const bindings = new MeshBindingSystem({
    transformProvider: transformReader,
    onMissingTransform: (entity) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug?.(`Render binding missing transform for entity ${entity}`);
      }
    }
  });

  const cameraRig = new CockpitCameraRig({
    camera,
    transformProvider: transformReader
  });

  const mouseLook = new MouseLookController({
    element: canvas,
    onLook: (yawDelta, pitchDelta) => cameraRig.applyLookDelta(yawDelta, pitchDelta)
  });

  scene.onBeforeRenderObservable.add(() => {
    bindings.updateFromTransforms();
    cameraRig.update(engine.getDeltaTime() / 1000);
  });

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
    cameraRig,
    bindings,
    assets,
    setTransformProvider: (provider: TransformProvider) => {
      bindings.setTransformProvider(provider);
      cameraRig.setTransformProvider(provider);
    },
    setCameraTarget: (entity: Entity | null) => cameraRig.setTargetEntity(entity),
    bindEntityMesh: async (entity: Entity, meshId: string) => {
      const mesh = await assets.instantiateMesh(meshId, `entity-${entity}-${meshId}`);
      bindings.bind(entity, mesh);
    },
    dispose: () => {
      scene.onBeforeRenderObservable.clear();
      mouseLook.dispose();
      cameraRig.dispose();
      engine.stopRenderLoop();
      maybeWindow?.removeEventListener('resize', resize);
      scene.dispose();
      engine.dispose();
    }
  };
};
