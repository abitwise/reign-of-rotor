# Project Research Summary

**Project:** Reign of Rotor MVP Completion
**Domain:** Browser helicopter combat game (subsequent milestone after MVP Demo)
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

Reign of Rotor is a browser-based helicopter combat game inspired by DOS-era LHX: Attack Chopper, built with TypeScript, Babylon.js, Rapier WASM physics, and a custom ECS architecture. The core engine (Phase 1 MVP Demo) is complete and running with flight physics, weapons, damage model, and basic missions. This research covers five remaining features needed to complete the full MVP: mission briefing/debrief screens, RWR threat warning display, subsystem damage HUD, escort mission improvements, and visual/audio polish.

The critical finding: no new runtime dependencies are needed. Every remaining feature can be implemented with the existing stack (Babylon.js 7.54.3, plain DOM/CSS, Canvas 2D, native Web Audio). The biggest risk is not technical complexity but architectural discipline: the game currently has no formal state machine for mission flow, which blocks clean restart and UI transitions. This must be addressed first before any UI screens are built. The second major risk is that many systems exist in code but lack player-facing feedback (missile lock has no audio tone, damage has no visual indicators, RWR has no bearing display) — the gap between "implemented" and "playable" is larger than it appears.

The recommended approach: build foundation-first in strict dependency order. Phase 1 must establish the game state machine and teardown/restart capability. Only then can mission flow UI be added. Combat feedback (audio, HUD indicators) should come next because it makes existing systems feel complete. Visual polish (particles, post-processing) should be last because it depends on everything else being tuned and stable. Avoid the temptation to add "just one more UI screen" without the state machine — this leads to irrecoverable tech debt.

## Key Findings

### Recommended Stack

The existing stack is locked and correct. No new runtime dependencies are required for MVP completion. This is a significant advantage: zero new dependency risk, zero bundle size increase, zero new API surface to learn.

**Core technologies (already installed):**
- **TypeScript 5.5.4 + Vite 5.4** — build toolchain, already working
- **Babylon.js 7.54.3** — rendering engine with built-in particles, post-processing, and audio wrapping Web Audio API
- **Rapier3D WASM 0.19.3** — physics engine, already integrated
- **Plain DOM/CSS** — UI layer, already used for all HUD elements with a clean `create*() → { element, update, destroy }` factory pattern
- **Canvas 2D API (native)** — for RWR radar scope widget, ideal for real-time instrument displays
- **Web Audio API (native)** — audio via Babylon.js Sound class wrappers

**Key architectural decision:** Stay with plain DOM for all UI. Do not introduce React/Vue/Solid — they add 30-80KB, require JSX build pipeline, and create paradigm conflicts with the imperative game loop. The existing DOM pattern is well-structured and correct for this use case. CSS animations (native `@keyframes`) are sufficient for all HUD effects. A state machine library like XState would be massive overkill for the linear 5-state mission flow.

**Development tools:** Existing ESLint, Prettier, Vitest, Playwright setup is complete. No additions needed.

### Expected Features

**Must have (table stakes) — missing these blocks launch:**
- Mission briefing screen showing objectives before flight
- Mission debrief screen with stats and replay/next mission buttons
- Quick restart flow without page reload (currently uses `window.location.reload()`)
- Basic audio: rotor sound, weapon fire, explosions, RWR warning tone
- RWR threat warning display with directional indicators
- HUD subsystem damage display (data exists, HUD component may be missing)
- Pause menu with resume/restart/quit
- Escort mission working end-to-end with convoy vulnerability

Most of these features are 80-90% implemented in code but lack the final 10-20% of player-facing feedback or UI polish. The gap between "system exists" and "player can use it" is the main completion risk.

**Should have (competitive differentiators) — already exist:**
- Subsystem damage degradation (engine, rotor, avionics, weapons, sensors) — genuine differentiator vs indie helicopter games
- Cockpit-first camera as default — bold choice for browser game, creates immersion
- In-browser zero-install experience — core positioning
- Procedural mission variety with seeded generation — replayability without content authoring
- Difficulty presets with meaningful tuning — substantive, not cosmetic
- Power margin / rotor RPM management — sim-feel without full simulation complexity
- Terrain-based LOS for missile lock — rewards terrain masking tactics

