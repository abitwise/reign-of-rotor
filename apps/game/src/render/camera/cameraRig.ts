import { Matrix, Quaternion, Vector3 } from '@babylonjs/core';
import type { AbstractMesh, TargetCamera, TransformNode } from '@babylonjs/core';
import type { Entity, Transform } from '../../physics/types';
import type { TransformProvider } from '../meshBindingSystem';

export type CameraMode = 'cockpit' | 'chase';

export type CameraRigOptions = {
  camera: TargetCamera;
  transformProvider: TransformProvider;
  targetEntity?: Entity | null;
  targetMesh?: AbstractMesh | null;
  fallbackTransform?: Transform | null;
  initialMode?: CameraMode;
};

type CameraModeConfig = {
  mode: CameraMode;
  offset: Vector3;
  positionSmoothing: number;
  rotationSmoothing: number;
  snapThreshold: number;
  lookLimits: { yaw: number; pitchUp: number; pitchDown: number };
  attachmentName?: string;
};

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const COCKPIT_CONFIG: CameraModeConfig = {
  mode: 'cockpit',
  offset: new Vector3(0, 1.55, 0.15),
  positionSmoothing: 0.2,
  rotationSmoothing: 0.3,
  snapThreshold: 8,
  lookLimits: {
    yaw: degreesToRadians(110),
    pitchUp: degreesToRadians(75),
    pitchDown: degreesToRadians(75)
  },
  attachmentName: '@cam_cockpit'
};

