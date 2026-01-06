import { appConfig, type AppConfig } from './config';
import { createRootUi } from '../ui/root';

export type GameApp = {
  config: AppConfig;
  destroy: () => void;
};

export const createApp = (rootElement: HTMLElement, config: AppConfig = appConfig): GameApp => {
  const rootUi = createRootUi({ target: rootElement, config });

  return {
    config,
    destroy: rootUi.destroy
  };
};
