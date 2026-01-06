export enum SystemPhase {
  Input = 'input',
  Simulation = 'simulation',
  Physics = 'physics',
  PostPhysics = 'postPhysics',
  Late = 'late'
}

export const SYSTEM_PHASE_ORDER: SystemPhase[] = [
  SystemPhase.Input,
  SystemPhase.Simulation,
  SystemPhase.Physics,
  SystemPhase.PostPhysics,
  SystemPhase.Late
];

export type FixedStepContext = {
  fixedDeltaMs: number;
  fixedDeltaSeconds: number;
  stepIndex: number;
  elapsedMs: number;
};

export type LoopFrameMetrics = {
  frameDeltaMs: number;
  usedDeltaMs: number;
  fixedStepMs: number;
  stepsExecuted: number;
  accumulatorMs: number;
  clampedMs: number;
};

export type LoopSystem = {
  id: string;
  phase: SystemPhase;
  step: (context: FixedStepContext) => void;
};
