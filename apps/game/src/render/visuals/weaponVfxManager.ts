import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Mesh, Scene } from '@babylonjs/core';
import type { CannonImpactEvent } from '@/sim/cannon';

type FlashEntry = {
  mesh: Mesh;
  material: StandardMaterial;
  frameCount: number;
  maxFrames: number;
  initialAlpha: number;
};

export class WeaponVfxManager {
  private readonly scene: Scene;
  private readonly activeFlashes = new Set<FlashEntry>();
  private readonly activeTracers = new Set<{ mesh: Mesh; framesRemaining: number }>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  processCannonImpacts(impactEvents: CannonImpactEvent[], gunOrigin: Vector3): void {
    for (const impact of impactEvents) {
      const points = [
        gunOrigin.clone(),
        new Vector3(impact.position.x, impact.position.y, impact.position.z)
      ];
      const tracer = MeshBuilder.CreateLines('tracer', { points, updatable: false }, this.scene);
      tracer.color = new Color3(1, 0.9, 0.3);
      tracer.alpha = 0.9;
      tracer.isPickable = false;

      const entry = { mesh: tracer, framesRemaining: 2 };
      this.activeTracers.add(entry);

      this.scene.onBeforeRenderObservable.addOnce(() => {
        this.tickTracers();
      });
    }
  }

  processExplosions(
    events: Array<{ position: { x: number; y: number; z: number }; radius: number }>
  ): void {
    for (const event of events) {
      const diameter = event.radius * 0.6;
      const mesh = MeshBuilder.CreateSphere('explosion', { diameter, segments: 8 }, this.scene);
      mesh.position.set(event.position.x, event.position.y, event.position.z);
      mesh.isPickable = false;

      const mat = new StandardMaterial('explosionMat', this.scene);
      mat.emissiveColor = new Color3(1, 0.85, 0.4);
      mat.disableLighting = true;
      mat.alpha = 0.9;
      mesh.material = mat;

      const entry: FlashEntry = {
        mesh,
        material: mat,
        frameCount: 0,
        maxFrames: 10,
        initialAlpha: 0.9
      };
      this.activeFlashes.add(entry);
    }

    if (this.activeFlashes.size > 0 || this.activeTracers.size > 0) {
      this.ensureUpdateLoop();
    }
  }

  dispose(): void {
    for (const flash of this.activeFlashes) {
      flash.mesh.dispose();
      flash.material.dispose();
    }
    this.activeFlashes.clear();

    for (const tracer of this.activeTracers) {
      tracer.mesh.dispose();
    }
    this.activeTracers.clear();
  }

  private updateLoopRegistered = false;

  private ensureUpdateLoop(): void {
    if (this.updateLoopRegistered) {
      return;
    }
    this.updateLoopRegistered = true;
    this.scene.onBeforeRenderObservable.add(() => {
      this.tickFlashes();
      this.tickTracers();

      if (this.activeFlashes.size === 0 && this.activeTracers.size === 0) {
        this.updateLoopRegistered = false;
      }
    });
  }

  private tickFlashes(): void {
    for (const flash of this.activeFlashes) {
      flash.frameCount += 1;
      const t = flash.frameCount / flash.maxFrames;

      if (flash.frameCount >= flash.maxFrames) {
        flash.mesh.dispose();
        flash.material.dispose();
        this.activeFlashes.delete(flash);
        continue;
      }

      const scale = 1 + t * 2;
      flash.mesh.scaling.set(scale, scale, scale);
      flash.material.alpha = flash.initialAlpha * (1 - t);
    }
  }

  private tickTracers(): void {
    for (const tracer of this.activeTracers) {
      tracer.framesRemaining -= 1;
      if (tracer.framesRemaining <= 0) {
        tracer.mesh.dispose();
        this.activeTracers.delete(tracer);
      }
    }
  }
}
