export type AppLayout = {
  renderHost: HTMLElement;
  uiHost: HTMLElement;
  destroy: () => void;
};

export const createAppLayout = (target: HTMLElement): AppLayout => {
  const appRoot = document.createElement('div');
  appRoot.className = 'app-root';

  const renderHost = document.createElement('div');
  renderHost.className = 'render-host';

  const uiHost = document.createElement('div');
  uiHost.className = 'ui-layer';

  appRoot.append(renderHost, uiHost);
  target.replaceChildren(appRoot);

  return {
    renderHost,
    uiHost,
    destroy: () => {
      target.replaceChildren();
    }
  };
};
