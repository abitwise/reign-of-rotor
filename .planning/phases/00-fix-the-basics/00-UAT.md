---
status: testing
phase: 00-fix-the-basics
source: 00-01-SUMMARY.md, 00-02-SUMMARY.md, 00-03-SUMMARY.md
started: 2026-02-09T12:00:00Z
updated: 2026-02-09T12:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Missile Trails
expected: |
  Fire a missile at a target (or let an enemy SAM fire at you). Missiles should appear as glowing cylinders with visible smoke/fire particle trails behind them.
awaiting: user response

## Tests

### 1. Enemy Visibility
expected: SAM sites, radar installations, and ground vehicles each render as distinct procedural mesh silhouettes in olive-drab military colors, clearly visible against the terrain
result: issue
reported: "I saw some trees and a box, it is very hard to fly around, helicopter is slow to respond and hard to move up or down. I did not see enemies."
severity: major

### 2. Missile Trails
expected: When you fire a missile (or an enemy SAM fires at you), missiles appear as glowing cylinders with visible smoke/fire particle trails behind them
result: [pending]

### 3. Cannon Tracers
expected: Firing the cannon produces bright yellow-orange tracer lines from the gun toward impact points, visible for a brief flash
result: [pending]

### 4. Explosion Effects
expected: When a missile hits a target (or you destroy an enemy), a bright expanding flash/sphere explosion effect appears at the impact point
result: [pending]

### 5. HUD Enemy Markers
expected: Red-bordered diamond markers appear on screen showing enemy positions, helping you locate targets at a distance
result: [pending]

### 6. Arcade Flight Feel
expected: The helicopter feels smooth and controllable -- not twitchy or jerky. Turning and pitching respond proportionally with strong auto-leveling (releasing stick returns to level flight)
result: [pending]

### 7. Auto-Hover on Collective Release
expected: Releasing the collective keys (R/F) causes the helicopter to hold its current altitude automatically. It should not sink or climb when you let go -- just hover in place
result: [pending]

### 8. Desert Terrain
expected: The ground is a sandy desert landscape with gentle rolling hills. No green patches or obvious tiling grid patterns. Colors are sandy/tan/brown
result: [pending]

### 9. Desert Props
expected: Sandy-colored buildings and structures (huts, compounds, towers) are scattered across the terrain, fitting the desert theme
result: [pending]

## Summary

total: 9
passed: 0
issues: 1
pending: 8
skipped: 0

## Gaps

- truth: "SAM sites, radar installations, and ground vehicles each render as distinct procedural mesh silhouettes in olive-drab military colors, clearly visible against the terrain"
  status: failed
  reason: "User reported: I saw some trees and a box, it is very hard to fly around, helicopter is slow to respond and hard to move up or down. I did not see enemies."
  severity: major
  test: 1
  artifacts: []
  missing: []
