import { describe, expect, it } from 'vitest';
import {
  buildAvionicsAlerts,
  buildNavigationReadout,
  buildCombatReadout,
  buildThreatReadout,
  buildDebriefReadout,
  selectPriorityAlert,
  type AvionicsReadout,
  type AlertCandidate
} from '../hudReadouts';
import type { CannonState } from '../../sim/cannon';
import type { CannonConfig, MissileConfig } from '../../content/weapons';
import type { MissileState } from '../../sim/missile';
import type { EnemyState } from '../../sim/enemies';
import type { MissionStatsState } from '../../sim/missionStats';
import type { MissionRuntime } from '../../sim/missionDirector';

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

describe('buildCombatReadout', () => {
  it('returns weapon name and ammo from config and state', () => {
    const cannonState: CannonState = {
      ammoRemaining: 500,
      cooldownRemaining: 0,
      shotsFired: 0,
      impactEvents: [],
      damageEvents: []
    };
    const missileState: MissileState = {
      ammoRemaining: 4,
      cooldownRemaining: 0,
      lockStatus: 'FREE',
      lockProgress: 0,
      lockTarget: null,
      hasCandidate: false,
      missilesFired: 0,
      missiles: [],
      missileMap: new Map(),
      explosionEvents: [],
      damageEvents: []
    };

    const cannonConfig: CannonConfig = {
      name: 'Test Cannon',
      ammo: 1000,
      cooldownSeconds: 0.1,
      range: 1000,
      damage: 10,
      muzzleOffset: { x: 0, y: 0, z: 0 },
      impactFx: 'test-fx'
    };
    const missileConfig: MissileConfig = {
      name: 'Test Missile',
      ammo: 8,
      cooldownSeconds: 1,
      lockTimeSeconds: 1,
      lockConeDegrees: 10,
      lockRange: 1000,
      requireLineOfSight: true,
      speed: 10,
      turnRateDeg: 90,
      maxFlightSeconds: 5,
      proximityRadius: 5,
      damage: 100,
      explosionRadius: 10,
      launchOffset: { x: 0, y: 0, z: 0 },
      colliderRadius: 0.2,
      explosionFx: 'missile-fx'
    };

    const readout = buildCombatReadout(cannonState, cannonConfig, missileState, missileConfig, {
      ammoRemaining: 6,
      cooldownRemaining: 0,
      activeRemaining: 0,
      decoyPosition: null,
      deployedThisFrame: false
    });

    expect(readout.weaponName).toBe('Test Cannon');
    expect(readout.ammo).toBe(500);
    expect(readout.missileAmmo).toBe(4);
    expect(readout.countermeasureAmmo).toBe(6);
    expect(readout.lockState).toBe('NO TARGET');
  });

  it('maps ammo correctly when depleted', () => {
    const cannonState: CannonState = {
      ammoRemaining: 0,
      cooldownRemaining: 0,
      shotsFired: 0,
      impactEvents: [],
      damageEvents: []
    };
    const missileState: MissileState = {
      ammoRemaining: 0,
      cooldownRemaining: 0,
      lockStatus: 'FREE',
      lockProgress: 0,
      lockTarget: null,
      hasCandidate: false,
      missilesFired: 0,
      missiles: [],
      missileMap: new Map(),
      explosionEvents: [],
      damageEvents: []
    };

    const cannonConfig: CannonConfig = {
      name: 'Empty Cannon',
      ammo: 1000,
      cooldownSeconds: 0.1,
      range: 1000,
      damage: 10,
      muzzleOffset: { x: 0, y: 0, z: 0 },
      impactFx: 'test-fx'
    };
    const missileConfig: MissileConfig = {
      name: 'Test Missile',
      ammo: 0,
      cooldownSeconds: 1,
      lockTimeSeconds: 1,
      lockConeDegrees: 10,
      lockRange: 1000,
      requireLineOfSight: false,
      speed: 10,
      turnRateDeg: 90,
      maxFlightSeconds: 5,
      proximityRadius: 5,
      damage: 100,
      explosionRadius: 10,
      launchOffset: { x: 0, y: 0, z: 0 },
      colliderRadius: 0.2,
      explosionFx: 'missile-fx'
    };

    const readout = buildCombatReadout(cannonState, cannonConfig, missileState, missileConfig, null);

    expect(readout.ammo).toBe(0);
    expect(readout.missileAmmo).toBe(0);
  });

  it('shows search when candidates are present without a lock', () => {
    const cannonState: CannonState = {
      ammoRemaining: 100,
      cooldownRemaining: 0,
      shotsFired: 0,
      impactEvents: [],
      damageEvents: []
    };
    const missileState: MissileState = {
      ammoRemaining: 2,
      cooldownRemaining: 0,
      lockStatus: 'FREE',
      lockProgress: 0,
      lockTarget: null,
      hasCandidate: true,
      missilesFired: 0,
      missiles: [],
      missileMap: new Map(),
      explosionEvents: [],
      damageEvents: []
    };

    const cannonConfig: CannonConfig = {
      name: 'Cannon',
      ammo: 100,
      cooldownSeconds: 0.1,
      range: 1000,
      damage: 10,
      muzzleOffset: { x: 0, y: 0, z: 0 },
      impactFx: 'test-fx'
    };
    const missileConfig: MissileConfig = {
      name: 'Test Missile',
      ammo: 2,
      cooldownSeconds: 1,
      lockTimeSeconds: 1,
      lockConeDegrees: 10,
      lockRange: 1000,
      requireLineOfSight: false,
      speed: 10,
      turnRateDeg: 90,
      maxFlightSeconds: 5,
      proximityRadius: 5,
      damage: 100,
      explosionRadius: 10,
      launchOffset: { x: 0, y: 0, z: 0 },
      colliderRadius: 0.2,
      explosionFx: 'missile-fx'
    };

    const readout = buildCombatReadout(cannonState, cannonConfig, missileState, missileConfig, null);

    expect(readout.lockState).toBe('SEARCH');
  });
});

