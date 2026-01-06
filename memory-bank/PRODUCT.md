# Product info about Reign of Rotor

## Purpose (3–5 sentences)
LHX: Reign of Rotor is a browser-based helicopter combat game inspired by the DOS-era “LHX: Attack Chopper”.
The MVP delivers a complete playable loop: briefing → takeoff → navigate → engage threats → mission complete → debrief.
The design targets “sim-feel, arcade-accessible but hardcore-leaning”: believable helicopter handling, meaningful threats, and readable cockpit-first HUD.
The project is optimized for indie scope and fast iteration: low-poly modern visuals, data-driven content, ECS gameplay, and strict separation of sim vs rendering.

## Capabilities / Features (MVP)
- One playable helicopter (LHX prototype-inspired).
- Default camera: first-person cockpit view (third-person later as backlog).
- Input priority: keyboard + mouse (gamepad later).
- Physics-backed flight and collisions via Rapier; 3D rendering via Babylon.js.
- Combat: cannon (raycast-based) + guided missiles + countermeasures (flares/chaff simplified).
- Threats: SAM site behavior, radar detection, missile warning (RWR-style).
- One terrain theater (low-poly modern indie look) with waypoints and spawn zones.
- Procedural “quick mission” generator with 3 templates:
  - Convoy strike
  - Destroy radar/SAM site
  - Escort (protect an ally unit traveling between points)
- Mission completion can happen **in-air** once objectives are met (landing is optional).
- Mission debrief: stats, success/fail, basic progression hooks (rank/medals optional MVP).
- HUD: altitude AGL, speed, heading, weapons/ammo, lock status, threat warnings, damage state.

## Key stakeholders / user types
- Player (primary): wants satisfying cockpit flight feel, readable HUD, tactical combat loop, and fair-but-deadly threats.
- Indie dev team (secondary): needs maintainable, testable gameplay architecture that is easy to extend.
- Streamers/testers (tertiary): need clarity, performance stability, and quick restart loops.

## Key user flows (concise stories)
- As a player, I start a quick mission and receive a clear objective and waypoint, so I know what to do immediately.
- As a player, I fly primarily from the cockpit view with a readable HUD, so immersion and situational awareness feel strong.
- As a player, I lock targets and fire missiles/cannon with clear feedback, so combat feels fair and responsive.
- As a player, I react to SAM threats with warnings and countermeasures, so survival feels skill-based.
- As a player, I can complete the mission once objectives are achieved (even without landing), so pacing stays tight.
- As a player, I see a debrief with outcomes and stats, so I understand performance and want to replay.

## Business rules / invariants (important)
- Fixed-timestep simulation: gameplay outcomes must not depend on render FPS.
- Physics (Rapier) is authoritative for transforms; ECS stores intent + gameplay state.
- Renderer/UI must not mutate simulation state directly (use events/commands).
- Missile lock must require time + cone/range constraints (no instant locks).
- Countermeasures are limited by inventory and cooldown.
- Mission success:
  - Primary objectives satisfied → mission can be completed in-air.
  - Landing at base is optional (may grant bonus score/time/rank hooks later).
- Damage severity target: “between arcade and sim”
  - Damage degrades performance and creates escalating risk.
  - Avoid frequent instant-failure; allow recovery windows (except extreme impacts).
- Visual style target: low-poly modern indie (clarity > realism).

## Non-goals (MVP)
- Multiplayer.
- Full rotor aerodynamics realism (vortex ring state, detailed blade simulation).
- Fully interactive cockpit with clickable switches.
- Large-scale persistent campaign map (territory control).
- Third-person camera as default (planned later).
