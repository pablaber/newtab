const DAY_MS = 24 * 60 * 60 * 1000;
export const SEARCH_HISTORY_HALF_LIFE_MS = 14 * DAY_MS;
export const SEARCH_HISTORY_MAX_AGE_MS = 90 * DAY_MS;
export const SEARCH_HISTORY_LIMIT = 1000;
export const SEARCH_HISTORY_VERSION = 1;

export interface SearchHistoryEntry {
  phrase: string;
  url: string;
  weight: number;
  updatedAt: number;
}

export type SearchHistory = readonly SearchHistoryEntry[];
export const EMPTY_SEARCH_HISTORY: SearchHistory = [];

export function normalizeSearchPhrase(phrase: string): string {
  return phrase.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function currentSearchWeight(entry: SearchHistoryEntry, now: number): number {
  return entry.weight * 2 ** (-Math.max(0, now - entry.updatedAt) / SEARCH_HISTORY_HALF_LIFE_MS);
}

export function searchHistoryBoost(history: SearchHistory, phrase: string, url: string, now: number): number {
  const normalized = normalizeSearchPhrase(phrase);
  const entry = history.find((item) => item.phrase === normalized && item.url === url);
  if (!entry || now - entry.updatedAt >= SEARCH_HISTORY_MAX_AGE_MS) return 0;
  const weight = currentSearchWeight(entry, now);
  return 3 * weight / (weight + 3);
}

export function pruneSearchHistory(history: SearchHistory, now: number): SearchHistory {
  return history
    .filter((entry) => now - entry.updatedAt < SEARCH_HISTORY_MAX_AGE_MS)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, SEARCH_HISTORY_LIMIT);
}

export function recordSearchSelection(history: SearchHistory, phrase: string, url: string, now: number): SearchHistory {
  const normalized = normalizeSearchPhrase(phrase);
  const current = pruneSearchHistory(history, now);
  if (!normalized || !url) return current;
  const previous = current.find((entry) => entry.phrase === normalized && entry.url === url);
  return pruneSearchHistory([
    { phrase: normalized, url, weight: Math.min(10, (previous ? currentSearchWeight(previous, now) : 0) + 1), updatedAt: now },
    ...current.filter((entry) => entry !== previous),
  ], now);
}

export function parseSearchHistory(raw: string | null, now: number): SearchHistory {
  if (!raw) return EMPTY_SEARCH_HISTORY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed)
      || parsed.version !== SEARCH_HISTORY_VERSION || !('entries' in parsed) || !Array.isArray(parsed.entries)) {
      return EMPTY_SEARCH_HISTORY;
    }
    const seen = new Set<string>();
    const valid: SearchHistoryEntry[] = [];
    for (const entry of parsed.entries) {
      if (!entry || typeof entry !== 'object' || typeof entry.phrase !== 'string'
        || !entry.phrase || normalizeSearchPhrase(entry.phrase) !== entry.phrase
        || typeof entry.url !== 'string' || !entry.url
        || typeof entry.weight !== 'number' || !Number.isFinite(entry.weight) || entry.weight <= 0 || entry.weight > 10
        || typeof entry.updatedAt !== 'number' || !Number.isFinite(entry.updatedAt) || entry.updatedAt < 0) continue;
      const pair = JSON.stringify([entry.phrase, entry.url]);
      if (seen.has(pair)) continue;
      seen.add(pair);
      valid.push({ phrase: entry.phrase, url: entry.url, weight: entry.weight, updatedAt: Math.min(entry.updatedAt, now) });
    }
    return pruneSearchHistory(valid, now);
  } catch {
    return EMPTY_SEARCH_HISTORY;
  }
}

export function serializeSearchHistory(history: SearchHistory): string {
  return JSON.stringify({ version: SEARCH_HISTORY_VERSION, entries: history });
}
