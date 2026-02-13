import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfig } from './useConfig.ts';
import { mockConfig } from '../test/fixtures.ts';

const STORAGE_KEY = 'newtab-config';

describe('useConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns config from localStorage when available', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    const { result } = renderHook(() => useConfig());

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches /config.json when localStorage is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockConfig), { status: 200 }),
    );

    const { result } = renderHook(() => useConfig());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.config).toEqual(mockConfig);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(mockConfig));
  });

  it('returns error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: 'Internal Server Error' }),
    );

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load config: 500');
    expect(result.current.config).toBeNull();
  });

  it('setConfig persists to localStorage and updates state', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    const { result } = renderHook(() => useConfig());

    const updatedConfig = { ...mockConfig, version: 2 };
    act(() => {
      result.current.setConfig(updatedConfig);
    });

    expect(result.current.config).toEqual(updatedConfig);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(updatedConfig);
  });
});
