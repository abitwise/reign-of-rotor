# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Not applicable.** Reign of Rotor contains no external API integrations. The application is entirely self-contained.

## Data Storage

**Databases:**
- None. Reign of Rotor is a stateless, client-side game with no persistent storage or database backend.

**File Storage:**
- Local filesystem only (development assets)
- Browser-based asset streaming at runtime via Babylon.js asset loader
  - Assets referenced in `apps/game/src/render/assets/manifest.ts`
  - No external CDN or remote storage integration

**Caching:**
- Browser native caching (HTTP cache headers handled by server/CDN)
- No explicit in-app caching layer (Babylon.js handles WebGL texture caching)

**Browser Storage:**
- localStorage: Not used
- sessionStorage: Not used
- IndexedDB: Not used

## Authentication & Identity

**Auth Provider:**
- None. Desktop game with no user accounts or authentication required.
- Game state persists only in memory during play session
- No login, registration, or session management

## Monitoring & Observability

**Error Tracking:**
- None configured. Errors logged to browser console via `console.error()`
  - See `apps/game/src/boot/createApp.ts` for error handler patterns

**Logs:**
- Browser console only (console.error, console.log)
- No remote logging service integrated
- Debug overlay available (disabled in production) in `apps/game/src/ui/debugOverlay.ts`

**Telemetry:**
- No telemetry service integrated
- Local frame metrics tracked via `FixedTimestepLoop` in `apps/game/src/core/loop/fixedTimestepLoop.ts`
- Displayed in HUD via `buildAvionicsReadout()` in `apps/game/src/ui/hudReadouts.ts`

## CI/CD & Deployment

**Hosting:**
- Static file hosting only (no backend server)
- Any static host works (GitHub Pages, Netlify, Vercel, S3, etc.)

**CI Pipeline:**
- Not configured in this repository
- Deployment candidates:
  - TypeScript type check: `tsc --noEmit`
  - Build: `vite build`
  - Tests: `vitest run` and `playwright test`
  - Linting: `eslint . --max-warnings 0`

**Build Commands:**
```bash
pnpm build           # Type check + Vite production build
pnpm test            # Run unit tests (jsdom)
pnpm test:e2e        # Run Playwright e2e tests
pnpm lint            # ESLint strict mode
pnpm format          # Prettier format
```

## Environment Configuration

**Required Environment Variables:**
- None. Application runs with defaults if all variables are absent.

**Optional Environment Variables:**
- `VITE_ENABLE_DEBUG` - Enable debug overlay (string: "true" or "false")
- `VITE_BUILD_LABEL` - Custom build label for UI header
- `CI` - Detected by Playwright config to reuse existing dev server

**Secrets Location:**
- Not applicable. No secrets used in client-side game.

**Configuration Sources:**
- App config in `apps/game/src/boot/config.ts`
  - Reads from `import.meta.env` (Vite environment variables)
  - Builds `AppConfig` object with mode, isDev, isProd, enableDebugOverlay, buildLabel

## Webhooks & Callbacks

**Incoming Webhooks:**
- None.

**Outgoing Webhooks:**
- None.

**Event System (Internal):**
- Event-based communication between UI and simulation via state callbacks
  - Example: Input capture in `apps/game/src/core/input/playerInput.ts`
  - Callbacks set dynamically in `apps/game/src/boot/createApp.ts` (lines 58-124)
  - No external webhook or network events

## Browser APIs Used

**Window/DOM:**
- `window.addEventListener('keydown')` - Keyboard input capture
- `document.createElement()` - Dynamic UI element creation
- `document.querySelector()` - Root element selection

**Graphics:**
- WebGL 2.0 - Via Babylon.js Engine
- WebAssembly (WASM) - Rapier physics engine in `@dimforge/rapier3d-compat`

**No usage of:**
- Service Workers
- Web Workers (except Rapier WASM implicit threading)
- fetch() or XMLHttpRequest
- Geolocation
- Permissions API
- Media APIs

## Asset Pipeline

**Asset Loading:**
- Manifest-driven system in `apps/game/src/render/assets/`
- Babylon.js AssetContainer loading
- Mesh assets (gltf/glb) streamed from local/bundled sources

**Terrain Streaming:**
- Terrain chunks generated procedurally and cached
- `apps/game/src/render/terrain/terrainChunkManager.ts` manages runtime mesh generation

**Content Configuration (Data-Driven):**
Located in `apps/game/src/content/`:
- `missions.ts` - Mission template definitions
- `weapons.ts` - Weapon specifications (damage, ammo, rates)
- `enemies.ts` - Enemy configurations (health, behavior)
- `difficulty.ts` - Difficulty presets (game balance tuning)
- `controls.ts` - Control sensitivity presets
- `helicopters.ts` - Player helicopter specs
- `avionics.ts` - Avionics system tuning
- `countermeasures.ts` - Countermeasure configs
- `world.ts` - World parameters (bounds, physics)
- `propDressing.ts` - Decorative objects (trees, buildings)

All content configs are JSON/TypeScript objects with no external data source—fully embedded in codebase.

---

*Integration audit: 2026-02-08*
