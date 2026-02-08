# Pitfalls Research

**Domain:** Browser helicopter combat game MVP completion (TypeScript, Babylon.js, Rapier WASM, ECS)
**Researched:** 2026-02-08
**Confidence:** MEDIUM (training data + deep codebase analysis; external sources unavailable for verification)

## Critical Pitfalls

### Pitfall 1: Game State Machine Has No Formal State Machine

**What goes wrong:**
The game currently has no explicit state machine governing transitions between screens (menu -> briefing -> gameplay -> debrief -> replay). The `createApp.ts` bootstrap hardcodes a single linear flow: init -> gameplay -> loop.start(). Mission end triggers a debrief overlay, and "replay" does `window.location.reload()`. This works for a prototype but breaks catastrophically when adding: briefing screens, mission selection, restart-without-reload, or any UI flow that requires tearing down and rebuilding gameplay state.

**Why it happens:**
During engine development, the game boots directly into gameplay because that is what you need to test. The state transitions feel like "UI work" and get deferred. By the time multiple screens exist, the gameplay bootstrap has accumulated implicit assumptions (physics world exists, entities spawned, systems registered) that make clean teardown/rebuild nearly impossible.

**How to avoid:**
- Define an explicit `AppState` enum: `Loading | Menu | Briefing | Playing | Debrief` before adding any new UI screens.
- The `Playing` state owns the gameplay context lifecycle. Entering `Playing` calls `bootstrapGameplay`; leaving it calls a `teardownGameplay` that removes all systems, destroys physics bodies, clears entity maps.
- The debrief "Replay" button must call state transition logic, not `window.location.reload()`.
- Test the full transition cycle (start -> play -> complete -> debrief -> replay -> play again) as a single e2e test.

**Warning signs:**
- The debrief replay button uses `window.location.reload()` (it does today -- see `root.ts` line 677).
- No `teardownGameplay` or `dispose` function exists on `GameplayContext`.
- Adding a second screen (briefing) requires "special wiring" outside the existing boot flow.
- Leaked physics bodies or orphaned systems after mission restart.

**Phase to address:**
Must be the very first ticket of the next phase. Every subsequent feature (mission selection, briefing UI, restart) depends on this.

---

### Pitfall 2: Terrain Streaming + Physics Colliders Cause Frame Spikes on Chunk Boundaries

**What goes wrong:**
The current `TerrainChunkManager` creates/destroys Babylon.js ground meshes synchronously during `refreshVisibleChunks`. The `TerrainColliderManager` creates/removes Rapier colliders synchronously. When the player crosses a tile boundary, dozens of meshes and colliders are created in a single frame, causing 50-200ms frame spikes. At 60Hz fixed timestep with maxSubSteps=5, this triggers accumulator clamping, which makes the sim "skip time" -- the helicopter teleports or physics goes stale for a beat.

**Why it happens:**
Streaming systems are written for correctness first. The "create everything this frame" approach is correct but not performant. Terrain is flat and simple now, but adding props, heightmaps, or LOD transitions amplifies the cost per chunk.

**How to avoid:**
- Budget chunk creation: create at most 2-3 meshes and 2-3 colliders per frame. Queue the rest.
- Separate mesh creation (render thread, async-friendly) from collider creation (sim thread, must be deterministic within a tick).
- Pre-warm a ring of chunks around spawn point before the loop starts (already partially done -- `terrain.update(spawnPoint)` in `gameplay.ts`).
- Profile with the browser DevTools Performance tab during sustained flight. Flag any frame > 20ms as a regression.

**Warning signs:**
- Yellow "long frame" warnings in Chrome DevTools during flight.
- `clampedMs > 0` in loop metrics during terrain transitions.
- Visible "pop-in" where terrain appears all at once rather than gradually.
- Player altimeter reports wild AGL values at chunk boundaries (collider gaps).

**Phase to address:**
Performance polish phase. Should have a dedicated "streaming budget" ticket that caps per-frame work.

---

### Pitfall 3: Damage Model Balance Is Unplayable Without Iteration Tooling

**What goes wrong:**
The damage system has many tuning knobs (hull HP, subsystem curves with exponent and minMultiplier, crash damage multipliers, missile damage multipliers, SAM lock times, difficulty presets). Without rapid iteration tooling, balancing requires: change a number in `difficulty.ts` -> rebuild -> fly to a SAM site -> get hit -> observe if damage feels right. This cycle takes 2-5 minutes per iteration. Teams inevitably ship the first set of numbers that "don't crash" rather than numbers that feel good.