**Defer (v2+) — explicitly out of scope:**
- Multiplayer (doubles complexity, breaks determinism assumptions, indie-killer scope creep)
- Multiple helicopter types (each needs unique tuning, art, weapons)
- Clickable cockpit instruments (massive scope, conflicts with mouse-look)
- Campaign with narrative (content-heavy, not the core value proposition)
- Real-time minimap (breaks immersion, reduces RWR value)
- Weather effects (rendering and physics implications)

**Anti-features to avoid:**
- Mobile/touch controls (experience is terrible on touch, performance on mobile GPUs is a separate battle)
- UI frameworks for simple menus (overhead for no benefit)
- Full realistic flight model (months of tuning for niche within niche)

### Architecture Approach

The existing architecture is sound: fixed 60Hz timestep loop with strict phase ordering (Input → Simulation → Physics → PostPhysics → Late), ECS-inspired pattern using plain TypeScript objects and Maps (not bitecs queries), unidirectional data flow (sim never imports render/UI), and provider callbacks for UI-to-sim communication. Rendering and UI run on separate rAF loops, pulling from simulation state via providers.

**Major components and integration patterns:**

1. **Mission Flow State Machine** (NEW) — manages game-level transitions: `menu → briefing → gameplay → debrief → menu`. Must sit above the fixed-timestep loop. Owns lifecycle of gameplay bootstrap/teardown. Currently missing — the game boots directly into gameplay with no formal state transitions. This is the foundational gap that blocks all UI work.

2. **Escort AI** (ENHANCE EXISTING) — convoy system already exists with waypoint-rail movement. Needs: convoy vehicle health tracking, damage from SAM explosions via proximity checks, mission failure if convoy destroyed, dynamic navigation waypoint tracking convoy position.

3. **RWR Threat Warning** (ENHANCE EXISTING) — basic RWR already exists as a readout function in `buildThreatReadout()`. Needs: bearing angle per threat, multiple simultaneous threat display, Canvas 2D compass rose widget. Should stay as UI-layer readout, not a full sim system (keep it simple).

4. **Subsystem Damage Model** (ALREADY IMPLEMENTED) — fully implemented with per-subsystem health, degradation curves, and gameplay effects. What's missing: per-subsystem damage weighting (currently uniform), HUD display showing subsystem bars, critical failure modes at 0 health.

5. **Missile Lock State Machine** (ALREADY IMPLEMENTED) — fully implemented 3-state FSM (FREE → ACQUIRING → LOCKED) with cone/range/time/LOS constraints. What's missing: lock tone audio, target bracket HUD indicator, lock break feedback, off-screen target direction chevron.

**Recommended build order (strict dependencies):**

1. **Phase 1: Mission Flow Foundation** — state machine, teardown capability, restart without reload. Blocks everything else.
2. **Phase 2: Subsystem Damage HUD** — already 90% done, quick wins for gameplay feel.
3. **Phase 3: Missile Lock Polish** — audio tone, HUD bracket, lock break feedback.
4. **Phase 4: RWR Display** — bearing indicators, Canvas widget, sensor damage degradation.
5. **Phase 5: Escort AI** — convoy health, destruction tracking, objective failure.

Building in this order respects architectural dependencies, delivers incremental value, and avoids creating half-working features that need rework.

### Critical Pitfalls

1. **Game State Machine Missing** — The game has no formal state machine for menu/briefing/gameplay/debrief transitions. Everything boots into gameplay, debrief uses `window.location.reload()` for replay. This blocks all UI flow work and creates irrecoverable tech debt if screens are added without it. **Fix:** Define `AppState` enum first, implement `teardownGameplay()`, test full cycle before adding any screens.

2. **Terrain Streaming Frame Spikes** — Creating terrain meshes and Rapier colliders synchronously on chunk boundaries causes 50-200ms frame spikes. At 60Hz fixed timestep, this triggers accumulator clamping (simulation time skip). **Fix:** Budget chunk creation to 2-3 per frame, queue the rest. Pre-warm spawn area before loop starts. Profile with DevTools.

