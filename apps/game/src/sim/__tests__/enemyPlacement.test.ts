import { describe, expect, it } from 'vitest';
import { terrainHeight } from '../../content/terrainHeight';
import { MISSION_DIRECTOR_CONFIG, createMissionPlan } from '../../content/missions';
import { CAMERA_FAR_PLANE } from '../../content/world';

const MAX_ENEMY_OFFSET_FROM_ORIGIN = 600;

describe('enemy placement is visible and grounded', () => {
  it('places every enemy inside the camera far plane', () => {
    const playerSpawn = { x: 0, z: 0 };

    for (let seed = 0; seed < 200; seed += 1) {
      const plan = createMissionPlan({ seed, playerSpawn });

      for (const spawn of plan.enemySpawns) {
        const distance = Math.hypot(spawn.position.x - playerSpawn.x, spawn.position.z - playerSpawn.z);
        expect(distance).toBeLessThan(CAMERA_FAR_PLANE);
      }
    }
  });

  it('keeps the mission origin far enough to preserve the approach flight', () => {
    expect(MISSION_DIRECTOR_CONFIG.minDistanceFromPlayer).toBeGreaterThanOrEqual(2000);
    expect(
      MISSION_DIRECTOR_CONFIG.maxDistanceFromPlayer + MAX_ENEMY_OFFSET_FROM_ORIGIN
    ).toBeLessThan(CAMERA_FAR_PLANE);
  });

  it('seats every enemy on the terrain surface rather than at y=0', () => {
    const playerSpawn = { x: 0, z: 0 };

    for (let seed = 0; seed < 50; seed += 1) {
      const plan = createMissionPlan({ seed, playerSpawn });

      for (const spawn of plan.enemySpawns) {
        const ground = terrainHeight(spawn.position.x, spawn.position.z);
        expect(spawn.position.y).toBeCloseTo(ground, 5);
      }
    }
  });

  it('seats patrol waypoints on the terrain and keeps them inside the camera far plane', () => {
    const playerSpawn = { x: 0, z: 0 };
    let checkedAnyPatrol = false;

    for (let seed = 0; seed < 50; seed += 1) {
      const plan = createMissionPlan({ seed, playerSpawn });

      for (const spawn of plan.enemySpawns) {
        if (!spawn.patrolPath) continue;

        for (const point of spawn.patrolPath) {
          checkedAnyPatrol = true;
          // Patrolling enemies must stay on the surface (never sink underground or
          // float) so their mesh and HUD marker remain correctly placed while moving.
          expect(point.y).toBeCloseTo(terrainHeight(point.x, point.z), 5);
          // ...and stay inside the camera far plane so they never wander out of view.
          const distance = Math.hypot(point.x - playerSpawn.x, point.z - playerSpawn.z);
          expect(distance).toBeLessThan(CAMERA_FAR_PLANE);
        }
      }
    }

    expect(checkedAnyPatrol).toBe(true);
  });

  it('seats convoy route waypoints on the terrain surface', () => {
    const playerSpawn = { x: 0, z: 0 };
    let checkedAnyRoute = false;

    for (let seed = 0; seed < 50; seed += 1) {
      const plan = createMissionPlan({ seed, playerSpawn });
      if (!plan.convoyPlan) continue;

      for (const point of plan.convoyPlan.route) {
        checkedAnyRoute = true;
        expect(point.y).toBeCloseTo(terrainHeight(point.x, point.z), 5);
      }
    }

    expect(checkedAnyRoute).toBe(true);
  });
});
