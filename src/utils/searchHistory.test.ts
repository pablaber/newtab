import {
  currentSearchWeight, normalizeSearchPhrase, parseSearchHistory, pruneSearchHistory,
  recordSearchSelection, searchHistoryBoost, serializeSearchHistory,
  SEARCH_HISTORY_HALF_LIFE_MS, SEARCH_HISTORY_MAX_AGE_MS, type SearchHistory,
} from './searchHistory.ts';

const now = Date.UTC(2026, 9, 14);
const url = 'https://example.com/help';

describe('search history', () => {
  it('normalizes only case and whitespace, preserving punctuation and exact phrases', () => {
    expect(normalizeSearchPhrase('  HEL \t Page!  ')).toBe('hel page!');
    const history = recordSearchSelection([], ' HEL ', url, now);
    expect(searchHistoryBoost(history, 'hel', url, now)).toBe(0.75);
    for (const phrase of ['help', 'hel!', 'he']) expect(searchHistoryBoost(history, phrase, url, now)).toBe(0);
    expect(searchHistoryBoost(history, 'hel', `${url}/`, now)).toBe(0);
  });

  it('halves weight every 14 days and accumulates from decayed weight, capped at ten', () => {
    let history = recordSearchSelection([], 'hel', url, now);
    expect(currentSearchWeight(history[0], now + SEARCH_HISTORY_HALF_LIFE_MS)).toBe(0.5);
    history = recordSearchSelection(history, 'hel', url, now + SEARCH_HISTORY_HALF_LIFE_MS);
    expect(history[0].weight).toBe(1.5);
    for (let index = 0; index < 20; index++) history = recordSearchSelection(history, 'hel', url, now + SEARCH_HISTORY_HALF_LIFE_MS);
    expect(history[0].weight).toBe(10);
    expect(searchHistoryBoost(history, 'hel', url, now + SEARCH_HISTORY_HALF_LIFE_MS)).toBeCloseTo(30 / 13);
  });

  it('lets recent competing choices overtake old preferences and eventually fades away', () => {
    let history: SearchHistory = [];
    for (let index = 0; index < 6; index++) history = recordSearchSelection(history, 'hel', url, now);
    const later = now + SEARCH_HISTORY_HALF_LIFE_MS * 3;
    history = recordSearchSelection(history, 'hel', 'https://other.com', later);
    expect(searchHistoryBoost(history, 'hel', 'https://other.com', later)).toBeGreaterThan(searchHistoryBoost(history, 'hel', url, later));
    expect(searchHistoryBoost(history, 'hel', url, now + SEARCH_HISTORY_MAX_AGE_MS)).toBe(0);
  });

  it('prunes at 90 days and evicts the oldest updates beyond 1000 pairs', () => {
    const entries = Array.from({ length: 1002 }, (_, index) => ({ phrase: 'hel', url: `${url}/${index}`, weight: 1, updatedAt: now - index }));
    const history = pruneSearchHistory([...entries, { phrase: 'old', url, weight: 10, updatedAt: now - SEARCH_HISTORY_MAX_AGE_MS }], now);
    expect(history).toHaveLength(1000);
    expect(history[999].url).toBe(`${url}/999`);
    const updated = recordSearchSelection(history, 'hel', `${url}/999`, now + 1);
    const added = recordSearchSelection(updated, 'hel', `${url}/new`, now + 2);
    expect(added).toHaveLength(1000);
    expect(added.some((entry) => entry.url === `${url}/999`)).toBe(true);
    expect(added.some((entry) => entry.url === `${url}/998`)).toBe(false);
  });

  it('loads a versioned validated bounded history and ignores malformed data', () => {
    const valid = recordSearchSelection([], 'hel', url, now);
    expect(parseSearchHistory(serializeSearchHistory(valid), now)).toEqual(valid);
    for (const raw of [null, '{', 'null', '[]', '{"version":2,"entries":[]}', '{"version":1,"entries":{}}']) {
      expect(parseSearchHistory(raw, now)).toEqual([]);
    }
    const entries = [...valid, ...valid, { ...valid[0], phrase: 'HEL' }, { ...valid[0], weight: 11 }, { ...valid[0], url: '' }, { ...valid[0], updatedAt: 'today' }];
    expect(parseSearchHistory(JSON.stringify({ version: 1, entries }), now)).toEqual(valid);
    expect(parseSearchHistory(serializeSearchHistory(valid), now + SEARCH_HISTORY_MAX_AGE_MS)).toEqual([]);
  });
});
