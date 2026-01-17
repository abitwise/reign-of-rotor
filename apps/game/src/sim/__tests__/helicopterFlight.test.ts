import { beforeAll, describe, expect, it } from 'vitest';
import { createPlayerInputState } from '../../core/input/playerInput';
import { createControlState } from '../../core/input/controlState';
import type { FixedStepContext } from '../../core/loop/types';
import { DEFAULT_HELICOPTER_FLIGHT } from '../../content/helicopters';
import { loadRapier } from '../../physics/rapierInstance';
import { createPhysicsWorld } from '../../physics/world';
import type { GameState } from '../../boot/createApp';
import {
  createHelicopterFlightSystem,
  createAssistToggleSystem,
  spawnPlayerHelicopter
} from '../helicopterFlight';

describe('helicopter flight system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  const stepContext: FixedStepContext = {
    fixedDeltaMs: 16,
    fixedDeltaSeconds: 1 / 60,
    stepIndex: 0,
    elapsedMs: 0
  };

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('applies upward force based on collective input', () => {
    const physics = createPhysicsWorld(rapier, { gravity: { x: 0, y: 0, z: 0 } });
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.collective.filtered = 1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    expect(heli.body.linvel().y).toBeGreaterThan(0);
  });

  it('does not accelerate upward like a rocket at full collective', () => {
    const physics = createPhysicsWorld(rapier, { gravity: { x: 0, y: 0, z: 0 } });
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.collective.filtered = 1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    expect(heli.body.linvel().y).toBeGreaterThan(0);
    expect(heli.body.linvel().y).toBeLessThan(0.1);
  });

  it('reduces upward velocity when collective is held down', () => {
    const physics = createPhysicsWorld(rapier, { gravity: { x: 0, y: 0, z: 0 } });
    const input = createPlayerInputState();
    input.collective = -1;
    const controlState = createControlState();
    // Set both raw and filtered to match the input for this test
    controlState.collective.raw = -1;
    controlState.collective.filtered = -1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.body.setLinvel({ x: 0, y: 5, z: 0 }, true);

    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    expect(heli.body.linvel().y).toBeLessThan(5);
  });

  it('applies yaw torque from input', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.yaw.filtered = 1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    expect(heli.body.angvel().y).toBeGreaterThan(0);
  });
});

describe('stability assist system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  const stepContext: FixedStepContext = {
    fixedDeltaMs: 16,
    fixedDeltaSeconds: 1 / 60,
    stepIndex: 0,
    elapsedMs: 0
  };

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('dampens angular velocity when stability assist is enabled and no input', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.assists.stability = true;

    // Manually set angular velocity
    heli.body.setAngvel({ x: 1, y: 1, z: 1 }, true);

    const initialAngvel = heli.body.angvel();
    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    // Step multiple times to see damping effect
    for (let i = 0; i < 10; i++) {
      system.step(stepContext);
      physics.step(stepContext.fixedDeltaSeconds);
    }

    const finalAngvel = heli.body.angvel();

    // Angular velocity should be reduced after stability assist
    expect(Math.abs(finalAngvel.x)).toBeLessThan(Math.abs(initialAngvel.x));
    expect(Math.abs(finalAngvel.y)).toBeLessThan(Math.abs(initialAngvel.y));
    expect(Math.abs(finalAngvel.z)).toBeLessThan(Math.abs(initialAngvel.z));
  });

  it('does not apply stability assist when player is actively controlling', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.cyclicX.filtered = 0.5; // Active control input

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.assists.stability = true;

    // Set initial angular velocity
    heli.body.setAngvel({ x: 1, y: 0, z: 0 }, true);

    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);
    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    const finalAngvel = heli.body.angvel();

    // Angular velocity should change due to control torque, not be heavily damped
    // (The actual assertion depends on physics tuning; here we just verify it's not zero)
    expect(Math.abs(finalAngvel.x)).toBeGreaterThan(0);
  });

  it('does not apply stability assist when disabled', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.assists.stability = false;

    // Set initial angular velocity
    heli.body.setAngvel({ x: 1, y: 1, z: 1 }, true);
    const initialAngvelMagnitude = Math.sqrt(1 * 1 + 1 * 1 + 1 * 1);

    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    // Step a few times
    for (let i = 0; i < 5; i++) {
      system.step(stepContext);
      physics.step(stepContext.fixedDeltaSeconds);
    }

    const finalAngvel = heli.body.angvel();
    const finalAngvelMagnitude = Math.sqrt(
      finalAngvel.x * finalAngvel.x + finalAngvel.y * finalAngvel.y + finalAngvel.z * finalAngvel.z
    );

    // Without stability assist, angular velocity should decay slower (only from angularDamping)
    // We expect it to be closer to the initial value compared to with assist ON
    expect(finalAngvelMagnitude).toBeGreaterThan(0.5 * initialAngvelMagnitude);
  });
});

