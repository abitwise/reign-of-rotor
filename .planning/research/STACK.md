# Stack Research

**Domain:** Browser helicopter combat game -- subsequent milestone (MVP completion)
**Researched:** 2026-02-08
**Confidence:** HIGH (existing stack locked; recommendations are additive, not foundational)

## Context

Phase 1 (MVP Demo) is complete. The core engine is built and running. This research covers **additional** stack elements needed for the remaining MVP features:

1. Mission briefing/debrief screens (full-screen UI flows)
2. RWR threat warning display (radar-scope-style widget)
3. Subsystem damage HUD indicators
4. Escort mission AI improvements
5. Visual polish (particles, screen effects, post-processing)
6. Audio (weapon sounds, engine loops, threat cues)
7. Mission flow state machine (briefing -> flight -> debrief transitions)

The core stack is **locked and not re-evaluated** here:
- TypeScript 5.5.4 (strict)
- Vite 5.4 (build, dev server)
- Babylon.js 7.29+ (installed: 7.54.3)
- Rapier3D WASM 0.19.3 (physics)
- pnpm 10.28 monorepo
- Vitest 2.1 + Playwright 1.49 (testing)

## Recommended Stack Additions

### No New Runtime Dependencies Required

The critical finding of this research: **no new runtime libraries are needed** for MVP completion. Every remaining feature can be implemented with what is already installed or with browser-native APIs. This is a significant advantage -- zero new dependency risk, zero new bundle size, zero new API surfaces to learn.

### UI Layer: Plain DOM (Already In Use)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Plain HTML/CSS + TypeScript DOM API | Native | Mission briefing, debrief, RWR display, damage indicators | Already the pattern for all existing UI. The codebase uses `document.createElement()` factories returning controller objects. Zero framework overhead. No new learning curve. |

**Confidence:** HIGH -- this is not a recommendation; it is what already works.

**Why not add a UI framework (React, Vue, Solid, etc.):**
- The existing UI codebase (~1000 lines in `root.ts`) is well-structured with a consistent `create*()` -> `{ element, update, destroy }` pattern.
- All UI is positioned via CSS `position: fixed` overlays with `pointer-events: none` containers.
- Adding a framework introduces a build pipeline dependency (JSX/SFC compilation), a bundle size cost (30-80 KB min), and a paradigm conflict with the imperative game loop.
- The HUD updates via `requestAnimationFrame` pulling from provider functions -- this is fundamentally a pull/poll model, not reactive. Frameworks add overhead for a pattern they are not designed to optimize.
- **Decision: Stay with plain DOM.** The existing pattern is correct for this use case.

### RWR Threat Warning Display: HTML5 Canvas 2D

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Canvas 2D API | Native | RWR radar scope widget (circular display with threat direction indicators) | The RWR is a real-time 2D instrument overlay showing threat bearings on a compass rose. Canvas 2D is ideal: it renders circles, lines, and text efficiently; it composites cleanly over the 3D viewport via CSS; and it does not require Babylon.js scene integration. Avoids SVG because the RWR redraws every frame (SVG DOM manipulation would be slower). |

**Confidence:** HIGH -- Canvas 2D is the standard approach for game HUD instruments that require 2D drawing primitives (compass roses, radar scopes, gauges).

**Implementation pattern:**
- Create a `<canvas>` element positioned via CSS (same as other HUD panels).
- On each HUD frame tick, clear and redraw: compass rose, player heading marker, threat bearing indicators (scan/lock/launch styled differently), range rings.
- Data comes from the existing `ThreatReadout` and `AvionicsReadout` providers -- extend `ThreatReadout` to include bearing and range per threat.
- No new dependencies. The Canvas 2D API is available in all target browsers.

### Visual Effects: Babylon.js Built-in Particle System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@babylonjs/core` ParticleSystem | 7.54.3 (installed) | Missile trails, explosions, muzzle flash, flare ejection, engine exhaust | Babylon.js ships with both CPU and GPU particle systems. GPU particles (`GPUParticleSystem`) handle thousands of particles efficiently. The existing codebase already has explosion event data (`SamExplosionEvent` with position, radius, fxId`) -- these just need visual binding. No additional library needed. |

**Confidence:** HIGH -- Babylon.js particle system is mature, well-documented, and already available in the installed version.