3. **Damage Balance Unplayable Without Iteration Tooling** — Many tuning knobs (hull HP, subsystem curves, SAM timings) in TypeScript config files. Changing requires rebuild + full mission playthrough. Teams ship first numbers that "don't crash" rather than numbers that feel good. **Fix:** Add debug panel (gated by `VITE_ENABLE_DEBUG`) with live sliders for all tuning parameters. Add god mode and "spawn SAM missile at player" debug commands.

4. **Missile Lock Has No Player Feedback** — Lock FSM works perfectly in code but player has no audio tone, no reticle indicator, no target bracket, no lock progress visualization. Lock system feels like "press button, wait, fire" instead of tense skill-based targeting. **Fix:** Implement audio tone first (highest impact), then target bracket, then lock progress arc indicator, then off-screen chevron.

5. **No Mission Flow UI = No Playable Loop** — Game boots into random mission with no briefing, no mission select, no pre-flight confirmation, replay is page reload. This is a demo, not a game. Players who can't understand objectives or restart quickly will bounce. **Fix:** Depends on state machine (Pitfall 1). Build briefing → debrief improvements → mission select in that order.

6. **Escort AI Clips Through Terrain** — Convoy uses kinematic bodies with `setTranslation`, no collision response. Vehicles clip through hills, no convoy destruction fail state for escort missions. **Fix:** Add ground-clamping via downward raycast per vehicle. Track convoy health, fail mission if all destroyed. Do NOT add pathfinding — stick with waypoint rails.

7. **Browser Tab Backgrounding Causes Desync** — When tab is backgrounded, rAF stops. On foreground, massive delta causes time jump even with clamping. Missiles expire, SAM timers reset, player perceives "suddenly dead." **Fix:** Add `document.visibilitychange` listener, auto-pause on hide, show resume overlay on show, reset `lastTimestamp` to prevent delta spike.

## Implications for Roadmap

Based on research, the MVP completion work naturally divides into 5 phases with strict dependencies. The temptation will be to start with "visible" work (UI screens, visual effects) but the foundation (state machine, feedback systems) must come first or technical debt becomes irrecoverable.

### Phase 1: Mission Flow Foundation

**Rationale:** The missing state machine is the critical path blocker. Every other feature assumes a mission can be started, stopped, and restarted cleanly. Without this, UI screens become band-aids layered on top of a reload-based flow. This phase establishes the architectural foundation for everything else.

**Delivers:**
- Game state machine (`menu | briefing | gameplay | debrief`)
- Flow controller managing lifecycle
- `teardownGameplay()` function (inverse of `bootstrapGameplay()`)
- Restart without page reload
- Tab backgrounding auto-pause
- Formal pause menu

**Addresses features:**
- Quick restart flow (table stakes)
- Pause menu (table stakes)
- Foundation for briefing/debrief screens

**Avoids pitfalls:**
- Pitfall 1: Game state machine missing
- Pitfall 7: Browser tab backgrounding desync
- Anti-pattern 3: Monolithic bootstrap without teardown

**Research needed:** None — this is pure integration work against existing architecture patterns. Well-documented, no external dependencies.

### Phase 2: Mission Flow UI

**Rationale:** With state machine in place, screens can be built cleanly. Briefing and debrief are the player-facing mission loop. Without these, the game has no orientation or closure. This phase makes the game "playable" rather than just "testable."

**Delivers:**
- Mission briefing screen (objectives, map sketch, launch button)
- Enhanced debrief screen (stats breakdown, retry/next mission buttons)
- Mission selection UI (template picker, optional seed input for debug)

**Addresses features:**
- Mission briefing screen (table stakes)
- Mission debrief screen (table stakes)

**Uses stack:**
- Plain DOM/CSS (existing pattern)
- Canvas 2D for briefing map sketch (optional)

**Implements architecture:**
- Mission Flow UI component from ARCHITECTURE.md Phase 1
- Reads `MissionTemplate`, `MissionRuntime`, `MissionStatsState`
- Writes `GameState.flowState` via flow controller

**Avoids pitfalls:**
- Pitfall 5: No mission flow UI = no playable loop
- UX pitfall: No briefing or objective context at mission start

**Research needed:** None — HTML overlay patterns well-established in codebase. Standard UI work.

### Phase 3: Combat Feedback

