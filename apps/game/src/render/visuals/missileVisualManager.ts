import {
  Color3,
  Color4,
  MeshBuilder,
  ParticleSystem,
  Quaternion,
  StandardMaterial,
  Texture,
  Vector3
} from '@babylonjs/core';
import type { Mesh, Scene } from '@babylonjs/core';
import type { Entity } from '@/physics/types';
import type { TransformProvider } from '@/render/meshBindingSystem';
import type { MissileInstance } from '@/sim/missile';
import type { SamMissile } from '@/sim/enemies';

type MissileVisual = {
  mesh: Mesh;
  particles: ParticleSystem;
};

export class MissileVisualManager {
  private readonly scene: Scene;
  private readonly material: StandardMaterial;
  private readonly visuals = new Map<Entity, MissileVisual>();

  constructor(scene: Scene) {
    this.scene = scene;

    const mat = new StandardMaterial('missileMat', scene);
    mat.emissiveColor = new Color3(1, 0.85, 0.5);
    mat.disableLighting = true;
    this.material = mat;
  }

  update(
    playerMissiles: MissileInstance[],
    samMissiles: SamMissile[],
    playerMissileMap: Map<Entity, MissileInstance>,
    samMissileMap: Map<Entity, SamMissile>,
    getTransform: TransformProvider
  ): void {
    const activeEntities = new Set<Entity>();

    for (const missile of playerMissiles) {
      activeEntities.add(missile.entity);
      this.ensureVisual(missile.entity, getTransform);
    }

    for (const missile of samMissiles) {
      activeEntities.add(missile.entity);
      this.ensureVisual(missile.entity, getTransform);
    }

    for (const [entity, visual] of this.visuals) {
      if (!activeEntities.has(entity)) {
        visual.particles.stop();
        visual.particles.disposeOnStop = true;
        visual.mesh.dispose();
        this.visuals.delete(entity);
      }
    }
  }

  dispose(): void {
    for (const visual of this.visuals.values()) {
      visual.particles.stop();
      visual.particles.dispose();
      visual.mesh.dispose();
    }
    this.visuals.clear();
    this.material.dispose();
  }

  private ensureVisual(entity: Entity, getTransform: TransformProvider): void {
    let visual = this.visuals.get(entity);
    if (!visual) {
      visual = this.createMissileVisual();
      this.visuals.set(entity, visual);
    }

    const transform = getTransform(entity);
    if (transform) {
      visual.mesh.position.set(
        transform.translation.x,
        transform.translation.y,
        transform.translation.z
      );
      if (!visual.mesh.rotationQuaternion) {
        visual.mesh.rotationQuaternion = new Quaternion();
      }
      visual.mesh.rotationQuaternion.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.w
      );
    }
  }

  private createMissileVisual(): MissileVisual {
    const mesh = MeshBuilder.CreateCylinder(
      'missile',
      { diameter: 0.25, height: 1.5, tessellation: 6 },
      this.scene
    );
    mesh.material = this.material;
    mesh.isPickable = false;

    const particles = new ParticleSystem('missileTrail', 80, this.scene);
    particles.emitter = mesh;
    particles.createPointEmitter(new Vector3(0, 0, -0.5), new Vector3(0, 0, -1));
    particles.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==',
      this.scene
    );
    particles.color1 = new Color4(1, 0.8, 0.3, 1);
    particles.color2 = new Color4(0.6, 0.6, 0.6, 0.8);
    particles.colorDead = new Color4(0.3, 0.3, 0.3, 0);
    particles.emitRate = 60;
    particles.minLifeTime = 0.3;
    particles.maxLifeTime = 0.8;
    particles.minSize = 0.3;
    particles.maxSize = 0.8;
    particles.gravity = new Vector3(0, -1, 0);
    particles.blendMode = ParticleSystem.BLENDMODE_ADD;
    particles.start();

    return { mesh, particles };
  }
}
