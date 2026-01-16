import {
  Color4,
  Engine,
  HemisphericLight,
  Quaternion,
  Scene,
  UniversalCamera,
  Vector3
} from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import type { Nullable } from '@babylonjs/core/types';
import { MeshBindingSystem, type TransformProvider } from './meshBindingSystem';
import { RenderAssetLoader } from './assets/assetLoader';
import { loadAssetManifest } from './assets/manifest';
import type { Entity } from '../physics/types';
import { CameraRig } from './camera/cameraRig';
import { MouseLookController } from '../core/input/mouseLookController';
import { TerrainChunkManager } from './terrain/terrainChunkManager';
import { PropDressingManager } from './props/propDressingManager';

export type RenderContext = {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
  camera: UniversalCamera;
  cameraRig: CameraRig;
  bindings: MeshBindingSystem;
  assets: RenderAssetLoader;
  terrain: TerrainChunkManager;
  props: PropDressingManager;
  setTransformProvider: (provider: TransformProvider) => void;
  setCameraTarget: (entity: Entity | null) => void;
  setTerrainFocus: (entity: Entity | null) => void;
  setPropDressingFocus: (entity: Entity | null) => void;
  getCameraMode: () => 'cockpit' | 'chase';
  getCameraModeLabel: () => string;
  setCameraMode: (mode: 'cockpit' | 'chase') => void;
  toggleCameraMode: () => void;
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
  scene.collisionsEnabled = false; // Disable scene collision detection

  const camera = new UniversalCamera('cockpitCamera', new Vector3(0, 1.6, -5), scene);
  camera.inputs.clear();
  camera.rotationQuaternion = new Quaternion();
  camera.minZ = 0.05;
  camera.maxZ = 5000;
  camera.fov = 0.94;
  camera.inertia = 0;
  camera.checkCollisions = false;
  camera.applyGravity = false;

  const light = new HemisphericLight('skyLight', new Vector3(0.25, 1, 0.4), scene);
  light.intensity = 0.9;

  const transformReader = transformProvider ?? (() => null);

  const bindings = new MeshBindingSystem({
    transformProvider: transformReader,
    onMissingTransform: (entity) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug?.(`Render binding missing transform for entity ${entity}`);
      }
    }
  });

  const cameraRig = new CameraRig({
    camera,
    transformProvider: transformReader
  });
  const terrain = new TerrainChunkManager({
    scene,
    transformProvider: transformReader
  });
  const props = new PropDressingManager({
    scene,
    transformProvider: transformReader
  });

  const entityMeshes = new Map<Entity, AbstractMesh>();
  let cameraTarget: Entity | null = null;

  const mouseLook = new MouseLookController({
    element: canvas,
    onLook: (yawDelta, pitchDelta) => cameraRig.applyLookDelta(yawDelta, pitchDelta)
  });

  scene.onBeforeRenderObservable.add(() => {
    bindings.updateFromTransforms();
    cameraRig.update(engine.getDeltaTime() / 1000);
    terrain.update();
    props.update();
  });

  const manifest = await loadAssetManifest(manifestUrl);
  const assets = new RenderAssetLoader(scene, manifest);

  // Note: we intentionally do not spawn a "manifest preview" mesh here because
  // the gameplay bootstrap spawns/binds the player helicopter mesh.

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
    terrain,
    props,
    setTransformProvider: (provider: TransformProvider) => {
      bindings.setTransformProvider(provider);
      cameraRig.setTransformProvider(provider);
      terrain.setTransformProvider(provider);
      props.setTransformProvider(provider);
    },
    setCameraTarget: (entity: Entity | null) => {
      cameraTarget = entity;
      cameraRig.setTargetEntity(entity);
      cameraRig.setTargetMesh(entity !== null ? entityMeshes.get(entity) ?? null : null);
    },
    setTerrainFocus: (entity: Entity | null) => {
      terrain.setFocusEntity(entity);
    },
    setPropDressingFocus: (entity: Entity | null) => {
      props.setFocusEntity(entity);
    },
    getCameraMode: () => cameraRig.getMode(),
    getCameraModeLabel: () => (cameraRig.getMode() === 'cockpit' ? 'Cockpit' : 'Chase'),
    setCameraMode: (mode) => cameraRig.setMode(mode),
    toggleCameraMode: () => cameraRig.toggleMode(),
    bindEntityMesh: async (entity: Entity, meshId: string) => {
      const mesh = await assets.instantiateMesh(meshId, `entity-${entity}-${meshId}`);
      bindings.bind(entity, mesh);
      entityMeshes.set(entity, mesh);
      if (cameraTarget === entity) {
        cameraRig.setTargetMesh(mesh);
      }
    },
    dispose: () => {
      scene.onBeforeRenderObservable.clear();
      mouseLook.dispose();
      cameraRig.dispose();
      terrain.dispose();
      props.dispose();
      engine.stopRenderLoop();
      maybeWindow?.removeEventListener('resize', resize);
      scene.dispose();
      engine.dispose();
    }
  };
};
