import { registerServiceWorker } from './serviceWorker.ts';

describe('registerServiceWorker', () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

  afterEach(() => {
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  it('registers the app-shell worker after the page finishes loading', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  });
});