**Why it happens:**
Tuning parameters are in TypeScript config files (`content/difficulty.ts`, `content/enemies.ts`, `content/weapons.ts`). Hot reload via Vite helps but still requires a full gameplay restart to test. There is no in-game tuning panel or debug command to adjust values at runtime.

**How to avoid:**
- Add a debug panel (gated behind `VITE_ENABLE_DEBUG`) that exposes live sliders for: hull HP, missile damage multiplier, crash damage multiplier, subsystem degradation exponents, SAM lock time, SAM missile speed, SAM turn rate.
- Add a "god mode" debug toggle that prevents destruction so you can test subsystem degradation in isolation.
- Add a "spawn SAM missile at player" debug command to test damage without flying to a SAM site.
- Track "time to first death" and "hits before death" as telemetry metrics during playtesting.

**Warning signs:**
- Playtesters either die instantly (overtuned) or never feel threatened (undertuned).
- The subsystem degradation curves feel imperceptible -- damage happens but nothing changes perceptibly in flight.
- Crash damage is either 0 (too forgiving) or instant-kill (too punishing) with nothing in between.
- SAM missiles are either trivially avoidable or inescapable.

**Phase to address:**
Debug tooling should be added early in the completion phase. Balance tuning is a continuous activity during the final integration and playtesting phases.

---

### Pitfall 4: Missile Lock Feel Requires Audio/Visual Feedback That Does Not Exist Yet

**What goes wrong:**
The missile lock system (`missile.ts`) has clean state machine logic (FREE -> ACQUIRING -> LOCKED) and proper cone/range/LOS constraints. But the player has no audio or visual feedback for the lock progression. The HUD shows a text label ("Lock: ACQUIRING") but there is no:
- Lock tone audio (the classic accelerating beep)
- Reticle/diamond indicator on the target
- Visual cue showing lock cone or progress arc
- Screen-space indicator showing target direction when off-screen

Without these, the lock system feels like "press button, wait, fire" rather than the tense, skill-based targeting that makes combat helicopter games satisfying.

**Why it happens:**
Lock system logic is implemented as a sim system (correct). Audio and visual feedback live in the render/UI layer (also correct per architecture). But the "connecting tissue" between lock state and player-facing feedback is missing. The lock state exists in `MissileState` but no render system reads it to drive visuals.

**How to avoid:**
- Design the lock feedback as a dedicated HUD component that reads `MissileState` (lockStatus, lockProgress, lockTarget entity position).
- Implement the audio tone first -- it is the single highest-impact feedback element for missile lock feel. A simple oscillator with pitch proportional to `lockProgress` works.
- Add a target diamond/bracket in screen space that tracks the `lockTarget` entity position. Animate it (pulsing/tightening) based on `lockProgress`.
- Add an off-screen direction indicator (chevron at screen edge) when the lock target is behind the player.

**Warning signs:**
- Players fire missiles without locks and wonder why they miss.
- Players cannot tell when lock is acquired vs still acquiring.
- Combat feels like "spray and hope" rather than "acquire, track, fire."
- No audio cues exist for any targeting event.

**Phase to address:**
HUD/combat feedback phase. Lock audio and visual indicators should be implemented together as a single ticket.

---

### Pitfall 5: No Mission Flow UI Means No Playable Loop

**What goes wrong:**
The game currently boots directly into gameplay with a random mission seed. There is no:
- Mission briefing screen showing objectives, threats, and map overview
- Mission selection (choice of template or seed)
- Pre-flight confirmation
- Post-debrief flow to another mission (replay button does `window.location.reload()`)

Without this, the "playable loop" is: load page -> fly -> complete/die -> see stats -> reload page. This is a demo, not a game. Players who cannot understand the objectives or restart quickly will bounce.

**Why it happens:**
The sim and combat systems are the interesting engineering work. UI screens are "just HTML" and feel like they can be done last. But the mission flow UI is what transforms isolated systems into a playable game, and it has hard dependencies on the state machine (Pitfall 1).