**Implementation pattern:**
- Create particle system presets in `content/` (explosion, trail, muzzle flash, flare).
- Create a `VfxManager` in `render/` that listens to explosion events and spawns pre-configured particle systems at event positions.
- Use `ParticleSystem` for low-count effects (muzzle flash, flare) and `GPUParticleSystem` for high-count effects (explosions, smoke trails).
- Pool particle systems to avoid GC spikes (consistent with existing entity pooling pattern).

### Post-Processing: Babylon.js Built-in Pipeline

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@babylonjs/core` DefaultRenderingPipeline | 7.54.3 (installed) | Bloom (explosions/tracers glow), tone mapping, optional FXAA | Babylon.js includes `DefaultRenderingPipeline` which bundles bloom, tone mapping, chromatic aberration, grain, and anti-aliasing. Selective -- enable only bloom + tone mapping for MVP. No new dependency. |

**Confidence:** HIGH -- built into the installed version.

**Caution:** Post-processing costs GPU budget. Enable conservatively. Bloom on explosions and tracers is the highest-value effect for lowest cost. Skip depth-of-field, motion blur, and SSAO for MVP.

### Audio: Babylon.js Built-in Audio Engine

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@babylonjs/core` Sound / AudioEngine | 7.54.3 (installed) | Engine loop, rotor sounds, weapon fire, missile lock tone, RWR beeps, explosion SFX | Babylon.js wraps Web Audio API with spatial audio, looping, volume control, and scene integration. Sufficient for MVP audio needs. No additional audio library needed. |

**Confidence:** HIGH -- Babylon.js audio is well-tested. The alternative (Howler.js, Tone.js) would add dependencies for no benefit at MVP scope.

**Implementation pattern:**
- Create audio presets in `content/audioPresets.ts` (sound ID -> file path, volume, loop, spatial settings).
- Create `AudioManager` in `render/` (audio is render-adjacent, not sim) that loads sounds and provides `play(soundId, position?)` API.
- Wire to game events: weapon fire, explosion, RWR state changes, engine RPM (pitch-shift loop based on `rotorRpm`).
- Respect browser autoplay policies: require user interaction before starting audio context (the existing "Start Flying" button click is the natural trigger).

### CSS Animations: Native CSS

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| CSS `@keyframes` + `transition` | Native | HUD alert flashing, debrief panel entrance, damage vignette pulse | Already in use (transitions on `.debrief-overlay`, `.instructions-overlay`). Extend with `@keyframes` for pulsing alert banners, screen-edge damage vignette (CSS `box-shadow: inset`), and subsystem damage indicator blink. No animation library needed. |

**Confidence:** HIGH -- CSS animations are performant (GPU-composited) and already used.

### State Machine for Mission Flow: Plain TypeScript

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Custom state machine (plain TS) | N/A | Mission flow transitions: `idle -> briefing -> active -> debrief -> idle` | The existing `MissionRuntime.status` field (`active | completed | failed`) is already a basic state machine. Extend it to include `briefing` and `debrief` states. A library like XState would add 30+ KB for a 5-state linear flow -- massive overkill. |

**Confidence:** HIGH -- this is the correct engineering decision for a linear state flow with no concurrent regions or complex guards.

## Supporting Libraries (Optional, Low Priority)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@babylonjs/gui` | 7.54.3 | 2D GUI rendered in Babylon.js texture (alternative to HTML overlay) | **Do not use for MVP.** Only consider if HTML overlay causes pointer-event conflicts with 3D scene interaction in future phases. The HTML approach is working and more maintainable. |
| `howler.js` | 2.2.4 | Audio playback library | **Do not use.** Babylon.js audio engine covers all MVP needs. Only consider if Babylon.js audio has browser-specific bugs that block shipping. |

## Development Tools (Already Adequate)

The existing dev toolchain (ESLint, Prettier, Vitest, Playwright, cross-env) is complete and does not need additions for MVP completion.

