import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppConfig } from '../types/config.ts';
import { configsEqual, validateConfig } from '../utils/configValidation.ts';
import { isSyncAvailable } from '../env.ts';
import {
  getSyncBackend,
  type AccountUser,
  type SyncBackend,
} from '../services/syncBackend.ts';

const GUEST_STORAGE_KEY = 'newtab-config';
const ACCOUNT_STORAGE_PREFIX = 'newtab-account-config:';

interface AccountCache {
  config: AppConfig;
  remoteUpdatedAt: string | null;
  dirty: boolean;
}

export type AccountState =
  | { status: 'disabled' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string; email: string };

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';
export type InitialSyncChoice = 'synced' | 'browser' | 'cancel';

export interface InitialSyncConflict {
  browserConfig: AppConfig;
  syncedConfig: AppConfig;
  syncedUpdatedAt: string;
}

export interface UseConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  setConfig: (config: AppConfig) => void;
  account: AccountState;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  initialSyncConflict: InitialSyncConflict | null;
  requestEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;
  resolveInitialSync: (choice: InitialSyncChoice) => Promise<void>;
  setEditorOpen: (open: boolean) => void;
}

interface UseConfigOptions {
  backend?: SyncBackend | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function loadStoredConfig(key: string): AppConfig | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validateConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredConfig(key: string, config: AppConfig): void {
  localStorage.setItem(key, JSON.stringify(config));
}

function accountStorageKey(userId: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${userId}`;
}

function loadAccountCache(userId: string): AccountCache | null {
  try {
    const raw = localStorage.getItem(accountStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountCache>;
    if (!validateConfig(parsed.config)) return null;
    if (parsed.remoteUpdatedAt !== null && typeof parsed.remoteUpdatedAt !== 'string') return null;
    if (typeof parsed.dirty !== 'boolean') return null;
    return {
      config: parsed.config,
      remoteUpdatedAt: parsed.remoteUpdatedAt,
      dirty: parsed.dirty,
    };
  } catch {
    return null;
  }
}

function saveAccountCache(userId: string, cache: AccountCache): void {
  localStorage.setItem(accountStorageKey(userId), JSON.stringify(cache));
}

async function fetchDefaultConfig(): Promise<AppConfig> {
  const response = await fetch('/config.json');
  if (!response.ok) throw new Error(`Failed to load config: ${response.status}`);
  const data: unknown = await response.json();
  if (!validateConfig(data)) throw new Error('The default configuration is invalid.');
  return data;
}

export function useConfig(options?: UseConfigOptions): UseConfigResult {
  const hasBackendOverride = options !== undefined
    && Object.prototype.hasOwnProperty.call(options, 'backend');
  const syncConfigured = hasBackendOverride ? options.backend !== null : isSyncAvailable;
  const [initialGuest] = useState(() => loadStoredConfig(GUEST_STORAGE_KEY));

  const [config, setConfigState] = useState<AppConfig | null>(initialGuest);
  const [loading, setLoading] = useState(syncConfigured || initialGuest === null);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountState>(
    syncConfigured ? { status: 'signed-out' } : { status: 'disabled' },
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    syncConfigured ? 'syncing' : 'local',
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [initialSyncConflict, setInitialSyncConflict] = useState<InitialSyncConflict | null>(null);

  const backendRef = useRef<SyncBackend | null>(null);
  const currentUserRef = useRef<AccountUser | null>(null);
  const accountReadyRef = useRef(false);
  const editorOpenRef = useRef(false);
  const deferredPullRef = useRef(false);
  const focusPullRef = useRef<Promise<void> | null>(null);
  const activationRef = useRef(0);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const conflictUserRef = useRef<AccountUser | null>(null);

  const applyConfig = useCallback((nextConfig: AppConfig) => {
    setConfigState(nextConfig);
  }, []);

  const getGuestConfig = useCallback(async (): Promise<AppConfig> => {
    const stored = loadStoredConfig(GUEST_STORAGE_KEY);
    if (stored) return stored;
    const defaultConfig = await fetchDefaultConfig();
    saveStoredConfig(GUEST_STORAGE_KEY, defaultConfig);
    return defaultConfig;
  }, []);

  const queuePush = useCallback((userId: string): Promise<void> => {
    setSyncStatus('syncing');
    setSyncError(null);

    writeQueueRef.current = writeQueueRef.current.catch(() => undefined).then(async () => {
      const backend = backendRef.current;
      const cache = loadAccountCache(userId);
      if (!backend || !cache?.dirty) return;

      const snapshot = cache.config;
      try {
        const updatedAt = await backend.saveConfig(userId, snapshot);
        const latest = loadAccountCache(userId);
        if (!latest) return;

        const isLatestSave = configsEqual(latest.config, snapshot);
        saveAccountCache(userId, {
          ...latest,
          remoteUpdatedAt: updatedAt,
          dirty: !isLatestSave,
        });

        if (currentUserRef.current?.id === userId) {
          setLastSyncedAt(updatedAt);
          if (isLatestSave) setSyncStatus('synced');
        }
      } catch (pushError) {
        if (currentUserRef.current?.id === userId) {
          setSyncStatus('error');
          setSyncError(errorMessage(pushError));
        }
      }
    });

    return writeQueueRef.current;
  }, []);

  const pullRemote = useCallback(async (user: AccountUser): Promise<void> => {
    if (editorOpenRef.current) {
      deferredPullRef.current = true;
      return;
    }

    const cache = loadAccountCache(user.id);
    if (!cache) return;
    if (cache.dirty) {
      await queuePush(user.id);
      return;
    }

    const backend = backendRef.current;
    if (!backend) return;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const remote = await backend.getConfig(user.id);
      if (!remote) {
        saveAccountCache(user.id, { ...cache, dirty: true });
        await queuePush(user.id);
        return;
      }
      if (!validateConfig(remote.config)) {
        throw new Error('The synced configuration is invalid.');
      }

      const remoteIsNewer = !cache.remoteUpdatedAt
        || Date.parse(remote.updatedAt) > Date.parse(cache.remoteUpdatedAt);
      if (remoteIsNewer) {
        saveAccountCache(user.id, {
          config: remote.config,
          remoteUpdatedAt: remote.updatedAt,
          dirty: false,
        });
        if (
          currentUserRef.current?.id === user.id
          && !configsEqual(cache.config, remote.config)
        ) applyConfig(remote.config);
      }

      if (currentUserRef.current?.id === user.id) {
        setLastSyncedAt(remote.updatedAt);
        setSyncStatus('synced');
      }
    } catch (pullError) {
      if (currentUserRef.current?.id === user.id) {
        setSyncStatus('error');
        setSyncError(errorMessage(pullError));
      }
    }
  }, [applyConfig, queuePush]);

  const activateGuest = useCallback(async (disabled = false): Promise<void> => {
    const activation = ++activationRef.current;
    currentUserRef.current = null;
    accountReadyRef.current = false;
    conflictUserRef.current = null;
    setInitialSyncConflict(null);
    setLastSyncedAt(null);
    setAccount(disabled ? { status: 'disabled' } : { status: 'signed-out' });
    setSyncStatus('local');
    setSyncError(null);

    try {
      const guest = await getGuestConfig();
      if (activation !== activationRef.current) return;
      applyConfig(guest);
      setError(null);
    } catch (guestError) {
      if (activation !== activationRef.current) return;
      setError(errorMessage(guestError));
    } finally {
      if (activation === activationRef.current) setLoading(false);
    }
  }, [applyConfig, getGuestConfig]);

  const activateUser = useCallback(async (user: AccountUser): Promise<void> => {
    const activation = ++activationRef.current;
    currentUserRef.current = user;
    accountReadyRef.current = false;
    conflictUserRef.current = null;
    setInitialSyncConflict(null);
    setAccount({ status: 'signed-in', userId: user.id, email: user.email });
    setSyncStatus('syncing');
    setSyncError(null);

    const cached = loadAccountCache(user.id);
    if (cached) {
      accountReadyRef.current = true;
      applyConfig(cached.config);
      setLastSyncedAt(cached.remoteUpdatedAt);
      setLoading(false);
      if (cached.dirty) await queuePush(user.id);
      else await pullRemote(user);
      return;
    }

    let guest: AppConfig;
    try {
      guest = await getGuestConfig();
    } catch (guestError) {
      if (activation === activationRef.current) {
        setError(errorMessage(guestError));
        setLoading(false);
      }
      return;
    }

    const backend = backendRef.current;
    if (!backend) return;

    try {
      const remote = await backend.getConfig(user.id);
      if (activation !== activationRef.current) return;

      if (!remote) {
        accountReadyRef.current = true;
        saveAccountCache(user.id, {
          config: guest,
          remoteUpdatedAt: null,
          dirty: true,
        });
        applyConfig(guest);
        setLoading(false);
        await queuePush(user.id);
        return;
      }
      if (!validateConfig(remote.config)) {
        throw new Error('The synced configuration is invalid.');
      }

      let defaultConfig: AppConfig | null = null;
      try {
        defaultConfig = await fetchDefaultConfig();
      } catch {
        // A missing seed should not block an account whose local and remote configs are valid.
      }
      if (activation !== activationRef.current) return;

      if (
        configsEqual(guest, remote.config)
        || (defaultConfig !== null && configsEqual(guest, defaultConfig))
      ) {
        accountReadyRef.current = true;
        saveAccountCache(user.id, {
          config: remote.config,
          remoteUpdatedAt: remote.updatedAt,
          dirty: false,
        });
        applyConfig(remote.config);
        setLastSyncedAt(remote.updatedAt);
        setSyncStatus('synced');
      } else {
        conflictUserRef.current = user;
        applyConfig(guest);
        setInitialSyncConflict({
          browserConfig: guest,
          syncedConfig: remote.config,
          syncedUpdatedAt: remote.updatedAt,
        });
      }
      setLoading(false);
    } catch (remoteError) {
      if (activation !== activationRef.current) return;
      applyConfig(guest);
      setLoading(false);
      setSyncStatus('error');
      setSyncError(errorMessage(remoteError));
    }
  }, [applyConfig, getGuestConfig, pullRemote, queuePush]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      if (!syncConfigured) {
        if (initialGuest) return;
        await activateGuest(true);
        return;
      }

      try {
        const backend = hasBackendOverride
          ? options?.backend ?? null
          : await getSyncBackend();
        if (disposed) return;
        if (!backend) {
          await activateGuest(true);
          return;
        }

        backendRef.current = backend;
        const user = await backend.getCurrentUser();
        if (disposed) return;
        if (user) await activateUser(user);
        else await activateGuest(false);
        if (disposed) return;

        unsubscribe = backend.onAuthStateChange((nextUser) => {
          if (nextUser) void activateUser(nextUser);
          else void activateGuest(false);
        });
      } catch (initializationError) {
        if (disposed) return;
        await activateGuest(false);
        if (disposed) return;
        setSyncStatus('error');
        setSyncError(errorMessage(initializationError));
      }
    };

    void initialize();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [activateGuest, activateUser, hasBackendOverride, initialGuest, options?.backend, syncConfigured]);

  useEffect(() => {
    if (!syncConfigured) return;
    const refresh = () => {
      const user = currentUserRef.current;
      if (!user || focusPullRef.current) return;
      focusPullRef.current = pullRemote(user).finally(() => {
        focusPullRef.current = null;
      });
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refresh);
    };
  }, [pullRemote, syncConfigured]);

  const setConfig = useCallback((newConfig: AppConfig) => {
    const user = currentUserRef.current;
    if (!user || !accountReadyRef.current) {
      saveStoredConfig(GUEST_STORAGE_KEY, newConfig);
      applyConfig(newConfig);
      return;
    }

    const currentCache = loadAccountCache(user.id);
    saveAccountCache(user.id, {
      config: newConfig,
      remoteUpdatedAt: currentCache?.remoteUpdatedAt ?? null,
      dirty: true,
    });
    applyConfig(newConfig);
    void queuePush(user.id);
  }, [applyConfig, queuePush]);

  const requestEmailCode = useCallback(async (email: string) => {
    const backend = backendRef.current;
    if (!backend) throw new Error('Account sync is not available.');
    await backend.requestEmailCode(email.trim().toLowerCase());
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    const backend = backendRef.current;
    if (!backend) throw new Error('Account sync is not available.');
    const user = await backend.verifyEmailCode(email.trim().toLowerCase(), code.trim());
    if (currentUserRef.current?.id !== user.id) await activateUser(user);
  }, [activateUser]);

  const signOut = useCallback(async () => {
    const backend = backendRef.current;
    if (!backend) return;
    await backend.signOut();
    await activateGuest(false);
  }, [activateGuest]);

  const retrySync = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user) return;
    const cache = loadAccountCache(user.id);
    if (!cache) {
      await activateUser(user);
    } else if (cache.dirty) {
      await queuePush(user.id);
    } else {
      await pullRemote(user);
    }
  }, [activateUser, pullRemote, queuePush]);

  const resolveInitialSync = useCallback(async (choice: InitialSyncChoice) => {
    const conflict = initialSyncConflict;
    const user = conflictUserRef.current;
    if (!conflict || !user || currentUserRef.current?.id !== user.id) return;

    setInitialSyncConflict(null);
    conflictUserRef.current = null;

    if (choice === 'cancel') {
      try {
        await signOut();
      } catch (cancelError) {
        conflictUserRef.current = user;
        setInitialSyncConflict(conflict);
        setSyncStatus('error');
        setSyncError(errorMessage(cancelError));
      }
      return;
    }

    if (choice === 'synced') {
      accountReadyRef.current = true;
      saveAccountCache(user.id, {
        config: conflict.syncedConfig,
        remoteUpdatedAt: conflict.syncedUpdatedAt,
        dirty: false,
      });
      applyConfig(conflict.syncedConfig);
      setLastSyncedAt(conflict.syncedUpdatedAt);
      setSyncStatus('synced');
      return;
    }

    accountReadyRef.current = true;
    saveAccountCache(user.id, {
      config: conflict.browserConfig,
      remoteUpdatedAt: null,
      dirty: true,
    });
    applyConfig(conflict.browserConfig);
    await queuePush(user.id);
  }, [applyConfig, initialSyncConflict, queuePush, signOut]);

  const setEditorOpen = useCallback((open: boolean) => {
    editorOpenRef.current = open;
    if (!open && deferredPullRef.current) {
      deferredPullRef.current = false;
      const user = currentUserRef.current;
      if (user) void pullRemote(user);
    }
  }, [pullRemote]);

  return {
    config,
    loading,
    error,
    setConfig,
    account,
    syncStatus,
    syncError,
    lastSyncedAt,
    initialSyncConflict,
    requestEmailCode,
    verifyEmailCode,
    signOut,
    retrySync,
    resolveInitialSync,
    setEditorOpen,
  };
}
