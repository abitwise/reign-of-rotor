import { Quaternion, type AbstractMesh } from '@babylonjs/core';
import type { Entity, Transform } from '../physics/types';

export type TransformProvider = (entity: Entity) => Transform | null;

export type MeshBindingSystemOptions = {
  transformProvider: TransformProvider;
  onMissingTransform?: (entity: Entity) => void;
};

export class MeshBindingSystem {
  private transformProvider: TransformProvider;
  private bindings = new Map<Entity, AbstractMesh>();
  private readonly onMissingTransform?: (entity: Entity) => void;

  constructor(options: MeshBindingSystemOptions) {
    this.transformProvider = options.transformProvider;
    this.onMissingTransform = options.onMissingTransform;
  }

  setTransformProvider(provider: TransformProvider): void {
    this.transformProvider = provider;
  }

  bind(entity: Entity, mesh: AbstractMesh): void {
    if (!mesh.rotationQuaternion) {
      mesh.rotationQuaternion = new Quaternion();
    }

    this.bindings.set(entity, mesh);
  }

  unbind(entity: Entity, dispose = false): void {
    const mesh = this.bindings.get(entity);
    if (mesh && dispose) {
      mesh.dispose();
    }

    this.bindings.delete(entity);
  }

  clear(dispose = false): void {
    if (dispose) {
      this.bindings.forEach((mesh) => mesh.dispose());
    }

    this.bindings.clear();
  }

  updateFromTransforms(): void {
    for (const [entity, mesh] of this.bindings.entries()) {
      const transform = this.transformProvider(entity);

      if (!transform) {
        this.onMissingTransform?.(entity);
        continue;
      }

      mesh.position.set(transform.translation.x, transform.translation.y, transform.translation.z);
      mesh.rotationQuaternion!.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.w
      );
    }
  }
}
