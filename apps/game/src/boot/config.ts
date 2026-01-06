export type AppEnvironment = Pick<ImportMetaEnv, 'DEV' | 'PROD' | 'MODE'> & {
  readonly VITE_ENABLE_DEBUG?: string;
  readonly VITE_BUILD_LABEL?: string;
};

export type AppConfig = {
  mode: string;
  isDev: boolean;
  isProd: boolean;
  enableDebugOverlay: boolean;
  buildLabel: string;
};

export const buildConfig = (env: AppEnvironment = import.meta.env): AppConfig => {
  const enableDebugOverlay = env.VITE_ENABLE_DEBUG
    ? env.VITE_ENABLE_DEBUG.toLowerCase() === 'true'
    : env.DEV;

  return {
    mode: env.MODE,
    isDev: env.DEV,
    isProd: env.PROD,
    enableDebugOverlay,
    buildLabel: env.VITE_BUILD_LABEL ?? 'Reign of Rotor — Bootstrap'
  };
};

export const appConfig = buildConfig();
