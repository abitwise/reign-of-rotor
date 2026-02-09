import { Color3, Mesh, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import type { AbstractMesh, Scene } from '@babylonjs/core';
import type { Entity } from '@/physics/types';
import type { TransformProvider } from '@/render/meshBindingSystem';
import type { EnemyState, EnemyUnitType } from '@/sim/enemies';

export class EnemyVisualManager {
  private readonly scene: Scene;
  private readonly material: StandardMaterial;
  private readonly meshes = new Map<Entity, AbstractMesh>();

  constructor(scene: Scene) {
    this.scene = scene;

    const mat = new StandardMaterial('enemyMilitary', scene);
    mat.diffuseColor = new Color3(0.28, 0.32, 0.26);
    mat.specularColor = new Color3(0.08, 0.08, 0.06);
    mat.emissiveColor = new Color3(0.02, 0.02, 0.02);
    this.material = mat;
  }

  update(enemies: EnemyState, getTransform: TransformProvider): void {
    for (const entity of enemies.killedUnits) {
      const mesh = this.meshes.get(entity);
      if (mesh) {
        mesh.dispose();
        this.meshes.delete(entity);
      }
    }

    for (const unit of enemies.units) {
      let mesh = this.meshes.get(unit.entity);
      if (!mesh) {
        mesh = this.createEnemyMesh(unit.type);
        this.meshes.set(unit.entity, mesh);
      }

      const transform = getTransform(unit.entity);
      if (transform) {
        mesh.position.set(
          transform.translation.x,
          transform.translation.y,
          transform.translation.z
        );
      }
    }
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.dispose();
    }
    this.meshes.clear();
    this.material.dispose();
  }

  private createEnemyMesh(type: EnemyUnitType): AbstractMesh {
    switch (type) {
      case 'sam':
        return this.createSamMesh();
      case 'radar':
        return this.createRadarMesh();
      case 'vehicle':
        return this.createVehicleMesh();
    }
  }

  private createSamMesh(): AbstractMesh {
    const base = MeshBuilder.CreateCylinder(
      'samBase',
      { diameter: 3.2, height: 0.8, tessellation: 12 },
      this.scene
    );
    base.position.y = 0.4;

    const turret = MeshBuilder.CreateBox(
      'samTurret',
      { width: 1.4, height: 1.2, depth: 1.8 },
      this.scene
    );
    turret.position.y = 1.4;

    const launcherLeft = MeshBuilder.CreateCylinder(
      'samLauncherL',
      { diameter: 0.35, height: 2.0, tessellation: 8 },
      this.scene
    );
    launcherLeft.position.set(-0.5, 1.6, 0.3);
    launcherLeft.rotation.x = -0.5;

    const launcherRight = MeshBuilder.CreateCylinder(
      'samLauncherR',
      { diameter: 0.35, height: 2.0, tessellation: 8 },
      this.scene
    );
    launcherRight.position.set(0.5, 1.6, 0.3);
    launcherRight.rotation.x = -0.5;

    const merged = Mesh.MergeMeshes(
      [base, turret, launcherLeft, launcherRight],
      true,
      true,
      undefined,
      false,
      true
    );
    const mesh = merged ?? base;
    mesh.name = 'enemy-sam';
    mesh.material = this.material;
    mesh.isPickable = false;
    return mesh;
  }

  private createRadarMesh(): AbstractMesh {
    const basePlatform = MeshBuilder.CreateCylinder(
      'radarBase',
      { diameter: 2.0, height: 0.4, tessellation: 12 },
      this.scene
    );
    basePlatform.position.y = 0.2;

    const tower = MeshBuilder.CreateCylinder(
      'radarTower',
      { diameter: 0.6, height: 3.5, tessellation: 8 },
      this.scene
    );
    tower.position.y = 2.0;

    const dish = MeshBuilder.CreateDisc('radarDish', { radius: 1.8, tessellation: 12 }, this.scene);
    dish.position.y = 3.7;
    dish.rotation.x = -0.6;

    const merged = Mesh.MergeMeshes(
      [basePlatform, tower, dish],
      true,
      true,
      undefined,
      false,
      true
    );
    const mesh = merged ?? basePlatform;
    mesh.name = 'enemy-radar';
    mesh.material = this.material;
    mesh.isPickable = false;
    return mesh;
  }

  private createVehicleMesh(): AbstractMesh {
    const body = MeshBuilder.CreateBox(
      'vehicleBody',
      { width: 2.4, height: 1.4, depth: 4.2 },
      this.scene
    );
    body.position.y = 0.7;

    const cabin = MeshBuilder.CreateBox(
      'vehicleCabin',
      { width: 2.0, height: 0.8, depth: 1.6 },
      this.scene
    );
    cabin.position.set(0, 1.8, -0.8);

    const merged = Mesh.MergeMeshes([body, cabin], true, true, undefined, false, true);
    const mesh = merged ?? body;
    mesh.name = 'enemy-vehicle';
    mesh.material = this.material;
    mesh.isPickable = false;
    return mesh;
  }
}
