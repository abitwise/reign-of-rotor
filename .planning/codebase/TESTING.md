# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**
- Vitest (v2.1.1)
- Config: `apps/game/vitest.config.ts`
- Environment: jsdom (browser simulation)
- Globals enabled: `describe`, `it`, `expect` available without imports
- Inspect disabled to prevent debugger hangs

**Assertion Library:**
- Vitest built-in matchers via `expect`

**Run Commands:**
```bash
pnpm test                    # Run all tests once
pnpm test:watch              # Watch mode
cd apps/game && npx vitest run src/sim/helicopterFlight.test.ts  # Single test file
cd apps/game && npx vitest --watch                               # Watch single directory
pnpm test:e2e                # Playwright e2E tests
```

## Test File Organization

**Location:**
- Co-located with source: `src/sim/__tests__/helicopterFlight.test.ts` next to `src/sim/helicopterFlight.ts`
- All tests in `__tests__` subdirectories
- Pattern: `src/{feature}/__tests__/{feature}.test.ts`

**Naming:**
- File suffix: `.test.ts` (not `.spec.ts` though both are recognized)
- Test suite matches source module: `helicopterFlight.test.ts` tests `helicopterFlight.ts`

**Structure:**
```
src/
├── sim/
│   ├── helicopterFlight.ts
│   ├── cannon.ts
│   ├── telemetry.ts
│   └── __tests__/
│       ├── helicopterFlight.test.ts
│       ├── cannon.test.ts
│       └── telemetry.test.ts
├── ui/
│   ├── hudReadouts.ts
│   └── __tests__/
│       └── hudReadouts.test.ts
└── render/
    ├── meshBindingSystem.ts
    └── __tests__/
        └── meshBindingSystem.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'vitest';
import { createTelemetryState, recordTelemetryOnMissionEnd } from '../telemetry';

describe('telemetry', () => {
  it('records mission completion time once per seed', () => {
    const telemetry = createTelemetryState();
    const mission = createMission(1);

    recordTelemetryOnMissionEnd(telemetry, mission, ...);

    expect(telemetry.missionsRecorded).toBe(1);
  });
});
```

**Setup/Teardown Patterns:**
- `beforeAll()`: One-time async setup (e.g., loading Rapier WASM)
  ```typescript
  let rapier: Awaited<ReturnType<typeof loadRapier>>;
  beforeAll(async () => {
    rapier = await loadRapier();
  });
  ```
- `beforeEach()`: Not commonly used (tests create fresh state per case)
- Babylon.js cleanup: Manual `dispose()` after assertions
  ```typescript
  const engine = new NullEngine();
  const scene = new Scene(engine);
  // ... test ...
  scene.dispose();
  engine.dispose();
  ```

**Assertion Patterns:**
- Exact value checks: `expect(state.ammoRemaining).toBe(1)`
- Floating point: `expect(readout?.bearing).toBeCloseTo(90, 2)`
- Type checks: `expect(mesh.rotationQuaternion).toBeInstanceOf(Quaternion)`
- Array/object matching: `expect(executionOrder).toEqual(['input', 'physics', 'late'])`
- Boolean state: `expect(state.deployedThisFrame).toBe(true)`
- Range checks: `expect(state.cooldownRemaining).toBeGreaterThan(0)`
- Class matching: `expect(mesh.position.asArray()).toEqual([2, 4, -1])`

## Mocking

**Framework:** Vitest `vi` module

**Patterns:**
```typescript
import { describe, expect, it, vi } from 'vitest';

const onMissing = vi.fn();
const bindings = new MeshBindingSystem({
  transformProvider: () => null,
  onMissingTransform: onMissing
});

bindings.updateFromTransforms();
expect(onMissing).toHaveBeenCalledWith(42);
```

**What to Mock:**
- Callbacks/event handlers: `onMissing()`, `onLook()`
- External dependencies when testing isolated units
- Input state for controlled testing: `createPlayerInputState()` with preset values

**What NOT to Mock:**
- Rapier physics (use real physics world, cheap to instantiate)
- State factories (create real state objects)
- Core utilities (keep them deterministic)
- Babylon.js Scene/Engine (use NullEngine for headless testing)

**Test Doubles:**
- Stubs: Pre-configured state objects passed directly (most common)
  ```typescript
  const baseReadout: AvionicsReadout = { ... };
  const alerts = buildAvionicsAlerts({ ...baseReadout, powerMargin: 0.05 }, config);
  ```
- Spies: Vitest `vi.fn()` to verify calls

## Fixtures and Factories

