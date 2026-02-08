# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- TypeScript 5.5.4 - All game code, strict mode enabled
- HTML5/CSS3 - UI rendering and styling in `apps/game/src/ui/`

**JavaScript runtime features:**
- ECMAScript 2022+ via TypeScript ESNext target
- WebAssembly (WASM) for physics engine via Rapier

## Runtime

**Environment:**
- Node.js v24.12.0 (development and build time)
- Modern web browsers (ES2022 capable) with WebGL 2.0 for rendering

**Execution Model:**
- Browser-based (client-side only), no server-side code
- Fixed 60 Hz timestep loop in `apps/game/src/core/loop/fixedTimestepLoop.ts`
- Runs entirely in browser memory, no persistent storage

## Package Manager

**Tool:**
- pnpm 10.28.0
- Lockfile: pnpm-lock.yaml present
- Monorepo structure via pnpm workspaces (`pnpm-workspace.yaml`)
  - Root package.json manages shared dev dependencies
  - App: `apps/game` (main game application)

## Frameworks & Rendering

**3D Rendering:**
- Babylon.js 7.29.0 (`@babylonjs/core`)
  - Scene, camera, lighting, mesh rendering
  - Universal Camera for player camera control
  - Used in `apps/game/src/render/`

**Asset Loading:**
- @babylonjs/loaders 7.29.0
  - Mesh loading (`.gltf`, `.glb`, 3D model formats)
  - Asset manifest system in `apps/game/src/render/assets/`

**Physics Engine:**
- @dimforge/rapier3d-compat 0.19.3 (Rapier3D via WASM)
  - 3D rigid body physics
  - Colliders, raycasts, sensors
  - Loaded asynchronously in `apps/game/src/physics/rapierInstance.ts`
  - Wrapper in `apps/game/src/physics/world.ts`

**Game Architecture:**
- bitecs ECS (Entity Component System)
  - Not explicitly listed as dependency but referenced in CLAUDE.md
  - Component schemas in `apps/game/src/ecs/`
  - Used throughout sim, render, and physics systems

## Build Tools

**Primary:**
- Vite 5.4.7 - Module bundler and dev server
  - Config: `apps/game/vite.config.ts`
  - Dev server: port 5173, host 0.0.0.0
  - Preview server: port 4173, host 0.0.0.0
  - Path alias: `@/*` → `apps/game/src/*`

**TypeScript Compilation:**
- tsc 5.5.4 - Pre-build type checking (no emit)
  - Config extends from `tsconfig.base.json`
  - Module detection forced, strict mode enabled

## Testing Framework

**Unit Tests:**
- Vitest 2.1.1 - Test runner and assertion library
  - Config: `apps/game/vitest.config.ts`
  - Environment: jsdom (browser-like DOM)
  - Watch mode available
  - Excludes e2e tests from unit test run

**E2E Tests:**
- Playwright 1.49.1 - Browser automation
  - Config: `apps/game/playwright.config.ts`
  - Uses test reporter: HTML output to `./playwright-report`
  - Launches dev server on 5173
  - Timeout: 60s per test, 10s per assertion

**Test Utilities:**
- jsdom 27.4.0 - DOM implementation for Node.js tests
  - Provides window/document APIs for unit tests

## Code Quality Tools

**Linting:**
- ESLint 8.57.0 with TypeScript support
  - Parser: @typescript-eslint/parser 7.18.0
  - Plugin: @typescript-eslint/eslint-plugin 7.18.0
  - Config: `apps/game/.eslintrc.cjs`
  - Rules:
    - Enforce `import type` for type-only imports
    - Unused params with `_` prefix allowed
    - console allowed (no-console: off)
    - Max warnings: 0 (strict)

**Formatting:**
- Prettier 3.3.3 - Code formatter
  - Config: Root prettier config (extends eslint-config-prettier)
  - Settings: Single quotes, semicolons, no trailing commas, 100 char width
  - eslint-config-prettier 9.1.0 - Disables conflicting ESLint rules

**Cross-platform:**
- cross-env 7.0.3 - Cross-platform environment variables
  - Used in test scripts to clear NODE_OPTIONS

## Development Dependencies

**Type Definitions:**
- @types/node 22.7.4 - Node.js type definitions (used in scripts)

**Supporting Tools:**
- node:path - Built-in module for path resolution in vite.config.ts
- node:process - Built-in for process.env.CI detection in playwright.config.ts

## Configuration Files

**TypeScript:**
- `tsconfig.base.json` - Root config (ESNext, Bundler resolution, strict mode)
- `apps/game/tsconfig.json` - App-specific (Vite types, path aliases)

**Build:**
- `apps/game/vite.config.ts` - Vite server/preview ports, path aliases

**Testing:**
- `apps/game/vitest.config.ts` - jsdom environment, test globs
- `apps/game/playwright.config.ts` - Web server setup, test directory

**Linting:**
- `apps/game/.eslintrc.cjs` - ESLint rules (TypeScript strict, no-unused-vars)

**Scripts:**
- `apps/game/scripts/validate-assets.mjs` - Asset validation (Node.js)
  - Referenced in package.json but not core to build process

## Deployment & Distribution

**Browser Targets:**
- Modern browsers with ES2022 support
- WebGL 2.0 capable GPUs (for Babylon.js)
- Desktop environment (keyboard + mouse required per CLAUDE.md)

**Build Output:**
- Static bundle (HTML + JS + CSS + assets)
- No backend API required
- Can be deployed to any static file host

**Asset Pipeline:**
- Mesh assets (3D models) embedded or streamed
- Manifest-driven asset loading in `apps/game/src/render/assets/manifest.ts`
- Terrain and prop dressing streamed at runtime

## Runtime Feature Flags

**Environment Variables:**
- `VITE_ENABLE_DEBUG` - Enable/disable debug overlay (dev-only)
  - Default: matches `import.meta.env.DEV`
  - Set to "false" in vitest.config.ts to disable in tests
- `VITE_BUILD_LABEL` - Custom build label in UI
  - Default: "Reign of Rotor — Input Mapping"
- `CI` - Detect CI environment in playwright.config.ts

---

*Stack analysis: 2026-02-08*
