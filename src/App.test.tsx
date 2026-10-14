import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';
import { mockConfig } from './test/fixtures.ts';
import { recordSearchSelection, serializeSearchHistory } from './utils/searchHistory.ts';
import { searchHistoryStorageKey } from './hooks/useSearchHistory.ts';
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

describe('App search preference reset', () => {
  beforeEach(() => localStorage.clear());

  it.each(['Save', 'Cancel'])('resets immediately and survives settings %s without entering config or export', async (action) => {
    const user = userEvent.setup();
    seedConfig({ color: '#000000' });
    const key = searchHistoryStorageKey();
    localStorage.setItem(key, serializeSearchHistory(recordSearchSelection([], 'git', 'https://github.com', Date.now())));
    render(<App />);
    await user.click(screen.getByLabelText('Settings'));
    await user.click(screen.getByRole('button', { name: 'Reset learned search preferences' }));
    expect(screen.getByRole('status')).toHaveTextContent('Learned search preferences reset.');
    expect(JSON.parse(localStorage.getItem(key)!).entries).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Export' }));
    const exported = (document.querySelector('.config-editor-textarea') as HTMLTextAreaElement).value;
    expect(JSON.parse(atob(exported))).toEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)!));
    await user.click(screen.getByRole('button', { name: action }));
    expect(JSON.parse(localStorage.getItem(key)!).entries).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('searchHistory');
  });
  it('persists an ordinary Enter selection exactly once through the app shell', () => {
    seedConfig({ color: '#000000' });
    render(<App />);
    const input = screen.getByPlaceholderText('Filter links...');
    fireEvent.change(input, { target: { value: ' Git ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Navigating to GitHub')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(searchHistoryStorageKey())!).entries).toEqual([
      expect.objectContaining({ phrase: 'git', url: 'https://github.com', weight: 1 }),
    ]);
  });

});
