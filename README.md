# Reign of Rotor

Reign of Rotor is a browser-based helicopter combat demo inspired by the DOS-era **LHX: Attack Chopper**. The project is built around a TypeScript + Vite toolchain with a clear separation between simulation, physics, rendering, and UI layers.

## Project layout

- `apps/game` — Browser app entrypoint (Vite). Future gameplay code lives under `src/boot`, `core`, `ecs`, `physics`, `sim`, `render`, `ui`, `content`, and `debug`.
- `memory-bank` — Product requirements, architecture notes, and ticket plans.
- `packages/` — Reserved for shared utilities and tooling packages (none yet).

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the dev server:

   ```bash
   pnpm dev
   ```

3. Build for production and preview locally:

   ```bash
   pnpm build
   pnpm preview
   ```

## Quality gates

- Lint: `pnpm lint`
- Tests: `pnpm test`
- Format: `pnpm format`

## Environment flags

The app reads standard Vite flags plus two custom values:

- `VITE_ENABLE_DEBUG` — `true` to show the debug overlay (defaults to on for dev, off for prod).
- `VITE_BUILD_LABEL` — Optional label rendered in the debug panel.