**How to avoid:**
- Build the state machine (Pitfall 1) first.
- Implement screens in order: Briefing (shows objectives + waypoint map) -> Debrief improvements (proper retry/next mission buttons) -> Mission select (template picker with seed input for debug).
- Keep screens as HTML overlays (consistent with current `ui/` approach). Do not introduce a framework just for menus.
- The briefing screen must pause the game loop or delay starting it until the player dismisses the briefing.

**Warning signs:**
- The game starts instantly with no orientation for the player.
- Players do not know what their objectives are or where to go.
- The only way to play again is to refresh the browser.
- No way to choose between mission types.

**Phase to address:**
Mission flow and UI phase. Should follow immediately after the state machine is in place.

---

### Pitfall 6: Escort AI Convoy Walks Through Physics World Without Collision Awareness

**What goes wrong:**
The convoy system (`convoy.ts`) uses kinematic position-based bodies that move along a waypoint route via `setTranslation`. These bodies do not respond to collisions, obstacles, or terrain. If a waypoint route passes through a hill (once heightmapped terrain exists), the convoy vehicles will clip through geometry. If a vehicle is destroyed, the convoy continues as if nothing happened (no "convoy wiped" fail state for escort missions).

**Why it happens:**
The MVP design explicitly chose "waypoint rails" for escort movement to avoid pathfinding complexity. This is the right tradeoff for MVP. But the current implementation has zero terrain awareness and no failure conditions for the convoy itself being destroyed.

**How to avoid:**
- For terrain clipping: add a ground-clamping pass that raycasts downward from each convoy vehicle position and adjusts Y to terrain height. This requires the terrain collider to exist at the convoy's position (streaming system dependency).
- For convoy destruction: track convoy vehicle health. If all convoy vehicles are destroyed, set `convoy.completed = false` and trigger a mission failure event through the mission director.
- Do NOT add full pathfinding. Stick with waypoint rails + ground clamping.
- Test escort missions with convoy routes that cross varied terrain.

**Warning signs:**
- Convoy vehicles float above or sink below terrain.
- Convoy vehicles clip through prop buildings/trees.
- Destroying all convoy escorts has no gameplay consequence.
- Escort missions always succeed regardless of player action (only the timer/arrival matters).

**Phase to address:**
Escort mission polish ticket. Ground clamping is a small addition; convoy destruction fail state is a mission director change.

---

### Pitfall 7: Browser Tab Backgrounding Causes Physics Desync and Time Bombs

**What goes wrong:**
When the browser tab is backgrounded, `requestAnimationFrame` stops firing. When the tab returns to foreground, the first frame has a massive delta (could be seconds to minutes). The fixed timestep loop correctly clamps this (`maxFrameDeltaMs = 250ms`), but the sim still experiences a "time jump": missiles that were in flight have expired, SAM lock timers have expired, and the accumulator discards the excess time. The player perceives this as "everything reset" or "I was suddenly dead."

**Why it happens:**
The loop handles this reasonably well (clamping + max substeps), but gameplay systems do not account for "paused due to backgrounding." The `isPaused` flag is only set by the Space key and the help panel.

**How to avoid:**
- Add a `document.visibilitychange` listener. When the tab becomes hidden, set `isPaused = true` and `lastTimestamp = null` on the loop. When the tab becomes visible again, show a "Paused" overlay and require player input to resume.
- This prevents the "massive delta on resume" problem entirely because `lastTimestamp = null` makes the loop treat the next frame as the first frame (delta = 0).
- Ensure the pause overlay is implemented before the state machine -- it is a global concern.

**Warning signs:**
- Alt-tabbing during a SAM engagement and returning to find the helicopter destroyed.
- Frame metrics showing `clampedMs > 0` after tab resume.
- Missiles or SAM projectiles disappearing without explanation after tab switch.