**Rationale:** Most combat systems exist but lack player-facing feedback. This phase closes the "implemented but not usable" gap. Audio is the highest-impact missing element — rotor sound and lock tone are essential for immersion and gameplay. HUD indicators make existing damage/lock systems visible.

**Delivers:**
- Audio system (manager, presets, spatial sound)
- Rotor sound (RPM-linked, doppler)
- Weapon fire sounds (cannon, missile launch)
- Explosion sounds
- Missile lock tone audio (acquisition beep)
- RWR warning audio (threat level beeps)
- Subsystem damage HUD display (hull bar + 5 subsystem indicators)
- Missile lock HUD (target bracket, lock progress arc, off-screen chevron)
- Damage hit feedback (screen flash, damage vignette pulse)

**Addresses features:**
- Basic audio (table stakes)
- RWR threat warning (table stakes)
- HUD subsystem damage display (table stakes)

**Uses stack:**
- Babylon.js Sound class (Web Audio wrappers)
- Canvas 2D for RWR compass rose
- CSS animations for damage flash

**Implements architecture:**
- RWR Threat Warning component from ARCHITECTURE.md Phase 4
- Missile Lock enhancements from ARCHITECTURE.md Phase 3
- Subsystem Damage HUD from ARCHITECTURE.md Phase 2
- Audio manager in `render/` layer (render-adjacent)

**Avoids pitfalls:**
- Pitfall 4: Missile lock has no player feedback
- UX pitfall: Lock status shown as text only
- UX pitfall: Damage has no visual feedback on HUD
- UX pitfall: No briefing or objective context (audio warnings)

**Research needed:** **Yes — audio tuning and spatial sound**. While Babylon.js audio is well-documented, getting rotor sound right (doppler, RPM pitch shift, mixing) requires iteration. RWR tone design (scan/lock/launch progression) needs audio design research. Recommend `/gsd:research-phase` for audio system design before implementation.

### Phase 4: Visual Polish

**Rationale:** With core loop playable and combat feedback working, visual effects make hits and explosions satisfying. Particles and post-processing are "juice" that polish existing systems. This phase has no gameplay dependencies — it's pure presentation layer.

**Delivers:**
- VFX manager (explosion, missile trail, muzzle flash, flare ejection)
- Babylon.js particle systems (GPU particles for explosions, CPU for trails)
- Post-processing pipeline (bloom on explosions/tracers, tone mapping, optional FXAA)
- Screen effects (damage vignette, alert flash animations)
- Improved visual feedback (tracer rounds, impact sparks, smoke trails)

**Addresses features:**
- Visual polish (phase 1+ feedback enhancement)

**Uses stack:**
- Babylon.js ParticleSystem / GPUParticleSystem (built-in)
- Babylon.js DefaultRenderingPipeline (built-in)
- CSS keyframe animations for HUD effects

**Implements architecture:**
- VFX manager in `render/` binds to explosion events from `EnemyState`
- Particle system presets in `content/`

