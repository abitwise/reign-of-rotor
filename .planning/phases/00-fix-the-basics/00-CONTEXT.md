# Phase 0: Fix the Basics - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken fundamentals so the game is playable: enemies must be visible, missiles must be visible, flight must be controllable and fun, and terrain must not look like tiled wallpaper. This phase makes the existing systems actually work for a player — no new features, just making what exists usable.

</domain>

<decisions>
## Implementation Decisions

### Enemy Visibility
- Enemies need procedural meshes built from Babylon.js primitives (composed shapes, not external assets)
- All enemy types uniform military color (dark green/gray) — not color-coded by type
- SAM sites, radar sites, and patrol vehicles each get distinct silhouettes but same color palette
- Add HUD markers (diamond/triangle icons) showing enemy positions so they can be spotted at distance

### Flight Feel
- Target feel: arcade-smooth — like Battlefield helicopters, forgiving and easy to pick up
- Stability assist always on and strong by default — aggressive auto-leveling, hard to crash
- Auto-hover on collective release — release R/F and helicopter holds altitude automatically
- General flight needs to be less twitchy, less sluggish, and more stable — reduce torques, increase damping, tune assists to make first-time flying fun
- Overall: fun first, sim second

### Missile & Weapon Visuals
- Player missiles: glowing emissive cylinder mesh + particle smoke/fire trail
- SAM missiles (fired at player): same visual treatment as player missiles — visible and fair
- Cannon fire: bright tracer lines from gun to impact point — classic helicopter game feedback
- Hit effects: simple explosion flash (quick bright flash + expanding sphere) — minimal but clear
- All existing explosion/impact events need to be consumed and rendered

### Terrain Appearance
- Current problems: obvious tiling repetition AND too flat/boring
- Target vibe: desert/arid — sandy browns, rocky terrain, sparse vegetation, Middle East ops feel
- Scope: full terrain rework — better heightmaps with hills/valleys, proper texture that doesn't tile obviously
- Include simple procedural props (box-shaped buildings, structures) scattered around to give sense of place
- Low-poly modern indie style maintained

### Claude's Discretion
- Exact procedural mesh geometry for each enemy type (SAM turret shape, radar dish shape, vehicle shape)
- Specific flight tuning values (torques, damping, assist strengths)
- Tracer line rendering technique (thin meshes, line system, or particle trail)
- Terrain heightmap generation algorithm and texture approach
- Procedural prop placement logic
- Exact explosion flash implementation

</decisions>

<specifics>
## Specific Ideas

- Flight should feel like Battlefield helicopter controls — smooth, forgiving, fun immediately
- Enemy silhouettes should be distinct enough to identify type at a glance even without color coding
- Desert/arid terrain with sandy browns and rocky features
- HUD markers for enemies so you know where threats are
- Simple explosion flash rather than complex particle systems (that's for the later VFX phase)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 00-fix-the-basics*
*Context gathered: 2026-02-08*