| Consideration | Assessment |
|---------------|------------|
| Additional test utilities | Not needed. Vitest + jsdom covers unit tests. The existing test pattern (mock physics, test pure functions) scales to all remaining features. |
| Visual regression testing | Not needed for MVP. The game renders to WebGL canvas which is not deterministic across GPUs. Playwright screenshot tests would be flaky. |
| Performance profiling | Use browser DevTools (Chrome Performance tab, Babylon.js Inspector). No library needed. Babylon.js Inspector can be imported dynamically in dev builds via `@babylonjs/inspector` if desired. |
| Bundle analysis | `vite build --report` or `npx vite-bundle-visualizer` (one-off, no install needed). |

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Plain DOM for UI | React / Vue / Solid | Adds 30-80 KB, build complexity (JSX), paradigm mismatch with imperative game loop, and rewrite of existing working UI code. |
| Plain DOM for UI | lit-html / htm | Lighter than React, but still adds a template engine dependency for a pattern that is already clean with `createElement`. |
| Canvas 2D for RWR | SVG | SVG manipulates DOM nodes per element. RWR redraws 60x/sec -- Canvas 2D is more efficient for real-time instrument displays. |
| Canvas 2D for RWR | Babylon.js GUI texture | Would tie the 2D instrument to the 3D render pipeline, complicating layout and overlay positioning. HTML/Canvas overlay is simpler and decoupled. |
| Babylon.js particles | Three.js particles / custom WebGL | Wrong engine. The project uses Babylon.js; mixing renderers creates context conflicts and doubles GPU memory. |
| Babylon.js audio | Howler.js | Adds a dependency for no benefit. Babylon.js audio wraps Web Audio API adequately. Howler.js has better mobile support, but mobile is out of scope. |
| Plain TS state machine | XState | XState adds 30+ KB for a trivial 5-state linear flow. The mission flow has no concurrent regions, complex guards, or dynamic spawning that would justify a state machine library. |
| CSS animations | GSAP / anime.js | Adds dependency for simple transitions already achievable with CSS `@keyframes` and `transition`. GSAP is 25+ KB. Not justified. |
| No new dependencies | bitecs (formally adopt) | bitecs is referenced in docs but not actually used in code. The project uses a simpler custom entity/component pattern with TypeScript types and Map-based lookups. Formally adopting bitecs now would require refactoring all existing ECS code for no MVP benefit. Defer. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React / Vue / Solid for HUD | Bundle size, build complexity, paradigm conflict with imperative game loop. Existing plain DOM pattern works well. | Plain DOM with `create*()` factory pattern (existing). |
| XState / robot3 for mission flow | Massive overkill for a 5-state linear flow. Adds dependency and learning curve. | Plain TypeScript enum + switch/if state transitions. |
| @babylonjs/gui for HUD | Renders UI into Babylon.js texture plane. Harder to style, debug, and position than HTML/CSS. Worse text rendering. | HTML/CSS overlay (existing). |
| Three.js (any part) | Mixing 3D engines in the same project causes WebGL context conflicts, doubled GPU memory, and API confusion. | Use Babylon.js exclusively. |
| Tailwind CSS / CSS-in-JS | The project has a single `style.css` file with ~800 lines of well-organized CSS. Adding a CSS framework creates build pipeline changes and conceptual overhead for a game HUD that has no design system requirements. | Continue with plain CSS in `style.css`. |
| Web Components | Adds shadow DOM complexity for no benefit. The HUD is a single-page app with no component reuse across projects. | Plain DOM. |
| Socket.io / WebRTC | Multiplayer is explicitly out of scope for MVP. | N/A -- defer to Phase 5. |
| IndexedDB / localStorage | No persistence features in MVP. Save/load is a post-MVP concern. | N/A -- defer. |

## Installation

```bash
# No new packages needed for MVP completion.
# The existing dependencies cover all remaining features.

# If Babylon.js Inspector is desired for dev builds (optional):
pnpm --filter @reign-of-rotor/game add -D @babylonjs/inspector
```

## Version Compatibility

| Package | Installed | Compatible With | Notes |
|---------|-----------|-----------------|-------|
| @babylonjs/core | 7.54.3 | @babylonjs/loaders@7.54.3 | Must keep Babylon.js packages at same version. Auto-resolved by `^7.29.0` specifier. |
| @babylonjs/core | 7.54.3 | @babylonjs/inspector@7.54.3 | If added. Must match core version exactly. |
| @babylonjs/core | 7.54.3 | @babylonjs/gui@7.54.3 | If ever added. Must match core version. Not recommended for MVP. |
| @dimforge/rapier3d-compat | 0.19.3 | @babylonjs/core@7.54.3 | No direct dependency. Both use separate WebAssembly/WebGL contexts. Coexist without conflict. |
| TypeScript | 5.5.4 | All dependencies | Babylon.js 7.x requires TS 4.7+. Rapier types work with TS 5.x. No issues. |
| Vite | 5.4.7 | TypeScript 5.5.4 | Vite 5 supports TS 5.x natively. |