**Test Data:**
- Inline test builders preferred: `createMission(seed)` creates throwaway mission runtime
- Base objects extended with overrides:
  ```typescript
  const baseReadout: AvionicsReadout = { ... };
  const alerts = buildAvionicsAlerts({ ...baseReadout, altitude: 50, verticalSpeed: -8 }, config);
  ```
- Utility builders in test files:
  ```typescript
  const makeTuning = (overrides: Partial<ControlTuning> = {}): ControlTuning => ({
    collective: { expo: 1, smoothingTau: 0, slewRate: 0, releaseSlewMultiplier: 1 },
    cyclicX: { ... },
    ...overrides
  });
  ```

**Location:**
- Test-specific helpers stay in test file (not extracted)
- Reusable factories in source (e.g., `createPlayerHelicopter()`) shared across tests
- Example: `spawnPlayerHelicopter()` used by multiple test suites

## Coverage

**Requirements:** Not enforced (no coverage thresholds configured)

**View Coverage:**
```bash
pnpm test -- --coverage  # Not currently configured
```

**Practice:** Tests focus on critical paths (simulation, rendering, input processing) rather than coverage %

## Test Types

**Unit Tests (primary):**
- Test individual functions/systems in isolation
- Create state with `createTelemetryState()`, call functions, assert results
- Example: `telemetry.test.ts` tests `recordTelemetryOnMissionEnd()` function
- Scope: Single module or utility
- Most tests in codebase (15+ test suites)

**Integration Tests:**
- Test system interactions and state changes over time
- Missile test: Spawn helicopter + target, step physics, verify lock acquisition
- Example `missile.test.ts`:
  ```typescript
  const heli = spawnPlayerHelicopter(physics, ..., input, createControlState());
  const system = createMissileSystem({ heli, physics, config, state, ... });

  for (let i = 0; i < 20; i += 1) {
    physics.step(stepContext.fixedDeltaSeconds);
    system.step(stepContext);
  }

  expect(missileState.lockStatus).toBe('LOCKED');
  ```
- Setup: Full physics world, multiple entities, real systems
- Scope: Multiple systems interacting

**Rendering Tests:**
- Test mesh bindings and UI state updates
- Example `meshBindingSystem.test.ts`: Create scene, bind meshes, update transforms
- Setup: Babylon.js Scene/NullEngine, real binding system
- Assert: Mesh properties updated correctly

**E2E Tests (Playwright):**
- Single smoke test: `e2e/smoke.spec.ts`
- Tests game boots, starts mission, UI responds
- Scope: Full page load, mission loop, UI interaction
- Assert: No page errors, UI elements visible/clickable

## Common Patterns

**Async Testing with Rapier:**
```typescript
let rapier: Awaited<ReturnType<typeof loadRapier>>;

beforeAll(async () => {
  rapier = await loadRapier();  // Load WASM once
});

it('acquires lock after sustained aim', () => {
  const physics = createPhysicsWorld(rapier);  // Reuse rapier instance
  // ... test ...
});
```

**Error Testing:**
- Not heavily used (simulation must not throw)
- When testing error messages, use direct function calls and type checks
- Example would be: testing that `throw new Error('...')` has correct message

**Fixed Timestep Testing:**
- Create `stepContext` once:
  ```typescript
  const stepContext: FixedStepContext = {
    fixedDeltaMs: 16,
    fixedDeltaSeconds: 1 / 60,
    stepIndex: 0,
    elapsedMs: 0
  };
  ```
- Reuse across multiple `system.step(stepContext)` calls
- Verify state progression over multiple steps

**Control State Testing:**
Pattern from `controlState.test.ts`:
```typescript
const tuning = makeTuning({ cyclicX: { expo: 2, smoothingTau: 0, slewRate: 0 } });
const state = createControlState();
const input = createPlayerInputState();
input.cyclicX = 0.5;

updateControlState(state, input, tuning, 0.016);

expect(state.cyclicX.filtered).toBeCloseTo(expectedValue);
```

## Test Execution Notes

**Environment:**
- Tests run in jsdom (browser simulation), not Node.js
- Can use DOM APIs: `document.createElement()`, `HTMLElement`
- Rapier WASM loads before test suite (async)
- CPU-intensive: full physics world per test

**Isolation:**
- Tests are fully isolated (fresh state per test)
- No shared global state between tests
- Cleanup: Babylon.js resources cleaned up immediately

**Performance:**
- Total test suite runs in ~5 seconds (quick feedback)
- Heavy tests: missile targeting, terrain chunks
- Lightweight tests: telemetry recording, state mutations

---

*Testing analysis: 2026-02-08*
