import { useState, useEffect, useCallback } from 'react';
import type { AppConfig } from '../types/config.ts';

const STORAGE_KEY = 'newtab-config';

function loadFromStorage(): AppConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

function saveToStorage(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface UseConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  setConfig: (config: AppConfig) => void;
}

export function useConfig(): UseConfigResult {
  const [config, setConfigState] = useState<AppConfig | null>(
    () => loadFromStorage(),
  );
  const [loading, setLoading] = useState(() => loadFromStorage() === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) return;

    fetch('/config.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        return res.json();
      })
      .then((data: AppConfig) => {
        saveToStorage(data);
        setConfigState(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load config');
      })
      .finally(() => setLoading(false));
  }, [config]);

  const setConfig = useCallback((newConfig: AppConfig) => {
    saveToStorage(newConfig);
    setConfigState(newConfig);
  }, []);

  return { config, loading, error, setConfig };
}
