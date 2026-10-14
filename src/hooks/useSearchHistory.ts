import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_SEARCH_HISTORY, parseSearchHistory, pruneSearchHistory, recordSearchSelection,
  serializeSearchHistory, type SearchHistory,
} from '../utils/searchHistory.ts';

export function searchHistoryStorageKey(userId?: string): string {
  return userId === undefined ? 'newtab-search-history:v1:guest' : `newtab-search-history:v1:user:${userId}`;
}

interface SessionHistory {
  history: SearchHistory;
  dirty: boolean;
}

function readHistory(key: string, fallback: SearchHistory): SearchHistory {
  try {
    return parseSearchHistory(localStorage.getItem(key), Date.now());
  } catch {
    return pruneSearchHistory(fallback, Date.now());
  }
}

function persistHistory(key: string, history: SearchHistory): boolean {
  try {
    localStorage.setItem(key, serializeSearchHistory(history));
    return true;
  } catch {
    return false;
  }
}

export function useSearchHistory(userId?: string) {
  const key = searchHistoryStorageKey(userId);
  const [sessions] = useState(() => new Map<string, SessionHistory>());
  function loadSession(storageKey: string): SessionHistory {
    const cached = sessions.get(storageKey);
    const history = cached?.dirty
      ? pruneSearchHistory(cached.history, Date.now())
      : readHistory(storageKey, cached?.history ?? EMPTY_SEARCH_HISTORY);
    const session = { history, dirty: cached?.dirty ?? false };
    sessions.set(storageKey, session);
    return session;
  }
  const [snapshot, setSnapshot] = useState(() => ({ key, history: loadSession(key).history }));
  // Adjust during render so children never see the previous account's preferences.
  let visibleHistory = snapshot.history;
  if (snapshot.key !== key) {
    visibleHistory = loadSession(key).history;
    setSnapshot({ key, history: visibleHistory });
  }

  const recordSelection = useCallback((phrase: string, url: string) => {
    const session = sessions.get(key);
    const latest = session?.dirty ? session.history : readHistory(key, session?.history ?? EMPTY_SEARCH_HISTORY);
    const history = recordSearchSelection(latest, phrase, url, Date.now());
    // Persist synchronously before navigation, outside React state updaters.
    sessions.set(key, { history, dirty: !persistHistory(key, history) });
    setSnapshot({ key, history });
  }, [key, sessions]);

  const reset = useCallback(() => {
    const history = EMPTY_SEARCH_HISTORY;
    const persisted = persistHistory(key, history);
    sessions.set(key, { history, dirty: !persisted });
    setSnapshot({ key, history });
    return persisted;
  }, [key, sessions]);

  useEffect(() => {
    const refresh = () => {
      const session = sessions.get(key);
      // A failed write (including reset) remains authoritative for this session.
      const history = session?.dirty
        ? pruneSearchHistory(session.history, Date.now())
        : readHistory(key, session?.history ?? EMPTY_SEARCH_HISTORY);
      const dirty = session?.dirty ? !persistHistory(key, history) : false;
      sessions.set(key, { history, dirty });
      setSnapshot({ key, history });
    };
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea && event.storageArea !== localStorage) return;
      } catch {
        return;
      }
      if (event.key === null || event.key === key) refresh();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [key, sessions]);

  return { history: visibleHistory, recordSelection, reset };
}
