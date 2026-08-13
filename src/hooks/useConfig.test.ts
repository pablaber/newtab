import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfig } from './useConfig.ts';
import { mockConfig } from '../test/fixtures.ts';
import type { SyncBackend } from '../services/syncBackend.ts';
import type { AppConfig } from '../types/config.ts';

const STORAGE_KEY = 'newtab-config';
const ACTIVE_STORAGE_KEY = 'newtab-active-config';
const TEST_USER = { id: 'user-123', email: 'person@example.com' };
const FIRST_SYNC = '2026-08-12T12:00:00.000Z';

function createBackend(overrides: Partial<SyncBackend> = {}): SyncBackend {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    onAuthStateChange: vi.fn().mockReturnValue(() => undefined),
    requestEmailCode: vi.fn().mockResolvedValue(undefined),
    verifyEmailCode: vi.fn().mockResolvedValue(TEST_USER),
    signOut: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn().mockResolvedValue(FIRST_SYNC),
    ...overrides,
  };
}

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

  it('shows the last active config while account initialization runs', async () => {
    const activeConfig: AppConfig = { ...mockConfig, version: 2 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(activeConfig));

    let resolveCurrentUser: ((user: null) => void) | undefined;
    const backend = createBackend({
      getCurrentUser: vi.fn().mockImplementation(() => new Promise<null>((resolve) => {
        resolveCurrentUser = resolve;
      })),
    });

    const { result } = renderHook(() => useConfig({ backend }));

    expect(result.current.loading).toBe(false);
    expect(result.current.config).toEqual(activeConfig);

    act(() => resolveCurrentUser?.(null));
    await waitFor(() => expect(result.current.config).toEqual(mockConfig));
    expect(JSON.parse(localStorage.getItem(ACTIVE_STORAGE_KEY)!)).toEqual(mockConfig);
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

  it('rejects malformed local config and replaces it with the validated default', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, modules: 'invalid' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockConfig), { status: 200 }),
    );

    const { result } = renderHook(() => useConfig());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config).toEqual(mockConfig);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(mockConfig);
  });

  it('creates a cloud config from the guest config on first sign-in', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    const backend = createBackend({
      getCurrentUser: vi.fn().mockResolvedValue(TEST_USER),
    });

    const { result } = renderHook(() => useConfig({ backend }));
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    expect(result.current.account).toEqual({
      status: 'signed-in',
      userId: TEST_USER.id,
      email: TEST_USER.email,
    });
    expect(backend.saveConfig).toHaveBeenCalledWith(TEST_USER.id, mockConfig);
    expect(result.current.config).toEqual(mockConfig);

    const accountCache = JSON.parse(
      localStorage.getItem(`newtab-account-config:${TEST_USER.id}`)!,
    );
    expect(accountCache).toEqual({
      config: mockConfig,
      remoteUpdatedAt: FIRST_SYNC,
      dirty: false,
    });
  });

  it('uses a remote config automatically when the browser still has the default', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    const remoteConfig: AppConfig = { ...mockConfig, version: 2 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockConfig), { status: 200 }),
    );
    const backend = createBackend({
      getCurrentUser: vi.fn().mockResolvedValue(TEST_USER),
      getConfig: vi.fn().mockResolvedValue({ config: remoteConfig, updatedAt: FIRST_SYNC }),
    });

    const { result } = renderHook(() => useConfig({ backend }));
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    expect(result.current.config).toEqual(remoteConfig);
    expect(result.current.initialSyncConflict).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(mockConfig);
    expect(JSON.parse(localStorage.getItem(ACTIVE_STORAGE_KEY)!)).toEqual(remoteConfig);
  });

  it('asks before replacing two customized first-sync configs and preserves the guest copy', async () => {
    const browserConfig: AppConfig = { ...mockConfig, version: 2 };
    const syncedConfig: AppConfig = { ...mockConfig, version: 3 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(browserConfig));
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockConfig), { status: 200 }),
    );
    const backend = createBackend({
      getCurrentUser: vi.fn().mockResolvedValue(TEST_USER),
      getConfig: vi.fn().mockResolvedValue({ config: syncedConfig, updatedAt: FIRST_SYNC }),
    });

    const { result } = renderHook(() => useConfig({ backend }));
    await waitFor(() => expect(result.current.initialSyncConflict).not.toBeNull());

    expect(result.current.config).toEqual(browserConfig);
    await act(async () => {
      await result.current.resolveInitialSync('synced');
    });

    expect(result.current.config).toEqual(syncedConfig);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(browserConfig);
    expect(backend.saveConfig).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.config).toEqual(browserConfig);
    expect(result.current.account.status).toBe('signed-out');
  });

  it('keeps failed account saves locally and clears the dirty state after retry', async () => {
    const cachedConfig: AppConfig = { ...mockConfig, version: 2 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    localStorage.setItem(`newtab-account-config:${TEST_USER.id}`, JSON.stringify({
      config: cachedConfig,
      remoteUpdatedAt: FIRST_SYNC,
      dirty: false,
    }));
    const saveConfig = vi.fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce('2026-08-12T12:05:00.000Z');
    const backend = createBackend({
      getCurrentUser: vi.fn().mockResolvedValue(TEST_USER),
      getConfig: vi.fn().mockResolvedValue({ config: cachedConfig, updatedAt: FIRST_SYNC }),
      saveConfig,
    });

    const { result } = renderHook(() => useConfig({ backend }));
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    const updatedConfig: AppConfig = { ...cachedConfig, version: 4 };
    act(() => result.current.setConfig(updatedConfig));
    await waitFor(() => expect(result.current.syncStatus).toBe('error'));
    expect(result.current.config).toEqual(updatedConfig);
    expect(result.current.syncError).toBe('Network unavailable');

    await act(async () => {
      await result.current.retrySync();
    });
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    const accountCache = JSON.parse(
      localStorage.getItem(`newtab-account-config:${TEST_USER.id}`)!,
    );
    expect(accountCache.dirty).toBe(false);
    expect(accountCache.config).toEqual(updatedConfig);
  });

  it('defers refocus pulls while the settings editor is open', async () => {
    const cachedConfig: AppConfig = { ...mockConfig, version: 2 };
    const remoteConfig: AppConfig = { ...mockConfig, version: 5 };
    let remote = { config: cachedConfig, updatedAt: FIRST_SYNC };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    localStorage.setItem(`newtab-account-config:${TEST_USER.id}`, JSON.stringify({
      config: cachedConfig,
      remoteUpdatedAt: FIRST_SYNC,
      dirty: false,
    }));
    const backend = createBackend({
      getCurrentUser: vi.fn().mockResolvedValue(TEST_USER),
      getConfig: vi.fn().mockImplementation(() => Promise.resolve(remote)),
    });

    const { result } = renderHook(() => useConfig({ backend }));
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    act(() => result.current.setEditorOpen(true));
    remote = { config: remoteConfig, updatedAt: '2026-08-12T12:10:00.000Z' };
    act(() => window.dispatchEvent(new Event('focus')));
    expect(result.current.config).toEqual(cachedConfig);

    act(() => result.current.setEditorOpen(false));
    await waitFor(() => expect(result.current.config).toEqual(remoteConfig));
  });

  it('serializes overlapping saves and leaves the newest config synced', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
    localStorage.setItem(`newtab-account-config:${TEST_USER.id}`, JSON.stringify({
      config: mockConfig,
      remoteUpdatedAt: FIRST_SYNC,
      dirty: false,
    }));
    const saveConfig = vi.fn().mockResolvedValue('2026-08-12T12:15:00.000Z');
    const backend = createBackend({
      getCurrentUser: vi.fn().mockResolvedValue(TEST_USER),
      getConfig: vi.fn().mockResolvedValue({ config: mockConfig, updatedAt: FIRST_SYNC }),
      saveConfig,
    });

    const { result } = renderHook(() => useConfig({ backend }));
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));

    const firstUpdate: AppConfig = { ...mockConfig, version: 2 };
    const finalUpdate: AppConfig = { ...mockConfig, version: 3 };
    act(() => {
      result.current.setConfig(firstUpdate);
      result.current.setConfig(finalUpdate);
    });

    await waitFor(() => expect(result.current.syncStatus).toBe('synced'));
    expect(result.current.config).toEqual(finalUpdate);
    expect(saveConfig).toHaveBeenLastCalledWith(TEST_USER.id, finalUpdate);
    const accountCache = JSON.parse(
      localStorage.getItem(`newtab-account-config:${TEST_USER.id}`)!,
    );
    expect(accountCache.config).toEqual(finalUpdate);
    expect(accountCache.dirty).toBe(false);
  });
});
