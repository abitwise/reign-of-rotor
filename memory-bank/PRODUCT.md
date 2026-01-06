# Reign of Rotor

## Purpose (3–5 sentences)
LHX: Reign of Rotor is a browser-based helicopter combat game inspired by the DOS-era “LHX: Attack Chopper”.
The MVP delivers a complete playable loop: briefing → takeoff → navigate → engage threats → return-to-base → debrief.
The design targets “sim-feel, arcade-accessible”: believable helicopter handling, clear threat feedback, and replayable procedural missions.
The project is optimized for indie scope and fast iteration: data-driven content, ECS gameplay, and a strict separation of sim vs rendering.

## Capabilities / Features (MVP)
- One playable helicopter (LHX prototype-inspired) with assist toggles (stability/hover).
- Physics-backed flight and collisions via Rapier; 3D rendering via Babylon.js.
- Combat: cannon (raycast-based) + guided missiles + countermeasures (flares/chaff simplified).
- Threats: SAM site behavior, radar detection, missile warning (RWR-style).
- One terrain theater (desert/steppe style) with waypoints and spawn zones.
- Procedural “quick mission” generator with 3 templates:
  - Convoy strike
  - Destroy radar/SAM site
  - Escort (protect an ally unit traveling between points)
- Mission debrief: stats, success/fail, basic progression (rank/medals optional MVP).
- HUD: altitude AGL, speed, heading, weapons/ammo, lock status, threat warnings, damage state.

## Key stakeholders / user types
- Player (primary): wants satisfying flight feel, readable HUD, tactical combat loop.
- Indie dev team (secondary): needs maintainable, testable gameplay architecture that is easy to extend.
- Streamers/testers (tertiary): need clarity, performance stability, and quick restart loops.

## Key user flows (concise stories)
- As a player, I start a quick mission and receive a clear objective and waypoint, so I know what to do immediately.
- As a player, I can take off, fly to the objective, and use the HUD to navigate, so I don’t get lost.
- As a player, I can lock targets and fire missiles/cannon with clear feedback, so combat feels fair and responsive.
- As a player, I can react to SAM threats with warnings and countermeasures, so survival feels skill-based.
- As a player, I can return to base and land to complete the mission, so the loop feels complete and satisfying.
- As a player, I see a debrief with outcomes and stats, so I understand how I performed and want to replay.

## Business rules / invariants (important)
- Fixed-timestep simulation: gameplay outcomes must not depend on render FPS.
- Physics (Rapier) is authoritative for transforms; ECS stores intent + gameplay state.
- Renderer/UI must not mutate simulation state directly (use events/commands).
- Missile lock must require time + cone/range constraints (no instant locks).
- Countermeasures are limited by inventory and cooldown.
- “Mission success” requires meeting primary objectives and returning/landing (unless a ticket defines an alternative).
- Damage should degrade capability (engine/rotor/avionics/weapons/sensors) rather than instant death wherever possible.

## Non-goals (MVP)
- Multiplayer.
- Full rotor aerodynamics realism (vortex ring state, detailed blade simulation).
- Full interactive cockpit with clickable switches.
- Large-scale persistent campaign map (territory control).
