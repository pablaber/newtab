import { useState, useEffect } from 'react';
import type { AppConfig } from '../types/config.ts';

interface UseConfigResult {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
}

export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/config.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
        return res.json();
      })
      .then((data: AppConfig) => setConfig(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load config');
      })
      .finally(() => setLoading(false));
  }, []);

  return { config, loading, error };
}