## Key Implementation Notes for Remaining Features

### Mission Briefing Screen
- **Stack impact:** None. Extend existing `createInstructionsPanel()` pattern.
- **Approach:** Create `createBriefingOverlay()` in `ui/` that reads `MissionPlan` data and shows objectives, map sketch (Canvas 2D), and "Launch" button.
- **Data source:** `MissionPlan` from `content/missions.ts` already contains template name, summary, objectives, waypoints.

### Debrief Screen Enhancement
- **Stack impact:** None. Already exists in `createDebriefOverlay()`.
- **Approach:** Extend `DebriefReadout` type with subsystem damage breakdown, accuracy percentage, and mission time rating. Add CSS for styled stat cards.

### RWR Threat Warning Display
- **Stack impact:** Canvas 2D API (native, no install).
- **Approach:** Create `createRwrDisplay()` in `ui/` with a small `<canvas>` element. Extend `ThreatReadout` to include per-threat bearing and range. Draw compass rose + threat markers on each HUD tick.
- **Data source:** `EnemyState` already tracks radar sites, SAM sites, and their positions. Computing bearing from player is trivial (already done in `buildNavigationReadout`).

### Subsystem Damage HUD
- **Stack impact:** None. CSS for damage indicators.
- **Approach:** Create damage indicator panel in `ui/` showing 5 subsystem bars (engine, rotor, avionics, weapons, sensors). Read from `PlayerDamageState.subsystems`. Flash damaged bars with CSS animation. Show degraded color (green -> yellow -> red -> black) based on health value.
- **Data source:** `PlayerDamageState` and `PlayerSubsystemHealth` already exist and track all 5 subsystems.

### Escort Mission AI
- **Stack impact:** None. Already implemented in `convoy.ts`.
- **Approach:** The convoy waypoint-rail system works. Improvements: add convoy health tracking, add "convoy under attack" alert when enemies target convoy vehicles, add escort fail condition if convoy is destroyed.
- **Data source:** `ConvoyState` and `ConvoyVehicle` already exist.

### Visual Effects (Particles)
- **Stack impact:** None. Babylon.js `ParticleSystem` is already installed.
- **Approach:** Create VFX presets in `content/`, create `VfxManager` in `render/` that binds to explosion events.

### Audio
- **Stack impact:** None. Babylon.js `Sound` class is already installed.
- **Approach:** Create audio config in `content/`, create `AudioManager` in `render/`.

## Sources

- Codebase analysis of `apps/game/package.json` -- installed dependencies verified via `pnpm-lock.yaml`
- Codebase analysis of `apps/game/src/ui/root.ts` -- existing UI pattern (1026 lines of plain DOM)
- Codebase analysis of `apps/game/src/ui/hudReadouts.ts` -- existing data provider pattern
- Codebase analysis of `apps/game/src/sim/playerDamage.ts` -- subsystem damage already implemented
- Codebase analysis of `apps/game/src/sim/missionDirector.ts` -- mission state machine exists
- Codebase analysis of `apps/game/src/sim/convoy.ts` -- escort AI already implemented
- Codebase analysis of `apps/game/src/sim/enemies.ts` -- threat data already available
- Codebase analysis of `apps/game/src/content/avionics.ts` -- RWR labels and thresholds exist
- Codebase analysis of `apps/game/src/render/bootstrap.ts` -- Babylon.js scene setup pattern
- Codebase analysis of `apps/game/src/style.css` -- existing CSS patterns (793 lines)
- Babylon.js documentation (training data, MEDIUM confidence): ParticleSystem, GPUParticleSystem, DefaultRenderingPipeline, Sound class -- all available in v7.x
- Web Audio API specification (training data, HIGH confidence): universally supported in modern browsers

---
*Stack research for: Reign of Rotor MVP completion (subsequent milestone)*
*Researched: 2026-02-08*
