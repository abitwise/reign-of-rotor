import { describe, expect, it } from 'vitest';
import { buildConfig, type AppEnvironment } from '../boot/config';

describe('buildConfig', () => {
  const baseEnv: AppEnvironment = {
    DEV: true,
    PROD: false,
    MODE: 'development'
  };

  it('enables the debug overlay by default in development', () => {
    const config = buildConfig(baseEnv);

    expect(config.enableDebugOverlay).toBe(true);
    expect(config.isDev).toBe(true);
    expect(config.mode).toBe('development');
    expect(config.buildLabel).toContain('Reign of Rotor');
  });

  it('respects explicit environment overrides for production builds', () => {
    const prodEnv: AppEnvironment = {
      DEV: false,
      PROD: true,
      MODE: 'production',
      VITE_ENABLE_DEBUG: 'false',
      VITE_BUILD_LABEL: 'Release Candidate'
    };

    const config = buildConfig(prodEnv);

    expect(config.isProd).toBe(true);
    expect(config.enableDebugOverlay).toBe(false);
    expect(config.buildLabel).toBe('Release Candidate');
  });

  it('allows opting into debug overlay in production for smoke checks', () => {
    const prodEnvWithDebug: AppEnvironment = {
      DEV: false,
      PROD: true,
      MODE: 'production',
      VITE_ENABLE_DEBUG: 'true'
    };

    const config = buildConfig(prodEnvWithDebug);

    expect(config.enableDebugOverlay).toBe(true);
    expect(config.isProd).toBe(true);
  });
});
