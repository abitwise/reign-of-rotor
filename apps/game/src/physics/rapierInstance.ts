import RAPIER from '@dimforge/rapier3d-compat';

let rapierInstance: Promise<typeof RAPIER> | null = null;

export const loadRapier = (): Promise<typeof RAPIER> => {
  if (!rapierInstance) {
    rapierInstance = RAPIER.init().then(() => RAPIER);
  }

  return rapierInstance;
};

// Exposed for tests to allow isolated reinitialization when needed.
export const __resetRapierInstanceForTests = (): void => {
  rapierInstance = null;
};