**Phase to address:**
Core loop / lifecycle phase. Should be a small standalone ticket early in the completion phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `window.location.reload()` for replay | Zero teardown logic needed | Cannot add mission select, briefing, or any meta UI without reload flash | MVP only. Must replace with state machine before adding any UI flow |
| All UI providers set via callbacks on `rootUi` | Avoids framework dependency, fast to wire | 15+ provider setters on rootUi makes it unwieldy; adding a new HUD element requires touching `createApp.ts`, `gameplay.ts`, `root.ts`, and `hudReadouts.ts` | Acceptable until provider count exceeds ~20. Then extract a HUD state bus |
| Uniform subsystem damage (all subsystems take same delta) | Simple, predictable | Unrealistic -- a rotor hit should damage rotor more than avionics. No locational damage | MVP. Add per-subsystem damage weights when adding locational hit detection |
| Convoy vehicles share one collider config | Simple spawning | Cannot represent different vehicle types or sizes | MVP. Add vehicle type configs when expanding convoy content |
| No entity cleanup on mission end | No teardown needed if page reloads | Leaked physics bodies and orphaned state if restart is in-process | Never acceptable once `window.location.reload()` is removed |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Babylon.js + Rapier transforms | Reading Rapier translation/rotation in render loop (races with physics step) | Read transforms once per frame in `onBeforeRenderObservable`; cache the result. Never write back. Current implementation is correct but fragile if someone adds a "follow cam" that reads body position directly |
| Rapier WASM init | Calling `RAPIER.init()` multiple times or not awaiting it | Init once in `bootstrapPhysics`, pass the module reference everywhere. Already done correctly, but teardown/re-init for mission restart must re-init the World, not the WASM module |
| Babylon.js mesh disposal | Disposing a mesh that is still bound in `MeshBindingSystem` | Always unbind entity before disposing mesh. The binding system will log debug warnings but silently produce wrong transforms |
| HTML overlay z-ordering | HUD elements appearing behind the canvas or behind each other | Use explicit `z-index` layers. The debrief overlay must be above all HUD elements. Currently relies on DOM order which is brittle |
| Pointer lock + HUD interaction | Pointer lock eats all mouse events, making HUD buttons unclickable | Exit pointer lock before showing any clickable overlay (debrief, briefing, menu). The `mouseLookController` must coordinate with the UI state |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Creating terrain meshes synchronously on chunk boundary | 50-200ms frame spike, loop accumulator clamps | Budget chunk creation to 2-3 per frame, queue the rest | Immediately with current terrain (4-6 tile radius). Worse with heightmaps or LOD |
| Rapier `castRayAndGetNormal` per enemy per frame | Linear cost growth with enemy count; each raycast traverses the broadphase | Cache LOS results for 4-8 ticks (250-500ms) instead of raycasting every tick. SAM targets move slowly relative to tick rate | 8+ SAM sites with LOS checks enabled |
| DOM `replaceChildren` in mission objective list every frame | Forced layout recalculation, DOM thrashing | Only rebuild objective DOM when objective state changes (dirty flag or status comparison) | Already happening -- `missionHud.update` calls `objectives.replaceChildren(...)` every HUD frame |
| `Array.splice` in hot entity removal paths | O(n) per removal in arrays that can have 20+ entries | Use swap-and-pop removal or maintain a free list. Missiles and units already use splice | 10+ simultaneous missiles or units being removed in one frame |
| `Map.has` + `Map.get` pattern (double lookup) | Minor per-call cost but adds up in tight loops | Use `Map.get` once and check for `undefined`. Already present in several hot paths (`enemies.ts` damage application) | Not critical for MVP entity counts but a scalability concern |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No briefing or objective context at mission start | Player flies aimlessly, does not know what to destroy or where to go | Show a 5-second briefing overlay with objective summary and waypoint compass bearing before unpausing |
| Lock status shown as text only ("ACQUIRING") | Player cannot gauge lock progress or know when to fire | Add a lock progress bar or arc indicator near the reticle. Add audio tone |
| Damage has no visual feedback on HUD | Player does not know they are being hit until destroyed | Flash the screen edge red on damage. Show hull % prominently. Animate subsystem bars |
| Debrief shows stats but no "why you failed" | Player does not learn from failure | Add a "cause of death" line (e.g., "Destroyed by SAM missile", "Crashed into terrain") |
| Out-of-bounds warning is text only | Easy to miss during combat | Add directional indicator showing which way to fly to return to bounds. Add an escalating audio warning |
| No waypoint compass or directional indicator | Player must read bearing number and mentally translate | Add a simple compass bar at top of HUD with waypoint diamond. Standard in flight/combat games |

## "Looks Done But Isn't" Checklist

