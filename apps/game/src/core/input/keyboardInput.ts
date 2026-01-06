type KeyboardEventTarget = {
  addEventListener: Window['addEventListener'];
  removeEventListener: Window['removeEventListener'];
};

export class KeyboardInputSampler {
  private readonly target: KeyboardEventTarget | null;
  private readonly pressed = new Set<string>();
  private readonly justPressed = new Set<string>();

  constructor(target: KeyboardEventTarget | null = typeof window === 'undefined' ? null : window) {
    this.target = target;

    this.target?.addEventListener('keydown', this.handleKeyDown);
    this.target?.addEventListener('keyup', this.handleKeyUp);
    this.target?.addEventListener('blur', this.handleBlur);
  }

  destroy(): void {
    this.target?.removeEventListener('keydown', this.handleKeyDown);
    this.target?.removeEventListener('keyup', this.handleKeyUp);
    this.target?.removeEventListener('blur', this.handleBlur);
    this.pressed.clear();
    this.justPressed.clear();
  }

  isPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  wasJustPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  clearJustPressed(): void {
    this.justPressed.clear();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.code) {
      return;
    }

    if (!this.pressed.has(event.code)) {
      this.justPressed.add(event.code);
    }
    this.pressed.add(event.code);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (!event.code) {
      return;
    }

    this.pressed.delete(event.code);
  };

  private handleBlur = (_event: Event): void => {
    this.pressed.clear();
    this.justPressed.clear();
  };
}

export type { KeyboardEventTarget };
