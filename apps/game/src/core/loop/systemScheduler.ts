import { SYSTEM_PHASE_ORDER } from './types';
import type { FixedStepContext, LoopSystem, SystemPhase } from './types';

export class SystemScheduler {
  private systems: Map<SystemPhase, LoopSystem[]>;

  constructor() {
    this.systems = new Map(SystemPhaseValues.map((phase) => [phase, []]));
  }

  addSystem(system: LoopSystem): void {
    const phaseSystems = this.systems.get(system.phase);

    if (!phaseSystems) {
      throw new Error(`Unknown system phase: ${system.phase}`);
    }

    // Remove any existing system with the same id to keep ordering predictable.
    const filtered = phaseSystems.filter((entry) => entry.id !== system.id);
    filtered.push(system);
    this.systems.set(system.phase, filtered);
  }

  removeSystem(id: string): void {
    for (const phase of SystemPhaseValues) {
      const existing = this.systems.get(phase);
      if (!existing || existing.length === 0) {
        continue;
      }

      const filtered = existing.filter((system) => system.id !== id);
      if (filtered.length !== existing.length) {
        this.systems.set(phase, filtered);
        return;
      }
    }
  }

  clear(): void {
    this.systems = new Map(SystemPhaseValues.map((phase) => [phase, []]));
  }

  runSystems(context: FixedStepContext): void {
    for (const phase of SystemPhaseValues) {
      const systems = this.systems.get(phase);
      if (!systems || systems.length === 0) {
        continue;
      }

      for (const system of systems) {
        system.step(context);
      }
    }
  }
}

export const createSystemScheduler = (): SystemScheduler => new SystemScheduler();

const SystemPhaseValues: SystemPhase[] = [...SYSTEM_PHASE_ORDER];