const CHASE_CONFIG: CameraModeConfig = {
  mode: 'chase',
  offset: new Vector3(0, 2.4, -10),
  positionSmoothing: 0.14,
  rotationSmoothing: 0.22,
  snapThreshold: 12,
  lookLimits: {
    yaw: degreesToRadians(160),
    pitchUp: degreesToRadians(80),
    pitchDown: degreesToRadians(80)
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toFramerateIndependentAlpha = (smoothing: number, deltaSeconds: number): number => {
  if (deltaSeconds <= 0) {
    return clamp(smoothing, 0, 1);
  }

  const base = clamp(smoothing, 0, 1);
  return clamp(1 - Math.pow(1 - base, deltaSeconds * 60), 0, 1);
};

export class CameraRig {
  private transformProvider: TransformProvider;
  private readonly camera: TargetCamera;
  private targetEntity: Entity | null;
  private fallbackTransform: Transform | null;
  private targetMesh: AbstractMesh | null;
  private attachmentNode: TransformNode | null = null;
  private attachmentName: string | null = null;

  private readonly lookTarget = { yaw: 0, pitch: 0 };
  private readonly lookCurrent = { yaw: 0, pitch: 0 };

  private readonly basePosition = new Vector3();
  private readonly desiredPosition = new Vector3();
  private readonly currentPosition = new Vector3();
  private readonly baseRotation = new Quaternion();
  private readonly desiredRotation = new Quaternion();
  private readonly currentRotation = new Quaternion();
  private readonly lookRotation = new Quaternion();
  private readonly rotationMatrix = new Matrix();
  private readonly offsetWorld = new Vector3();

  private initialized = false;
  private mode: CameraMode;

  constructor({
    camera,
    transformProvider,
    targetEntity = null,
    targetMesh = null,
    fallbackTransform = {
      translation: { x: 0, y: 1.5, z: -6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    },
    initialMode = 'cockpit'
  }: CameraRigOptions) {
    this.camera = camera;
    this.camera.rotationQuaternion = this.camera.rotationQuaternion ?? new Quaternion();
    this.transformProvider = transformProvider;
    this.targetEntity = targetEntity;
    this.targetMesh = targetMesh;
    this.fallbackTransform = fallbackTransform;
    this.mode = initialMode;
    this.applyVisibility();
  }

  getMode(): CameraMode {
    return this.mode;
  }

  toggleMode(): void {
    this.setMode(this.mode === 'cockpit' ? 'chase' : 'cockpit');
  }

  setMode(mode: CameraMode): void {
    if (mode === this.mode) {
      return;
    }

    this.mode = mode;
    this.applyVisibility();
    this.initialized = false;
    this.snapToTarget();

    const limits = this.getConfig().lookLimits;
    this.lookTarget.yaw = clamp(this.lookTarget.yaw, -limits.yaw, limits.yaw);
    this.lookTarget.pitch = clamp(this.lookTarget.pitch, -limits.pitchDown, limits.pitchUp);
    this.lookCurrent.yaw = clamp(this.lookCurrent.yaw, -limits.yaw, limits.yaw);
    this.lookCurrent.pitch = clamp(this.lookCurrent.pitch, -limits.pitchDown, limits.pitchUp);
  }

  setTransformProvider(provider: TransformProvider): void {
    this.transformProvider = provider;
  }

  setTargetEntity(entity: Entity | null): void {
    this.targetEntity = entity;
    this.initialized = false;
    this.snapToTarget();
  }

  setTargetMesh(mesh: AbstractMesh | null): void {
    this.targetMesh = mesh;
    this.attachmentNode = null;
    this.attachmentName = null;
    this.applyVisibility();
  }

  setFallbackTransform(transform: Transform | null): void {
    this.fallbackTransform = transform;
  }

  applyLookDelta(yawDelta: number, pitchDelta: number): void {
    const limits = this.getConfig().lookLimits;
    this.lookTarget.yaw = clamp(
      this.lookTarget.yaw + yawDelta,
      -limits.yaw,
      limits.yaw
    );
    this.lookTarget.pitch = clamp(
      this.lookTarget.pitch - pitchDelta,
      -limits.pitchDown,
      limits.pitchUp
    );
  }

  update(deltaSeconds: number): void {
    const config = this.getConfig();
    const pose = this.resolvePose(config);
    if (!pose) {
      return;
    }

    const { basePosition, baseRotation } = pose;
    this.basePosition.copyFrom(basePosition);
    this.baseRotation.copyFrom(baseRotation);

    this.lookCurrent.yaw = this.interpolate(
      this.lookCurrent.yaw,
      this.lookTarget.yaw,
      config.rotationSmoothing,
      deltaSeconds
    );
    this.lookCurrent.pitch = this.interpolate(
      this.lookCurrent.pitch,
      this.lookTarget.pitch,
      config.rotationSmoothing,
      deltaSeconds
    );

    Quaternion.FromEulerAnglesToRef(
      this.lookCurrent.pitch,
      this.lookCurrent.yaw,
      0,
      this.lookRotation
    );
    this.baseRotation.multiplyToRef(this.lookRotation, this.desiredRotation);

    if (!pose.isDirect) {
      this.desiredPosition.copyFrom(this.basePosition).addInPlace(pose.offsetWorld);
    } else {
      this.desiredPosition.copyFrom(this.basePosition);
    }

    if (!this.initialized) {
      this.currentPosition.copyFrom(this.desiredPosition);
      this.currentRotation.copyFrom(this.desiredRotation);
      this.initialized = true;
    } else {
      const distance = Vector3.Distance(this.currentPosition, this.desiredPosition);
      if (distance > config.snapThreshold) {
        this.currentPosition.copyFrom(this.desiredPosition);
        this.currentRotation.copyFrom(this.desiredRotation);
      } else {
        const positionLerp = toFramerateIndependentAlpha(config.positionSmoothing, deltaSeconds);
        const rotationLerp = toFramerateIndependentAlpha(config.rotationSmoothing, deltaSeconds);

        Vector3.LerpToRef(this.currentPosition, this.desiredPosition, positionLerp, this.currentPosition);
        Quaternion.SlerpToRef(
          this.currentRotation,
          this.desiredRotation,
          rotationLerp,
          this.currentRotation
        );
      }
    }

    this.camera.position.copyFrom(this.currentPosition);
    if (this.camera.rotationQuaternion) {
      this.camera.rotationQuaternion.copyFrom(this.currentRotation);
    } else {
      this.camera.rotationQuaternion = this.currentRotation.clone();
    }
  }

  dispose(): void {
  }

  private getConfig(): CameraModeConfig {
    return this.mode === 'cockpit' ? COCKPIT_CONFIG : CHASE_CONFIG;
  }

  private resolvePose(config: CameraModeConfig): { basePosition: Vector3; baseRotation: Quaternion; offsetWorld: Vector3; isDirect: boolean } | null {
    const transform = this.readTransform();
    if (!transform) {
      return null;
    }

    if (config.attachmentName && this.targetMesh) {
      const attachment = this.getAttachmentNode(config.attachmentName);
      if (attachment) {
        attachment.computeWorldMatrix(true);
        const worldMatrix = attachment.getWorldMatrix();
        worldMatrix.getTranslationToRef(this.basePosition);
        Quaternion.FromRotationMatrixToRef(worldMatrix, this.baseRotation);

        return {
          basePosition: this.basePosition,
          baseRotation: this.baseRotation,
          offsetWorld: this.offsetWorld.copyFromFloats(0, 0, 0),
          isDirect: true
        };
      }
    }

    this.basePosition.set(transform.translation.x, transform.translation.y, transform.translation.z);
    this.baseRotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);

    Matrix.FromQuaternionToRef(this.baseRotation, this.rotationMatrix);
    Vector3.TransformCoordinatesToRef(config.offset, this.rotationMatrix, this.offsetWorld);

    return {
      basePosition: this.basePosition,
      baseRotation: this.baseRotation,
      offsetWorld: this.offsetWorld,
      isDirect: false
    };
  }

  private readTransform(): Transform | null {
    if (this.targetEntity !== null) {
      const transform = this.transformProvider(this.targetEntity);
      if (transform) {
        return transform;
      }
    }

    return this.fallbackTransform;
  }

  private interpolate(current: number, target: number, smoothing: number, deltaSeconds: number): number {
    const alpha = toFramerateIndependentAlpha(smoothing, deltaSeconds);
    return current + (target - current) * alpha;
  }

  private getAttachmentNode(name: string): TransformNode | null {
    if (!this.targetMesh) {
      return null;
    }

    if (this.attachmentNode && this.attachmentName === name) {
      return this.attachmentNode;
    }

    if (this.targetMesh.name === name) {
      this.attachmentNode = this.targetMesh;
      this.attachmentName = name;
      return this.attachmentNode;
    }

    const childNodes = this.targetMesh.getChildTransformNodes();
    const match = childNodes.find((node) => node.name === name) ?? null;

    this.attachmentNode = match;
    this.attachmentName = name;
    return match;
  }

  private applyVisibility(): void {
    if (!this.targetMesh) {
      return;
    }

    const visible = this.mode === 'chase';
    this.targetMesh.setEnabled(visible);
    this.targetMesh.getChildMeshes(false).forEach((child) => child.setEnabled(visible));
  }

  private snapToTarget(): void {
    const config = this.getConfig();
    const pose = this.resolvePose(config);
    if (!pose) {
      return;
    }

    this.basePosition.copyFrom(pose.basePosition);
    this.baseRotation.copyFrom(pose.baseRotation);

    Quaternion.FromEulerAnglesToRef(
      this.lookCurrent.pitch,
      this.lookCurrent.yaw,
      0,
      this.lookRotation
    );
    this.baseRotation.multiplyToRef(this.lookRotation, this.desiredRotation);

    if (!pose.isDirect) {
      this.desiredPosition.copyFrom(this.basePosition).addInPlace(pose.offsetWorld);
    } else {
      this.desiredPosition.copyFrom(this.basePosition);
    }

    this.currentPosition.copyFrom(this.desiredPosition);
    this.currentRotation.copyFrom(this.desiredRotation);

    this.camera.position.copyFrom(this.currentPosition);
    if (this.camera.rotationQuaternion) {
      this.camera.rotationQuaternion.copyFrom(this.currentRotation);
    } else {
      this.camera.rotationQuaternion = this.currentRotation.clone();
    }
  }
}