**Avoids pitfalls:**
- Performance trap: Post-processing GPU budget (enable conservatively)
- Pitfall 2: Terrain frame spikes (don't add VFX until streaming is budgeted)

**Research needed:** None — Babylon.js particle system and rendering pipeline are well-documented. Standard patterns. May need light research on particle pooling strategies if GC spikes occur.

### Phase 5: Escort Mission Completion

**Rationale:** Escort mission system exists but lacks convoy vulnerability and objective failure tracking. This is the last major gameplay gap. Comes last because it's the most complex integration (convoy health + damage events + mission director + navigation).

**Delivers:**
- Convoy vehicle health tracking
- Convoy damage from SAM explosions (proximity checks)
- Mission failure if convoy destroyed
- Dynamic navigation waypoint tracking convoy position
- Convoy ground-clamping (terrain following)
- Convoy destruction VFX (render layer)
- "Convoy under attack" alert when enemies target convoy

**Addresses features:**
- Escort mission working end-to-end (table stakes)

**Uses stack:**
- Existing convoy system (waypoint rails)
- Rapier raycasts for ground-clamping
- Existing damage event patterns

**Implements architecture:**
- Escort AI component from ARCHITECTURE.md Phase 5
- Reads `EnemyState.explosionEvents`
- Writes `ConvoyState.survivingCount`
- Mission Director reads convoy state for objective tracking

**Avoids pitfalls:**
- Pitfall 6: Escort AI clips through terrain
- UX pitfall: Escort missions always succeed regardless of player action

**Research needed:** None — convoy system already established, damage pattern already used in player damage system. Pure integration work.

### Phase Ordering Rationale

This ordering respects strict architectural dependencies:

- **Phase 1 before 2:** State machine must exist before any screens are built, or screens become hacks around reload-based flow
- **Phase 2 before 3/4/5:** Mission flow establishes the playable loop; feedback and polish enhance what's playable
- **Phase 3 before 4:** Combat feedback (audio/HUD) makes systems usable; visual polish makes them pretty. Usability before prettiness.
- **Phase 5 last:** Escort mission is most complex integration, benefits from all other systems being stable

Alternative orderings considered:
- **Visual polish first:** Tempting because it's "visible progress," but polishing unusable systems wastes effort. Combat must feel right before it looks pretty.
- **Escort mission earlier:** Could be Phase 3, but convoy vulnerability requires understanding damage patterns that are best validated through player damage HUD work first.

This ordering delivers incremental playability: Phase 1 = restartable, Phase 2 = understandable missions, Phase 3 = satisfying combat, Phase 4 = polished presentation, Phase 5 = mission variety.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Combat Feedback):** Audio system design needs research. While Babylon.js Sound API is documented, getting helicopter rotor sound right (doppler, RPM pitch shift, ambient mixing) and RWR tone design (scan/lock/launch progression) requires audio design research. Recommend `/gsd:research-phase` for audio system architecture and spatial sound patterns before implementation. **Medium priority research.**

Phases with standard patterns (skip research-phase):

- **Phase 1 (Mission Flow Foundation):** State machine patterns are standard. Existing architecture already has provider pattern and lifecycle hooks. No external dependencies. **No research needed.**
- **Phase 2 (Mission Flow UI):** HTML overlay patterns well-established in codebase (`ui/root.ts` has 1000+ lines of working examples). Canvas 2D for map sketch is standard. **No research needed.**
- **Phase 4 (Visual Polish):** Babylon.js particle system and rendering pipeline are well-documented. Existing `SamExplosionEvent` pattern provides integration point. Standard VFX work. **No research needed.**
- **Phase 5 (Escort Mission Completion):** Convoy system already exists, damage event pattern already used in `playerDamage.ts`. Pure integration against established patterns. **No research needed.**

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Existing stack verified via codebase analysis. No new dependencies claim is concrete (package.json inspection). Babylon.js feature availability (particles, audio, post-processing) verified against installed version 7.54.3. |
| Features | **MEDIUM** | Feature expectations based on training data analysis of helicopter combat game genre (LHX, Comanche, Apache Air Assault). Existing feature status verified via codebase inspection (HIGH confidence). Genre conventions have MEDIUM confidence (training data only, WebSearch unavailable). |
| Architecture | **HIGH** | All architectural analysis derived from direct codebase inspection. System phases, data flow patterns, integration boundaries verified against actual implementations in 10+ source files. Design decisions cross-referenced with `memory-bank/ARCHITECTURE.md` and `memory-bank/PRODUCT.md`. |
| Pitfalls | **MEDIUM** | Critical pitfalls (1-3) identified via codebase analysis (HIGH confidence on what exists). Pitfall likelihood and severity based on training data knowledge of Babylon.js/Rapier integration patterns, browser game development, and fixed-timestep loop design (MEDIUM confidence). Recovery cost estimates are educated guesses (MEDIUM confidence). |

**Overall confidence:** **HIGH**

The research benefits enormously from the project being in mid-development with a complete Phase 1. This is not "how to build a helicopter game from scratch" (would require external research) but rather "how to complete the remaining features of this specific working implementation." All stack, architecture, and integration analysis is based on concrete code inspection, which provides high confidence. The main uncertainty is in tuning and balance (which is inherently iterative) and audio design (where genre conventions are known but implementation details need experimentation).

### Gaps to Address

**Audio system design:** While Babylon.js Sound API is documented, helicopter rotor audio requires specific techniques (doppler shift, RPM-linked pitch modulation, spatial attenuation) that may need research or experimentation. The RWR warning tone design (how scan/lock/launch warnings sound and how they layer with rotor/weapon sounds) needs audio design attention. **Recommend:** Dedicate a spike ticket in Phase 3 to audio prototyping, or invoke `/gsd:research-phase` for audio system design before Phase 3 begins.

