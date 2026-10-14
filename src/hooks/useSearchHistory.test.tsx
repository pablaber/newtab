import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { searchHistoryStorageKey, useSearchHistory } from './useSearchHistory.ts';
import { recordSearchSelection, serializeSearchHistory, SEARCH_HISTORY_MAX_AGE_MS } from '../utils/searchHistory.ts';

const now = Date.UTC(2026, 9, 14);
const url = 'https://example.com';
const guestKey = searchHistoryStorageKey();

function seed(key = guestKey, phrase = 'hel', destination = url) {
  localStorage.setItem(key, serializeSearchHistory(recordSearchSelection([], phrase, destination, now)));
}

function focus() { act(() => window.dispatchEvent(new Event('focus'))); }
function storage(key: string | null = guestKey) { act(() => window.dispatchEvent(new StorageEvent('storage', { key }))); }

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });
  afterEach(() => vi.restoreAllMocks());

  it('persists synchronously once even in StrictMode and survives remounting', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const { result, unmount } = renderHook(() => useSearchHistory(), { wrapper: StrictMode });
    act(() => {
      result.current.recordSelection(' HEL ', url);
      expect(JSON.parse(localStorage.getItem(guestKey)!).entries[0].weight).toBe(1);
    });
    expect(write).toHaveBeenCalledTimes(1);
    unmount();
    const next = renderHook(() => useSearchHistory());
    expect(next.result.current.history).toEqual([{ phrase: 'hel', url, weight: 1, updatedAt: now }]);
  });

  it('switches immediately among guest and individual accounts without merging', () => {
    seed();
    seed(searchHistoryStorageKey('one'), 'one');
    const seen: { id?: string; phrases: string[] }[] = [];
    const { result, rerender } = renderHook(({ id }: { id?: string }) => {
      const hook = useSearchHistory(id);
      seen.push({ id, phrases: hook.history.map((entry) => entry.phrase) });
      return hook;
    }, { initialProps: { id: undefined } });
    rerender({ id: 'one' });
    expect(result.current.history[0].phrase).toBe('one');
    rerender({ id: 'two' });
    expect(result.current.history).toEqual([]);
    act(() => result.current.recordSelection('two', url));
    rerender({ id: undefined });
    expect(result.current.history[0].phrase).toBe('hel');
    rerender({ id: 'one' });
    expect(result.current.history[0].phrase).toBe('one');
    for (const snapshot of seen) {
      expect(snapshot.phrases.every((phrase) => phrase === (snapshot.id ?? 'hel'))).toBe(true);
    }
  });

  it('refreshes focus/storage changes, ignores other identities, and reads latest disk before recording', () => {
    const { result } = renderHook(() => useSearchHistory());
    seed();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: guestKey, storageArea: sessionStorage })));
    expect(result.current.history).toEqual([]);
    storage(searchHistoryStorageKey('another'));
    expect(result.current.history).toEqual([]);
    storage();
    expect(result.current.history[0].phrase).toBe('hel');
    seed(guestKey, 'fresh');
    focus();
    expect(result.current.history[0].phrase).toBe('fresh');
    seed(guestKey, 'external');
    act(() => result.current.recordSelection('local', url));
    expect(result.current.history.map((entry) => entry.phrase)).toEqual(['local', 'external']);
    localStorage.removeItem(guestKey);
    storage(null);
    expect(result.current.history).toEqual([]);
  });

  it('reset clears only the current identity immediately and persists across remounts', () => {
    seed();
    seed(searchHistoryStorageKey('one'), 'account');
    const { result, unmount } = renderHook(() => useSearchHistory());
    act(() => expect(result.current.reset()).toBe(true));
    expect(result.current.history).toEqual([]);
    expect(JSON.parse(localStorage.getItem(searchHistoryStorageKey('one'))!).entries).toHaveLength(1);
    unmount();
    expect(renderHook(() => useSearchHistory()).result.current.history).toEqual([]);
  });

  it('handles malformed/read-blocked storage while maintaining session learning', () => {
    localStorage.setItem(guestKey, '{');
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    act(() => result.current.recordSelection('hel', url));
    focus();
    act(() => result.current.recordSelection('hel', url));
    expect(result.current.history[0].weight).toBe(2);
  });

  it('retains failed writes across refreshes and identity switches; failed reset cannot resurrect disk data', () => {
    seed();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useSearchHistory(id), { initialProps: { id: undefined } });
    act(() => result.current.recordSelection('hel', url));
    focus(); storage();
    expect(result.current.history[0].weight).toBe(2);
    rerender({ id: 'other' }); rerender({ id: undefined });
    expect(result.current.history[0].weight).toBe(2);
    act(() => expect(result.current.reset()).toBe(false));
    focus(); storage();
    expect(result.current.history).toEqual([]);
    rerender({ id: 'other' }); rerender({ id: undefined });
    expect(result.current.history).toEqual([]);
    write.mockRestore();
    focus();
    expect(JSON.parse(localStorage.getItem(guestKey)!).entries).toEqual([]);
  });

  it('bounds and prunes on both loading and writing', () => {
    const entries = Array.from({ length: 1002 }, (_, index) => ({ phrase: `${index}`, url, weight: 1, updatedAt: now - index }));
    localStorage.setItem(guestKey, serializeSearchHistory([...entries, { phrase: 'old', url, weight: 1, updatedAt: now - SEARCH_HISTORY_MAX_AGE_MS }]));
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toHaveLength(1000);
    vi.mocked(Date.now).mockReturnValue(now + SEARCH_HISTORY_MAX_AGE_MS);
    act(() => result.current.recordSelection('new', url));
    expect(result.current.history).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(guestKey)!).entries).toHaveLength(1);
  });
});
