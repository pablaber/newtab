import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';
import { mockConfig } from './test/fixtures.ts';
import type { AppConfig, BackgroundConfig } from './types/config.ts';

const STORAGE_KEY = 'newtab-config';

function seedConfig(background: BackgroundConfig) {
  const config: AppConfig = { ...mockConfig, background };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const fg = () => document.documentElement.style.getPropertyValue('--fg');
const dropdownBg = () => document.documentElement.style.getPropertyValue('--dropdown-bg');

describe('App foreground resolution', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--fg');
    document.documentElement.style.removeProperty('--dropdown-bg');
  });

  it('uses a light foreground on a dark background', () => {
    seedConfig({ color: '#1a1a2e' });
    render(<App />);
    expect(fg()).toBe('255, 255, 255');
    expect(dropdownBg()).toBe('30, 30, 30');
  });

  it('uses a dark foreground on a light background', () => {
    seedConfig({ color: '#f5f5f5' });
    render(<App />);
    expect(fg()).toBe('0, 0, 0');
    expect(dropdownBg()).toBe('240, 240, 240');
  });

  it('honors a saved explicit override that contradicts the background', () => {
    seedConfig({ color: '#f5f5f5', foreground: 'light' });
    render(<App />);
    expect(fg()).toBe('255, 255, 255');
  });

  it('applies the override live in preview and keeps it after saving', async () => {
    const user = userEvent.setup();
    seedConfig({ color: '#1a1a2e' });
    render(<App />);
    expect(fg()).toBe('255, 255, 255');

    await user.click(screen.getByLabelText('Settings'));
    await user.click(screen.getByRole('button', { name: 'Dark' }));

    // Preview resolves through the same logic as the home screen
    expect(fg()).toBe('0, 0, 0');
    expect(dropdownBg()).toBe('240, 240, 240');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(fg()).toBe('0, 0, 0');

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppConfig;
    expect(saved.background?.foreground).toBe('dark');
  });

  it('reverts the preview override when settings are cancelled', async () => {
    const user = userEvent.setup();
    seedConfig({ color: '#1a1a2e' });
    render(<App />);

    await user.click(screen.getByLabelText('Settings'));
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(fg()).toBe('0, 0, 0');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fg()).toBe('255, 255, 255');
  });
});
