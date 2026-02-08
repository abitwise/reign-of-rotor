# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Kebab-case for file names: `helicopterFlight.ts`, `fixed-timestep-loop.ts`
- Test files use `__tests__` subdirectory with `.test.ts` suffix: `src/sim/__tests__/helicopterFlight.test.ts`
- System files follow `*System.ts` pattern: `systemScheduler.ts`, `meshBindingSystem.ts`
- Factory/state files use `create*` prefixes in exports: `createTelemetryState()`, `createHelicopterFlightSystem()`

**Functions:**
- Factory functions: `create*` prefix returns state/instances. Examples: `createPhysicsWorld()`, `createControlState()`, `createCannonSystem()`
- Spawn functions: `spawn*` prefix creates entities with bindings. Examples: `spawnPlayerHelicopter()`, `spawnMissile()`
- System creators: `create*System()` returns `LoopSystem` objects
- Utility functions: lowercase camelCase, no special prefix: `rotateVector()`, `isTrimActive()`
- Private/internal functions: lowercase with underscore prefix if unused params needed: `_clamp01()`

**Variables:**
- Lowercase camelCase: `stepContext`, `missileState`, `rapier`
- State objects: descriptive singular nouns: `telemetry`, `mission`, `physics`
- Event handlers: `on*` prefix: `onMissing()`, `onLook()`
- Unused parameters: `_` prefix: `_clampMs`, `_unused`

**Types:**
- Component types: `C` prefix (ECS convention): `CHelicopterFlight`, `CHelicopterAssists`, `CPlayerInput`
- State types: `*State` suffix: `TelemetryState`, `CannonState`, `HelicopterPowerState`
- Config types: `*Config` suffix: `CannonConfig`, `MissileConfig`, `ControlTuning`
- Type exports alongside implementations for public APIs
- `type` imports always used for type-only imports (ESLint enforced)

## Code Style

**Formatting:**
- Tool: Prettier (configured in `.prettierrc`)
- Single quotes: `'hello'` not `"hello"`
- Semicolons required: all statements end with `;`
- Trailing commas disabled: `{ a: 1, b: 2 }` not `{ a: 1, b: 2, }`
- Print width: 100 characters
- Tab width: 2 spaces
- Apply via `pnpm format`

**Linting:**
- Tool: ESLint with TypeScript support (config: `apps/game/.eslintrc.cjs`)
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `prettier`
- Max warnings: 0 (checked by `pnpm lint`)
- Consistent type imports enforced: use `import type` for type-only imports
- No `console` warnings allowed but `console.error()`, `console.info()`, `console.warn()` are permitted
- Unused variables: must be prefixed with `_` or ignored via pattern (e.g., `argsIgnorePattern: '^_'`)
- Environments: browser, ES2022, node

**TypeScript:**
- Strict mode enabled via tsconfig
- No `any` allowed in core sim/physics paths
- `moduleResolution: Bundler`, `moduleDetection: force`
- Path alias `@/*` maps to `apps/game/src/*`
- Target: ES2022, module: ESNext

## Import Organization

**Order:**
1. External packages: `import { ... } from '@babylonjs/core'`
2. Internal modules: `import { ... } from '../core/...'` or `import { ... } from '@/core/...'`
3. Type imports separated with `import type` at top of each group: `import type { LoopSystem } from '../core/loop/types'`
4. Side effects (rarely used): `import './style.css'`

**Path Aliases:**
- Absolute imports preferred: `import { ... } from '@/sim/...'`
- Relative imports used when crossing layers or in tests
- Files never import from higher or unrelated layers (e.g., `sim` never imports from `render` or `ui`)

## Error Handling

