import { describe, expect, it } from 'vitest';
import {
  buildAvionicsAlerts,
  buildNavigationReadout,
  selectPriorityAlert,
  type AvionicsReadout,
  type AlertCandidate
} from '../hudReadouts';

const baseReadout: AvionicsReadout = {
  altitude: 20,
  verticalSpeed: 0,
  horizontalSpeed: 0,
  heading: 0,
  pitch: 0,
  roll: 0,
  landingState: 'airborne',
  isGrounded: false,
  impactSeverity: 0,
  rotorRpm: 100,
  nominalRotorRpm: 100,
  powerRequired: 0.2,
  powerAvailable: 1,
  powerMargin: 0.8
};

describe('buildAvionicsAlerts', () => {
  it('flags power limit and low rotor rpm based on thresholds', () => {
    const alerts = buildAvionicsAlerts(
      {
        ...baseReadout,
        powerMargin: 0.05,
        rotorRpm: 85,
        nominalRotorRpm: 100
      },
      {
        powerMarginWarning: 0.1,
        rotorRpmWarningRatio: 0.9,
        vrs: {
          enabled: false,
          minDescentRate: 6,
          maxForwardSpeed: 12,
          maxAltitude: 80
        }
      }
    );

    expect(alerts.map((alert) => alert.id)).toEqual(['POWER_LIMIT', 'LOW_ROTOR_RPM']);
  });

  it('flags VRS when descent and forward speed thresholds are exceeded', () => {
    const alerts = buildAvionicsAlerts(
      {
        ...baseReadout,
        altitude: 50,
        verticalSpeed: -8,
        horizontalSpeed: 8
      },
      {
        powerMarginWarning: 0.1,
        rotorRpmWarningRatio: 0.9,
        vrs: {
          enabled: true,
          minDescentRate: 6,
          maxForwardSpeed: 12,
          maxAltitude: 80
        }
      }
    );

    expect(alerts.map((alert) => alert.id)).toEqual(['VRS_SETTLING']);
  });
});

describe('buildNavigationReadout', () => {
  it('computes bearing and distance to the target', () => {
    const player = {
      body: {
        translation: () => ({ x: 0, y: 0, z: 0 })
      }
    } as Parameters<typeof buildNavigationReadout>[0];

    const readout = buildNavigationReadout(player, {
      label: 'Waypoint',
      position: { x: 10, z: 0 }
    });

    expect(readout?.bearing).toBeCloseTo(90, 2);
    expect(readout?.distance).toBeCloseTo(10, 2);
  });
});

describe('selectPriorityAlert', () => {
  it('returns the highest-priority alert', () => {
    const alerts: AlertCandidate[] = [
      { id: 'POWER_LIMIT', label: 'POWER LIMIT' },
      { id: 'MISSILE_LAUNCH', label: 'MISSILE LAUNCH' }
    ];

    const selected = selectPriorityAlert(alerts, ['MISSILE_LAUNCH', 'POWER_LIMIT']);

    expect(selected?.id).toBe('MISSILE_LAUNCH');
  });
});