- [ ] **Mission flow:** Has briefing -> gameplay -> debrief, but no mission selection, no clean restart without page reload, and no pre-flight pause
- [ ] **Damage model:** Has subsystem degradation curves, but no per-hit visual/audio feedback, no subsystem-specific damage (all subsystems take equal damage), and no "cause of death" tracking beyond the last damage source
- [ ] **Missile lock:** Has full lock state machine with cone/range/LOS, but no audio tone, no target bracket indicator, no off-screen target indicator, and no lock-break audio cue
- [ ] **Escort mission:** Has convoy movement on waypoint rails, but no terrain ground-clamping, no convoy health/destruction fail state, and no "escort distance" proximity warning
- [ ] **SAM/RWR threat warning:** Has radar detection range and SAM lock states in code, but no RWR-style directional threat display, no "missile incoming" warning audio, and no threat priority visualization
- [ ] **Debrief screen:** Has kill/damage/time stats, but no kill-by-kill breakdown, no "cause of failure" explanation, no comparison to previous attempts, and replay is a page reload
- [ ] **Combat feedback:** Has hit detection and explosion events, but no tracer/bullet impact VFX, no missile trail VFX, no explosion particles, and no screen shake or camera impact feedback
- [ ] **Performance:** Runs at 60fps in simple scenarios, but no streaming budget, no measurement of chunk creation cost, and no profiling of 8+ entity scenarios with raycasts

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No state machine (Pitfall 1) | MEDIUM | Extract a `GameFlowManager` with explicit states. Refactor `createApp` to delegate to it. Create `teardownGameplay` on `GameplayContext`. Replace `window.location.reload()` with state transition. ~2-3 days |
| Terrain frame spikes (Pitfall 2) | LOW | Add a chunk creation queue with per-frame budget cap. Modify `refreshVisibleChunks` to yield after N creations. ~1 day |
| Damage balance unplayable (Pitfall 3) | LOW | Add a debug tuning panel. Wire sliders to live state objects. Can be done incrementally. ~1 day for basic panel |
| Missing lock feedback (Pitfall 4) | MEDIUM | Design and implement lock HUD component + audio. Requires coordinating sim state read with render/audio output. ~2 days |
| No mission flow UI (Pitfall 5) | MEDIUM-HIGH | Depends on state machine (Pitfall 1). Building 3 screens (briefing, debrief improvements, mission select) with transitions. ~3-4 days |
| Convoy terrain clipping (Pitfall 6) | LOW | Add downward raycast in convoy update loop. Clamp Y to hit point. ~0.5 days |
| Tab backgrounding desync (Pitfall 7) | LOW | Add visibility change listener, auto-pause on hide, resume overlay on show. ~0.5 days |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No state machine | Phase start (foundation) | Can start a mission, complete it, see debrief, click "retry", and play again without page reload |
| Terrain frame spikes | Performance polish | No frame exceeds 20ms during sustained flight across 3+ tile boundaries. Loop metrics show `clampedMs = 0` |
| Damage balance | Debug tooling (early) + Tuning (late) | Debug panel exists with live sliders. At least 3 playtests with iterative tuning documented |
| Missing lock feedback | Combat HUD phase | Audio tone plays during lock acquisition. Target bracket visible on screen. Playtesters can reliably acquire lock and fire without reading HUD text |
| No mission flow UI | UI screens phase (after state machine) | Player can: read briefing, dismiss it, play mission, see debrief, choose to replay or pick another mission |
| Convoy terrain clipping | Escort polish | Convoy vehicles follow terrain height within 0.5m. Destroying all convoy vehicles fails the escort mission |
| Tab backgrounding | Core lifecycle (early) | Backgrounding and foregrounding the tab shows a pause overlay. No time skip, no phantom deaths |

## Sources

- Codebase analysis of `/Users/olgeroeselg/Projects/public/reign-of-rotor/apps/game/src/` (all source directories)
- `memory-bank/PRODUCT.md` -- business rules, damage severity policy, mission completion contract
- `memory-bank/ARCHITECTURE.md` -- system phases, data flow, asset contracts
- `memory-bank/CONTRIBUTING.md` -- coding conventions, known risks
- `memory-bank/LONG_TERM_MEMORY.md` -- known risks, invariants
- `memory-bank/plans/NEXT-PHASES.md` -- phase 2+ roadmap context
- Training data on: Babylon.js performance patterns, Rapier WASM integration, browser game development, fixed-timestep game loop design, flight sim UX patterns

---
*Pitfalls research for: Browser helicopter combat game MVP completion*
*Researched: 2026-02-08*
