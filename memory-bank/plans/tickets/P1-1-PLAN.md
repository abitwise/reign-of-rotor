# Ticket P1-1 — Repo + Build + Dev UX Baseline

**Status:** Done  
**Last Updated:** 2026-01-06

## Summary
Bootstrap the browser game workspace so contributors can run a dev server, produce a production build, and inspect environment-driven debug toggles. This phase establishes the Vite + TypeScript skeleton aligned with the project architecture.

## Objectives
- Create the monorepo layout with `apps/game` as the entrypoint and placeholders for core subsystems (sim, physics, render, UI, content, debug).
- Wire dev/prod builds via Vite with pnpm scripts at the root and app level.
- Provide lint, format, and test scaffolding to guard future gameplay work.
- Expose environment-driven flags for debug overlays and build labels.

## Deliverables
- pnpm workspace with root scripts and Vite configuration for the game app.
- Placeholder UI that boots successfully in dev and prod builds, showing build/debug status.
- ESLint + Prettier + Vitest configured and runnable from the workspace root.
- Documentation updates for setup, scripts, and environment flags.

## Notes
- Keep the directory structure consistent with `ARCHITECTURE.md` to ease future systems work.
- Default debug overlay should be enabled in development and opt-in for production builds.
- Placeholder scene should boot in both dev and production builds to verify the toolchain wiring.