describe('buildThreatReadout', () => {
  const player = {
    entity: 42,
    body: {
      translation: () => ({ x: 0, y: 0, z: 0 })
    }
  } as Parameters<typeof buildThreatReadout>[1];

  const baseEnemyState: EnemyState = {
    units: [],
    unitMap: new Map(),
    targets: [],
    radarSites: [],
    samSites: [],
    vehicles: [],
    samMissiles: [],
    samMissileMap: new Map(),
    explosionEvents: [],
    killedUnits: []
  };

  it('returns launch warning when a SAM missile targets the player', () => {
    const readout = buildThreatReadout(
      {
        ...baseEnemyState,
        samMissiles: [{ target: player.entity }] as EnemyState['samMissiles']
      },
      player
    );

    expect(readout?.level).toBe('launch');
  });

  it('returns lock warning when a SAM site has line of sight', () => {
    const readout = buildThreatReadout(
      {
        ...baseEnemyState,
        samSites: [
          {
            hasLineOfSight: true,
            lockProgress: 0.5
          } as EnemyState['samSites'][number]
        ]
      },
      player
    );

    expect(readout?.level).toBe('lock');
  });

  it('returns scan warning when radar detects the player', () => {
    const readout = buildThreatReadout(
      {
        ...baseEnemyState,
        radarSites: [
          {
            range: 100,
            unit: {
              body: { translation: () => ({ x: 0, y: 0, z: 50 }) }
            }
          } as EnemyState['radarSites'][number]
        ]
      },
      player
    );

    expect(readout?.level).toBe('scan');
  });
});

describe('buildDebriefReadout', () => {
  const baseMission: MissionRuntime = {
    seed: 123,
    templateId: 'convoy-strike',
    templateName: 'Convoy Strike',
    summary: 'Test mission',
    status: 'completed',
    objectives: [],
    completion: {
      available: true,
      promptActive: false,
      continueSelected: false,
      completed: true
    },
    navigationTarget: null
  };

  it('returns null when debrief is not active', () => {
    const stats: MissionStatsState = {
      elapsedSeconds: 10,
      kills: 2,
      damageDealt: 50,
      cannonShots: 5,
      missileShots: 1,
      totalShots: 6,
      debriefActive: false,
      outcome: null
    };

    expect(buildDebriefReadout(baseMission, stats)).toBeNull();
  });

  it('builds a debrief readout when active', () => {
    const stats: MissionStatsState = {
      elapsedSeconds: 75,
      kills: 3,
      damageDealt: 120,
      cannonShots: 12,
      missileShots: 2,
      totalShots: 14,
      debriefActive: true,
      outcome: 'success'
    };

    const readout = buildDebriefReadout(baseMission, stats);

    expect(readout?.title).toBe('Convoy Strike');
    expect(readout?.outcomeLabel).toBe('Mission Complete');
    expect(readout?.shotsFired).toBe(14);
  });
});