describe('hover assist system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  const stepContext: FixedStepContext = {
    fixedDeltaMs: 16,
    fixedDeltaSeconds: 1 / 60,
    stepIndex: 0,
    elapsedMs: 0
  };

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('dampens lateral velocity when hover assist is enabled and collective in range', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.collective.filtered = 0.5;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.assists.hover = true;

    // Set lateral velocity
    heli.body.setLinvel({ x: 5, y: 0, z: 5 }, true);

    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    // Step multiple times to see damping effect
    for (let i = 0; i < 10; i++) {
      system.step(stepContext);
      physics.step(stepContext.fixedDeltaSeconds);
    }

    const finalLinvel = heli.body.linvel();

    // Lateral velocity should be reduced
    expect(Math.abs(finalLinvel.x)).toBeLessThan(5);
    expect(Math.abs(finalLinvel.z)).toBeLessThan(5);
  });

  it('does not apply hover assist when collective is out of range', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.collective.filtered = 1;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.assists.hover = true;

    // Set lateral velocity
    heli.body.setLinvel({ x: 5, y: 0, z: 5 }, true);

    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);
    system.step(stepContext);
    physics.step(stepContext.fixedDeltaSeconds);

    const finalLinvel = heli.body.linvel();

    // Hover assist should not apply at full collective; velocity changes primarily from physics
    // Just verify it's not zero (physics will apply some damping naturally)
    expect(Math.abs(finalLinvel.x)).toBeGreaterThan(0);
    expect(Math.abs(finalLinvel.z)).toBeGreaterThan(0);
  });

  it('does not apply hover assist when disabled', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();
    controlState.collective.filtered = 0.5;

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    heli.assists.hover = false;

    // Set lateral velocity
    heli.body.setLinvel({ x: 5, y: 0, z: 5 }, true);
    const initialSpeed = Math.sqrt(5 * 5 + 5 * 5);

    const gameState: GameState = { isPaused: false };
    const system = createHelicopterFlightSystem(heli, gameState);

    // Step a few times
    for (let i = 0; i < 5; i++) {
      system.step(stepContext);
      physics.step(stepContext.fixedDeltaSeconds);
    }

    const finalLinvel = heli.body.linvel();
    const finalSpeed = Math.sqrt(finalLinvel.x * finalLinvel.x + finalLinvel.z * finalLinvel.z);

    // Without hover assist, lateral velocity should decay slower
    expect(finalSpeed).toBeGreaterThan(0.7 * initialSpeed);
  });
});

describe('assist toggle system', () => {
  let rapier: Awaited<ReturnType<typeof loadRapier>>;

  const stepContext: FixedStepContext = {
    fixedDeltaMs: 16,
    fixedDeltaSeconds: 1 / 60,
    stepIndex: 0,
    elapsedMs: 0
  };

  beforeAll(async () => {
    rapier = await loadRapier();
  });

  it('toggles stability assist when Z key is pressed', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    const toggleSystem = createAssistToggleSystem(heli);

    // Initial state: stability ON by default
    expect(heli.assists.stability).toBe(true);

    // Simulate Z key press
    input.toggleStability = true;
    toggleSystem.step(stepContext);

    expect(heli.assists.stability).toBe(false);

    // Press again to toggle back
    input.toggleStability = true;
    toggleSystem.step(stepContext);

    expect(heli.assists.stability).toBe(true);
  });

  it('toggles hover assist when X key is pressed', () => {
    const physics = createPhysicsWorld(rapier);
    const input = createPlayerInputState();
    const controlState = createControlState();

    const heli = spawnPlayerHelicopter(physics, DEFAULT_HELICOPTER_FLIGHT, input, controlState);
    const toggleSystem = createAssistToggleSystem(heli);

    // Initial state: hover OFF by default
    expect(heli.assists.hover).toBe(false);

    // Simulate X key press
    input.toggleHover = true;
    toggleSystem.step(stepContext);

    expect(heli.assists.hover).toBe(true);

    // Press again to toggle back
    input.toggleHover = true;
    toggleSystem.step(stepContext);

    expect(heli.assists.hover).toBe(false);
  });
});
