import {
  Color3,
  MeshBuilder,
  Quaternion,
  SceneLoader,
  StandardMaterial
} from '@babylonjs/core';
import type { AssetContainer, AbstractMesh, Scene } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { AssetManifest, AssetManifestEntry } from './manifest';

export class RenderAssetLoader {
  private readonly scene: Scene;
  private readonly manifest: AssetManifest;
  private readonly cache = new Map<string, AssetContainer>();

  constructor(scene: Scene, manifest: AssetManifest) {
    this.scene = scene;
    this.manifest = manifest;
  }

  async instantiateMesh(meshId: string, name?: string): Promise<AbstractMesh> {
    try {
      const container = await this.loadContainer(meshId);
      const sourceMesh =
        container.meshes.find((mesh) => mesh.name !== '__root__') ?? container.meshes[0];

      if (!sourceMesh) {
        throw new Error(`Asset "${meshId}" did not contain any meshes.`);
      }

      const clone = sourceMesh.clone(name ?? `${meshId}-mesh`, null, false);

      if (!clone) {
        throw new Error(`Unable to clone mesh for asset "${meshId}".`);
      }

      if (!clone.rotationQuaternion) {
        clone.rotationQuaternion = new Quaternion();
      }

      return clone;
    } catch (error) {
      console.warn(`Falling back to placeholder mesh for asset "${meshId}".`, error);
      return this.createPlaceholderMesh(meshId, name);
    }
  }

  private async loadContainer(meshId: string): Promise<AssetContainer> {
    const cached = this.cache.get(meshId);
    if (cached) {
      return cached;
    }

    const entry = this.findEntry(meshId);
    if (!entry) {
      throw new Error(`Mesh id "${meshId}" not found in manifest.`);
    }

    const primaryLod = entry.lods.find((lod) => lod.level === 0);
    if (!primaryLod) {
      throw new Error(`No LOD0 found for mesh "${meshId}" in manifest entry.`);
    }
    const { rootUrl, fileName } = splitPath(primaryLod.path);
    const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, fileName, this.scene);

    this.cache.set(meshId, container);
    return container;
  }

  private findEntry(meshId: string): AssetManifestEntry | undefined {
    return this.manifest.assets.find((asset) => asset.id === meshId);
  }

  private createPlaceholderMesh(meshId: string, name?: string): AbstractMesh {
    const mesh = MeshBuilder.CreateBox(name ?? `${meshId}-missing`, { size: 1 }, this.scene);
    mesh.rotationQuaternion = new Quaternion();

    const material = new StandardMaterial(`${meshId}-missing-material`, this.scene);
    material.diffuseColor = new Color3(0.85, 0.35, 0.35);
    material.emissiveColor = new Color3(0.35, 0.05, 0.05);
    mesh.material = material;

    return mesh;
  }
}

const splitPath = (fullPath: string): { rootUrl: string; fileName: string } => {
  const normalized = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
  const parts = normalized.split('/');
  const fileName = parts.pop() ?? '';
  const rootUrl = parts.join('/') + '/';

  return { rootUrl, fileName };
};
