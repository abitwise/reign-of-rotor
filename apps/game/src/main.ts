import './style.css';
import { createApp } from './boot/createApp';

const rootElement = document.querySelector<HTMLElement>('#root');

if (!rootElement) {
  throw new Error('Root container #root is missing in index.html');
}

type WindowWithGameApp = Window & {
  gameApp?: ReturnType<typeof createApp>;
};

(window as WindowWithGameApp).gameApp = createApp(rootElement);
