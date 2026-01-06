import { createSystemScheduler } from './systemScheduler';
import type { SystemScheduler } from './systemScheduler';
import type { FixedStepContext, LoopFrameMetrics } from './types';

export type FixedTimestepLoopOptions = {
  scheduler?: SystemScheduler;
  fixedDeltaMs?: number;
  maxSubSteps?: number;
  maxFrameDeltaMs?: number;
  onFrame?: (metrics: LoopFrameMetrics) => void;
  frameDriver?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
};

const DEFAULT_FIXED_DELTA_MS = 1000 / 60;
const DEFAULT_MAX_SUB_STEPS = 5;
const DEFAULT_MAX_FRAME_DELTA_MS = 250;

export class FixedTimestepLoop {
  readonly scheduler: SystemScheduler;
  readonly fixedDeltaMs: number;
  readonly fixedDeltaSeconds: number;
  readonly maxSubSteps: number;
  readonly maxFrameDeltaMs: number;

  private readonly onFrame?: (metrics: LoopFrameMetrics) => void;
  private readonly frameDriver: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private accumulatorMs = 0;
  private lastTimestamp: number | null = null;
  private stepIndex = 0;
  private elapsedMs = 0;
  private frameHandle: number | null = null;
  private running = false;
  private readonly stepContext: FixedStepContext;

  constructor({
    scheduler = createSystemScheduler(),
    fixedDeltaMs = DEFAULT_FIXED_DELTA_MS,
    maxSubSteps = DEFAULT_MAX_SUB_STEPS,
    maxFrameDeltaMs = DEFAULT_MAX_FRAME_DELTA_MS,
    onFrame,
    frameDriver,
    cancelFrame
  }: FixedTimestepLoopOptions = {}) {
    this.scheduler = scheduler;
    this.fixedDeltaMs = fixedDeltaMs;
    this.fixedDeltaSeconds = fixedDeltaMs / 1000;
    this.maxSubSteps = maxSubSteps;
    this.maxFrameDeltaMs = maxFrameDeltaMs;
    this.onFrame = onFrame;
    this.frameDriver =
      frameDriver ??
      (typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) =>
            Number(setTimeout(() => callback(performance.now()), this.fixedDeltaMs)));
    this.cancelFrame =
      cancelFrame ??
      (typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : (handle: number) => clearTimeout(handle));
    this.stepContext = {
      fixedDeltaMs: this.fixedDeltaMs,
      fixedDeltaSeconds: this.fixedDeltaSeconds,
      stepIndex: 0,
      elapsedMs: 0
    };
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.scheduleNextFrame();
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
    }

    this.frameHandle = null;
    this.running = false;
    this.lastTimestamp = null;
  }

  /**
   * Executes a single frame step manually. Useful for tests and non-RAF drivers.
   */
  step(frameDeltaMs: number): LoopFrameMetrics {
    const metrics = this.advance(frameDeltaMs);
    this.onFrame?.(metrics);
    return metrics;
  }

  private handleFrame = (timestamp: number): void => {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
      this.scheduleNextFrame();
      return;
    }

    const frameDeltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    const metrics = this.advance(frameDeltaMs);
    this.onFrame?.(metrics);
    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (!this.running) {
      return;
    }

    this.frameHandle = this.frameDriver(this.handleFrame);
  }

  private advance(frameDeltaMs: number): LoopFrameMetrics {
    const rawDelta = Math.max(0, frameDeltaMs);
    const limitedDelta = Math.min(rawDelta, this.maxFrameDeltaMs);
    let clampedMs = rawDelta - limitedDelta;

    this.accumulatorMs += limitedDelta;
    const maxAccumulator = this.fixedDeltaMs * this.maxSubSteps;

    if (this.accumulatorMs > maxAccumulator) {
      clampedMs += this.accumulatorMs - maxAccumulator;
      this.accumulatorMs = maxAccumulator;
    }

    let stepsExecuted = 0;
    while (this.accumulatorMs >= this.fixedDeltaMs && stepsExecuted < this.maxSubSteps) {
      this.runFixedStep();
      this.accumulatorMs -= this.fixedDeltaMs;
      stepsExecuted += 1;
    }

    return {
      frameDeltaMs: rawDelta,
      usedDeltaMs: rawDelta - clampedMs,
      fixedStepMs: this.fixedDeltaMs,
      stepsExecuted,
      accumulatorMs: this.accumulatorMs,
      clampedMs
    };
  }

  private runFixedStep(): void {
    this.stepIndex += 1;
    this.stepContext.stepIndex = this.stepIndex;
    this.stepContext.elapsedMs = this.elapsedMs;

    this.scheduler.runSystems(this.stepContext);

    this.elapsedMs += this.fixedDeltaMs;
  }
}
