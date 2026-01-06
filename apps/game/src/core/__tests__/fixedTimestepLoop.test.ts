import { describe, expect, it } from 'vitest';
import { FixedTimestepLoop } from '../loop/fixedTimestepLoop';
import { createSystemScheduler } from '../loop/systemScheduler';
import { SystemPhase } from '../loop/types';

describe('FixedTimestepLoop', () => {
  it('runs systems in deterministic phase order', () => {
    const scheduler = createSystemScheduler();
    const executionOrder: string[] = [];

    scheduler.addSystem({
      id: 'late',
      phase: SystemPhase.Late,
      step: () => executionOrder.push('late')
    });

    scheduler.addSystem({
      id: 'input',
      phase: SystemPhase.Input,
      step: () => executionOrder.push('input')
    });

    scheduler.addSystem({
      id: 'physics',
      phase: SystemPhase.Physics,
      step: () => executionOrder.push('physics')
    });

    const loop = new FixedTimestepLoop({
      scheduler,
      fixedDeltaMs: 10,
      maxSubSteps: 3
    });

    loop.step(12);

    expect(executionOrder).toEqual(['input', 'physics', 'late']);
  });

  it('caps catch-up and reports clamped time', () => {
    const scheduler = createSystemScheduler();
    let steps = 0;

    scheduler.addSystem({
      id: 'sim',
      phase: SystemPhase.Simulation,
      step: () => {
        steps += 1;
      }
    });

    const loop = new FixedTimestepLoop({
      scheduler,
      fixedDeltaMs: 10,
      maxSubSteps: 5,
      maxFrameDeltaMs: 100
    });

    const metrics = loop.step(150);

    expect(steps).toBe(5);
    expect(metrics.stepsExecuted).toBe(5);
    expect(metrics.clampedMs).toBeGreaterThan(0);
    expect(metrics.accumulatorMs).toBe(0);
  });

  it('preserves accumulator for fractional deltas', () => {
    const scheduler = createSystemScheduler();
    let steps = 0;

    scheduler.addSystem({
      id: 'sim',
      phase: SystemPhase.Simulation,
      step: () => {
        steps += 1;
      }
    });

    const loop = new FixedTimestepLoop({
      scheduler,
      fixedDeltaMs: 16,
      maxSubSteps: 4
    });

    const first = loop.step(8);
    expect(steps).toBe(0);
    expect(first.accumulatorMs).toBeCloseTo(8);

    const second = loop.step(12);
    expect(steps).toBe(1);
    expect(second.stepsExecuted).toBe(1);
    expect(second.accumulatorMs).toBeCloseTo(4);
  });
});
