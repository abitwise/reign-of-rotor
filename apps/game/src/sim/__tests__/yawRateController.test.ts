import { describe, expect, it } from 'vitest';
import type { YawRateControllerTuning } from '../../core/input/controlState';
import { computeYawRateCommand } from '../helicopterFlight';

describe('yaw rate controller', () => {
  const tuning: YawRateControllerTuning = {
    maxRateRad: 2,
    damping: 0.8
  };

  it('clamps the command within [-1, 1]', () => {
    const command = computeYawRateCommand(1, -10, tuning);
    expect(command).toBe(1);
  });

  it('returns near-zero command when current rate matches target', () => {
    const command = computeYawRateCommand(0.5, 1, tuning);
    expect(command).toBeCloseTo(0, 4);
  });

  describe('negative desired rates', () => {
    it('commands negative torque for negative desired rate', () => {
      const command = computeYawRateCommand(-0.5, 0, tuning);
      expect(command).toBeLessThan(0);
      expect(command).toBeCloseTo(-0.5 * tuning.maxRateRad * tuning.damping, 4);
    });

    it('clamps negative commands to -1', () => {
      const command = computeYawRateCommand(-1, 10, tuning);
      expect(command).toBe(-1);
    });

    it('reduces negative command when approaching negative target rate', () => {
      const command = computeYawRateCommand(-1, -1.5, tuning);
      expect(command).toBeGreaterThan(-1);
      expect(command).toBeCloseTo((-2 - -1.5) * tuning.damping, 4);
    });
  });

  describe('boundary conditions', () => {
    it('handles input exactly at -1', () => {
      const command = computeYawRateCommand(-1, 0, tuning);
      // Desired: -1 * 2 = -2, Current: 0, Error: -2, Command: -2 * 0.8 = -1.6 (clamped to -1)
      expect(command).toBe(-1);
    });

    it('handles input exactly at 1', () => {
      const command = computeYawRateCommand(1, 0, tuning);
      // Desired: 1 * 2 = 2, Current: 0, Error: 2, Command: 2 * 0.8 = 1.6 (clamped to 1)
      expect(command).toBe(1);
    });

    it('handles input exactly at 0', () => {
      const command = computeYawRateCommand(0, 0, tuning);
      expect(command).toBe(0);
    });

    it('clamps input values above 1', () => {
      const command1 = computeYawRateCommand(1.5, 0, tuning);
      const command2 = computeYawRateCommand(1.0, 0, tuning);
      expect(command1).toBe(command2);
    });

    it('clamps input values below -1', () => {
      const command1 = computeYawRateCommand(-1.5, 0, tuning);
      const command2 = computeYawRateCommand(-1.0, 0, tuning);
      expect(command1).toBe(command2);
    });
  });

  describe('intermediate damping scenarios', () => {
    it('applies low damping correctly', () => {
      const lowDampingTuning: YawRateControllerTuning = {
        maxRateRad: 2,
        damping: 0.2
      };
      const command = computeYawRateCommand(1, 0, lowDampingTuning);
      expect(command).toBeCloseTo(2 * 0.2, 4);
    });

    it('applies high damping correctly', () => {
      const highDampingTuning: YawRateControllerTuning = {
        maxRateRad: 1,
        damping: 2.0
      };
      const command = computeYawRateCommand(0.5, 0, highDampingTuning);
      // Desired rate: 0.5 * 1 = 0.5, error: 0.5 - 0 = 0.5, command: 0.5 * 2.0 = 1.0 (clamped to 1)
      expect(command).toBe(1);
    });

    it('scales proportionally with damping', () => {
      const tuning1: YawRateControllerTuning = { maxRateRad: 2, damping: 0.5 };
      const tuning2: YawRateControllerTuning = { maxRateRad: 2, damping: 1.0 };
      
      const command1 = computeYawRateCommand(0.5, 0, tuning1);
      const command2 = computeYawRateCommand(0.5, 0, tuning2);
      
      expect(command2).toBeCloseTo(command1 * 2, 4);
    });
  });

  describe('current rate exceeds maximum rate', () => {
    it('commands reverse torque when current rate exceeds positive target', () => {
      const command = computeYawRateCommand(0.5, 3, tuning);
      // Desired: 0.5 * 2 = 1, Current: 3, Error: 1 - 3 = -2, Command: -2 * 0.8 = -1.6 (clamped to -1)
      expect(command).toBe(-1);
    });

    it('commands reverse torque when current rate exceeds negative target', () => {
      const command = computeYawRateCommand(-0.5, -3, tuning);
      // Desired: -0.5 * 2 = -1, Current: -3, Error: -1 - -3 = 2, Command: 2 * 0.8 = 1.6 (clamped to 1)
      expect(command).toBe(1);
    });

    it('reduces command smoothly as current approaches target from above', () => {
      const command1 = computeYawRateCommand(1, 2.5, tuning);
      const command2 = computeYawRateCommand(1, 2.2, tuning);
      const command3 = computeYawRateCommand(1, 2.0, tuning);
      
      expect(command1).toBeLessThan(command2);
      expect(command2).toBeLessThan(command3);
      expect(command3).toBeCloseTo(0, 4);
    });
  });

  describe('realistic flight scenarios', () => {
    it('accelerates from rest with full input', () => {
      const command = computeYawRateCommand(1, 0, tuning);
      expect(command).toBeGreaterThan(0);
      // Desired: 1 * 2 = 2, Current: 0, Error: 2, Command: 2 * 0.8 = 1.6 (clamped to 1)
      expect(command).toBe(1);
    });

    it('decelerates when releasing input', () => {
      const command = computeYawRateCommand(0, 1.5, tuning);
      expect(command).toBeLessThan(0);
      // Desired: 0, Current: 1.5, Error: -1.5, Command: -1.5 * 0.8 = -1.2 (clamped to -1)
      expect(command).toBe(-1);
    });

    it('reverses direction smoothly', () => {
      // Currently rotating right, want to rotate left
      const command = computeYawRateCommand(-1, 1, tuning);
      expect(command).toBeLessThan(0);
      // Desired: -2, Current: 1, Error: -3, Command: -3 * 0.8 = -2.4 (clamped to -1)
      expect(command).toBe(-1);
    });

    it('maintains steady rate with appropriate input', () => {
      const steadyRate = 1.0;
      const normalizedInput = steadyRate / tuning.maxRateRad;
      const command = computeYawRateCommand(normalizedInput, steadyRate, tuning);
      expect(command).toBeCloseTo(0, 4);
    });
  });
});
