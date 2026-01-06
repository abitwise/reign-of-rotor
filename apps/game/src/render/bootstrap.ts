import {
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
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
  scene.collisionsEnabled = false; // Disable scene collision detection

  const camera = new UniversalCamera('cockpitCamera', new Vector3(0, 1.6, -5), scene);
  camera.inputs.clear();
  camera.rotationQuaternion = new Quaternion();
  camera.minZ = 0.05;
  camera.maxZ = 5000;
  camera.fov = 0.94;
  camera.inertia = 0;
  camera.checkCollisions = false;

  const light = new HemisphericLight('skyLight', new Vector3(0.25, 1, 0.4), scene);
  light.intensity = 0.9;

  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: 96, height: 96, subdivisions: 32 },
    scene
  );
  ground.receiveShadows = true;
  
  // Create a grid material for visual reference
  const groundMaterial = new StandardMaterial('groundMaterial', scene);
  groundMaterial.diffuseColor = new Color3(0.15, 0.18, 0.2);
  groundMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
  groundMaterial.emissiveColor = new Color3(0.02, 0.025, 0.03);
  
  // Create a procedural grid texture
  const gridTexture = new DynamicTexture('gridTexture', 512, scene, false);
  const ctx = gridTexture.getContext();
  ctx.fillStyle = '#1a2028';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#2a3540';
  ctx.lineWidth = 2;
  
  // Draw grid lines
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  
  gridTexture.update();
  groundMaterial.diffuseTexture = gridTexture;
  groundMaterial.diffuseTexture.uScale = 12;
  groundMaterial.diffuseTexture.vScale = 12;
  ground.material = groundMaterial;
  
  // Add reference objects (buildings/markers)
  const markerMaterial = new StandardMaterial('markerMaterial', scene);
  markerMaterial.diffuseColor = new Color3(0.6, 0.4, 0.2);
  markerMaterial.emissiveColor = new Color3(0.1, 0.07, 0.04);
  
  // Create a few reference cubes at different positions
  const markerPositions = [
    { x: 0, z: 20 },
    { x: 15, z: 15 },
    { x: -15, z: 15 },
    { x: 20, z: 0 },
    { x: -20, z: 0 },
    { x: 15, z: -15 },
    { x: -15, z: -15 },
    { x: 0, z: -20 }
  ];
  
  markerPositions.forEach((pos, i) => {
    const height = 2 + (i % 3) * 1.5;
    const marker = MeshBuilder.CreateBox(
      `marker${i}`,
      { width: 2, height, depth: 2 },
      scene
    );
    marker.position.set(pos.x, height / 2, pos.z);
    marker.material = markerMaterial;
  });

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
