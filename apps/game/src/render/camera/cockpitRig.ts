import { Matrix, Quaternion, Vector3 } from '@babylonjs/core';
import type { TargetCamera } from '@babylonjs/core';
import type { Entity, Transform } from '../../physics/types';
import type { TransformProvider } from '../meshBindingSystem';

export type CockpitCameraRigOptions = {
  camera: TargetCamera;
  transformProvider: TransformProvider;
  targetEntity?: Entity | null;
  cockpitOffset?: { x: number; y: number; z: number };
  fallbackTransform?: Transform | null;
  positionLerp?: number;
  rotationLerp?: number;
  lookLerp?: number;
  lookLimits?: { yaw: number; pitchUp: number; pitchDown: number };
};

const DEFAULT_LOOK_LIMITS = {
  yaw: (55 * Math.PI) / 180,
  pitchUp: (32 * Math.PI) / 180,
  pitchDown: (48 * Math.PI) / 180
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toLerpAlpha = (gain: number, deltaSeconds: number): number => {
  if (deltaSeconds <= 0) {
    return clamp(gain, 0, 1);
  }

  return clamp(1 - Math.exp(-gain * deltaSeconds), 0, 1);
};

export class CockpitCameraRig {
  private transformProvider: TransformProvider;
  private readonly camera: TargetCamera;
  private targetEntity: Entity | null;
  private fallbackTransform: Transform | null;

  private readonly cockpitOffset: Vector3;
  private readonly lookLimits: { yaw: number; pitchUp: number; pitchDown: number };
  private readonly lookTarget = { yaw: 0, pitch: 0 };
  private readonly lookCurrent = { yaw: 0, pitch: 0 };
  private readonly smoothing: { position: number; rotation: number; look: number };

  private readonly basePosition = new Vector3();
  private readonly cockpitOffsetWorld = new Vector3();
  private readonly desiredPosition = new Vector3();
  private readonly currentPosition = new Vector3();

  private readonly baseRotation = new Quaternion();
  private readonly desiredRotation = new Quaternion();
  private readonly currentRotation = new Quaternion();
  private readonly lookRotation = new Quaternion();
  private readonly rotationMatrix = new Matrix();

  private initialized = false;

  constructor({
    camera,
    transformProvider,
    targetEntity = null,
    cockpitOffset = { x: 0, y: 1.35, z: 0.45 },
    fallbackTransform = {
      translation: { x: 0, y: 1.5, z: -6 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    },
    positionLerp = 10,
    rotationLerp = 12,
    lookLerp = 10,
    lookLimits = DEFAULT_LOOK_LIMITS
  }: CockpitCameraRigOptions) {
    this.camera = camera;
    this.camera.rotationQuaternion = this.camera.rotationQuaternion ?? new Quaternion();
    this.transformProvider = transformProvider;
    this.targetEntity = targetEntity;
    this.fallbackTransform = fallbackTransform;
    this.cockpitOffset = new Vector3(cockpitOffset.x, cockpitOffset.y, cockpitOffset.z);
    this.lookLimits = lookLimits;
    this.smoothing = { position: positionLerp, rotation: rotationLerp, look: lookLerp };
  }

  setTransformProvider(provider: TransformProvider): void {
    this.transformProvider = provider;
  }

  setTargetEntity(entity: Entity | null): void {
    this.targetEntity = entity;
  }

  setFallbackTransform(transform: Transform | null): void {
    this.fallbackTransform = transform;
  }

  applyLookDelta(yawDelta: number, pitchDelta: number): void {
    this.lookTarget.yaw = clamp(
      this.lookTarget.yaw + yawDelta,
      -this.lookLimits.yaw,
      this.lookLimits.yaw
    );
    this.lookTarget.pitch = clamp(
      this.lookTarget.pitch - pitchDelta,
      -this.lookLimits.pitchDown,
      this.lookLimits.pitchUp
    );
  }

  update(deltaSeconds: number): void {
    const transform = this.readTransform();
    if (!transform) {
      return;
    }

    this.basePosition.set(transform.translation.x, transform.translation.y, transform.translation.z);
    this.baseRotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);

    this.lookCurrent.yaw = this.interpolate(
      this.lookCurrent.yaw,
      this.lookTarget.yaw,
      this.smoothing.look,
      deltaSeconds
    );
    this.lookCurrent.pitch = this.interpolate(
      this.lookCurrent.pitch,
      this.lookTarget.pitch,
      this.smoothing.look,
      deltaSeconds
    );

    Matrix.FromQuaternionToRef(this.baseRotation, this.rotationMatrix);
    Vector3.TransformCoordinatesToRef(
      this.cockpitOffset,
      this.rotationMatrix,
      this.cockpitOffsetWorld
    );

    this.desiredPosition.copyFrom(this.basePosition).addInPlace(this.cockpitOffsetWorld);

    Quaternion.FromEulerAnglesToRef(
      this.lookCurrent.pitch,
      this.lookCurrent.yaw,
      0,
      this.lookRotation
    );
    this.baseRotation.multiplyToRef(this.lookRotation, this.desiredRotation);

    if (!this.initialized) {
      this.currentPosition.copyFrom(this.desiredPosition);
      this.currentRotation.copyFrom(this.desiredRotation);
      this.initialized = true;
    } else {
      const positionLerp = toLerpAlpha(this.smoothing.position, deltaSeconds);
      const rotationLerp = toLerpAlpha(this.smoothing.rotation, deltaSeconds);

      Vector3.LerpToRef(this.currentPosition, this.desiredPosition, positionLerp, this.currentPosition);
      Quaternion.SlerpToRef(
        this.currentRotation,
        this.desiredRotation,
        rotationLerp,
        this.currentRotation
      );
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

  private readTransform(): Transform | null {
    if (this.targetEntity !== null) {
      const transform = this.transformProvider(this.targetEntity);
      if (transform) {
        return transform;
      }
    }

    return this.fallbackTransform;
  }

  private interpolate(current: number, target: number, gain: number, deltaSeconds: number): number {
    const alpha = toLerpAlpha(gain, deltaSeconds);
    return current + (target - current) * alpha;
  }

}