**Patterns:**
- Throw `Error` with descriptive messages for unrecoverable states: `throw new Error('Root container #root is missing in index.html')`
- Guard clauses for early returns: `if (!entity) return null;`
- Null/undefined returns for optional cases: `getEntityTransform()` returns `Transform | null`
- No try-catch in core sim/physics (simulation must be deterministic)
- Error logging uses `console.error()` with context in boot/initialization code: `console.error('Renderer failed to bootstrap', error)`
- Fallback behavior with `console.warn()` for recoverable issues: `console.warn('Falling back to placeholder mesh')`

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- `console.error()`: Fatal errors during initialization or failures
- `console.info()`: Mission/gameplay telemetry (guarded by `NODE_ENV !== 'production'`): `console.info('[Telemetry]', ...)`
- `console.warn()`: Non-fatal fallbacks: `console.warn('Asset manifest unavailable')`
- `console.debug?.()`: Optional debug output (safe for tree-shaking): `console.debug?.('Prop dressing ready')`
- No logging in tight simulation loops (impacts perf)
- Logs include context prefix when relevant: `[Telemetry]`, `[System]`

## Comments

**When to Comment:**
- Complex algorithms require explanation: control smoothing math, physics calculations, targeting logic
- Business rules documented: mission objectives, weapon behavior thresholds
- Non-obvious parameter meanings in types: JSDoc on class/type fields
- TODO/FIXME allowed but rare (code is generally clean)

**JSDoc/TSDoc:**
- Used for public functions and types in `controlState.ts` and `telemetry.ts`
- Format: `/** ... */` above type/function
- Example from code:
  ```typescript
  export type YawRateControllerTuning = {
    /**
     * Maximum yaw rate in radians per second.
     */
    maxRateRad: number;
    /**
     * Controller gain used to convert yaw-rate error into a normalized command.
     * Higher values respond faster but can feel twitchy with keyboard input.
     */
    damping: number;
  };
  ```
- Parameter docs on complex types: `@param`, `@returns` not used (rely on inline docs)

## Function Design

**Size:**
- Prefer small, focused functions (most 30-50 lines)
- Core system `step()` functions: 20-40 lines typical
- Helper functions extracted: `updatePowerModel()`, `fireCannonShot()`, `recycleImpactEvents()`

**Parameters:**
- Destructured objects for factory functions: `createMissileSystem({ heli, physics, config, ... })`
- Positional args only for core operations (e.g., `Math.max()`, `setTranslation()`)
- Required vs optional options: default to `= {}` for optional object parameters
- Example: `spawnPlayerHelicopter(..., options: { startHeight?: number; ... } = {})`

**Return Values:**
- Functions return typed objects or primitives
- Factories return immutable configs or state objects
- Systems return `LoopSystem` interface: `{ id, phase, step }`
- Null for "not found": `getEntityTransform()` returns `Transform | null`
- Never throw in render/update loops (return safe defaults instead)

## Module Design

**Exports:**
- State creators always exported: `export const createCannonState = ...`
- System creators always exported: `export const createCannonSystem = ...`
- Internal helpers may be unexported (used in same file)
- Type definitions always exported for public APIs
- Example module structure (`cannon.ts`):
  ```typescript
  export type CannonState = { ... }
  export type CannonConfig = { ... }
  export const createCannonState = (...) => { ... }
  export const createCannonSystem = (...) => { ... }
  const fireCannonShot = (...) => { ... }  // internal helper
  ```

**Barrel Files:**
- Not heavily used in this codebase
- Most imports direct to source files: `import { createControlState } from '../core/input/controlState'`

## Object Pooling

**When Used:**
- Frequently spawned/destroyed entities: missiles, flares, impact events
- Event objects that are recycled: `impactEventPool`, `damageEventPool`
- Pattern in `cannon.ts`:
  ```typescript
  export type CannonState = {
    impactEvents: CannonImpactEvent[];
    damageEvents: CannonDamageEvent[];
    impactEventPool: CannonImpactEvent[];
    damageEventPool: CannonDamageEvent[];
  };
  ```
- Reuse pattern: pop from pool or create new, then release back to pool in next frame

## Constants

**Location:**
- Hardcoded tuning values in `content/` directory configs: `DEFAULT_HELICOPTER_FLIGHT`, `DIFFICULTY_PRESETS`
- Immutable data-driven configs preferred over scattered constants
- Examples: `content/helicopters.ts`, `content/weapons.ts`, `content/difficulty.ts`

---

*Convention analysis: 2026-02-08*