**Damage tuning parameters:** The damage system has many interdependent parameters (hull HP, subsystem curves, crash damage, missile damage, SAM behavior). Current values in `content/difficulty.ts` may not be balanced. Without iteration tooling (debug panel), tuning will be slow. **Recommend:** Build debug panel early in Phase 1 or as part of Phase 3 prep. Track "time to first death" and "hits before death" as metrics during playtesting.

**Performance validation:** Terrain streaming frame spikes (Pitfall 2) are identified as a risk but not measured. Current enemy counts are low (< 10 entities) so RWR/lock query costs are unknown at scale. **Recommend:** Add performance profiling ticket to Phase 1 (use browser DevTools to establish baseline) and set regression budgets (no frame > 20ms). Re-profile after Phase 4 (VFX) to ensure particles don't tank performance.

**Mission balance and content:** The game currently has 3 mission templates (strike, radar sweep, escort). Research assumes these are sufficient for MVP, but actual replayability depends on procedural variety and difficulty tuning. **Recommend:** Playtesting feedback loop during Phase 2-3 to validate mission variety is sufficient. If not, flag for post-MVP content expansion.

**Browser compatibility:** Research assumes "modern browsers" (Chrome, Firefox, Edge). Babylon.js and Rapier target these but Safari WebGL quirks and mobile browsers (explicitly out of scope) may surface issues. **Recommend:** Test on all target browsers early in Phase 2 (once mission flow is playable). Add browser compatibility checks to boot sequence.

## Sources

### Primary (HIGH confidence)

- **Codebase analysis of `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/`** — all source directories inspected (boot/, core/, ecs/, physics/, sim/, render/, ui/, content/)
- **`apps/game/package.json` and `pnpm-lock.yaml`** — installed dependencies verified (Babylon.js 7.54.3, Rapier 0.19.3, TypeScript 5.5.4, Vite 5.4.7)
- **`memory-bank/PRODUCT.md`** — business rules, damage severity policy, mission completion contract
- **`memory-bank/ARCHITECTURE.md`** — system phases, data flow, asset contracts, design decisions
- **`memory-bank/CONTRIBUTING.md`** — coding conventions, known risks, safe/risky areas
- **`memory-bank/LONG_TERM_MEMORY.md`** — ongoing project context, invariants
- **`memory-bank/plans/NEXT-PHASES.md`** — phase 2+ roadmap context

### Secondary (MEDIUM confidence)

- **Training data: Babylon.js 7.x API** — ParticleSystem, GPUParticleSystem, DefaultRenderingPipeline, Sound class, AudioEngine. Features verified as available but detailed usage patterns not tested.
- **Training data: Rapier3D WASM integration patterns** — collision handling, kinematic vs dynamic bodies, raycast performance. General patterns known but specific to Rapier 0.19.3.
- **Training data: Web Audio API specification** — universally supported, spatial audio patterns standard. HIGH confidence on API availability, MEDIUM on browser-specific quirks.
- **Training data: Fixed-timestep game loop design** — accumulator pattern, delta clamping, sub-stepping. Standard game engine pattern, well-understood.

### Tertiary (LOW confidence, needs validation)

- **Training data: Helicopter combat game genre conventions** — LHX: Attack Chopper, Comanche series, Apache Air Assault, DCS Black Shark. Feature expectations and UX patterns based on genre history. Training data knowledge only (cutoff Jan 2025), no WebSearch for recent games or current player expectations. **Risk:** Genre conventions may have evolved or indie expectations may differ.
- **Training data: Browser game performance patterns** — Babylon.js/Rapier performance characteristics, terrain streaming costs, particle system GC impact. General guidance available but specific to this project's scale and target browsers requires profiling. **Risk:** Performance budgets are educated guesses, not measurements.
- **Training data: Helicopter audio design** — Doppler shift, rotor sound synthesis, RPM-linked pitch. General audio engineering knowledge but not helicopter-specific expertise. **Risk:** Audio system may require iteration or expert consultation.

---
*Research completed: 2026-02-08*
*Ready for roadmap: yes*
