import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type {
  LinkConfig,
  ModuleConfig,
  SubcommandConfig,
  SubcommandItemConfig,
} from '../../../types/config.ts';
import { resolveSubcommandUrl } from '../../../utils/subcommands.ts';
import { getFaviconUrl } from '../../../utils/favicon.ts';
import { scoreLinkMatch, scoreMatch } from './searchScoring.ts';

const MAX_RESULTS = 5;

function isMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

interface SearchBarProps {
  enabled: boolean;
  hotkeyEnabled?: boolean;
  placeholder: string;
  modules: ModuleConfig[];
  subcommands?: SubcommandConfig[];
  onNavigate: (url: string, label: string) => void;
}

interface MatchedLink extends LinkConfig {
  kind: 'link';
  moduleTitle: string;
  favicon: string;
}

interface MatchedSubcommand extends SubcommandConfig {
  kind: 'subcommand';
}

type GlobalMatch = MatchedLink | MatchedSubcommand;

function itemFavicon(item: SubcommandItemConfig): string {
  return item.icon || getFaviconUrl(item.url);
}

export function SearchBar({
  enabled,
  hotkeyEnabled = true,
  placeholder,
  modules,
  subcommands = [],
  onNavigate,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [scope, setScope] = useState<SubcommandConfig | null>(null);
  const [arguments_, setArguments] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectOnRenderRef = useRef(false);
  const launcherEnabled = enabled || subcommands.length > 0;

  useHotkey('Mod+K', () => {
    inputRef.current?.focus();
  }, { enabled: launcherEnabled && hotkeyEnabled, preventDefault: true });

  const globalMatches = useMemo<GlobalMatch[]>(() => {
    if (!query || scope) return [];
    const scored: { match: GlobalMatch; score: number }[] = [];

    if (enabled) {
      for (const module of modules) {
        for (const link of module.links) {
          const score = scoreLinkMatch(query, link.label, module.title, link.url);
          if (score > 0) {
            scored.push({
              match: {
                ...link,
                kind: 'link',
                moduleTitle: module.title,
                favicon: link.icon || getFaviconUrl(link.url),
              },
              score,
            });
          }
        }
      }
    }

    for (const subcommand of subcommands) {
      const score = Math.max(
        scoreMatch(query, subcommand.trigger) * 7,
        scoreMatch(query, subcommand.name) * 5,
      );
      if (score > 0) scored.push({ match: { ...subcommand, kind: 'subcommand' }, score });
    }

    scored.sort((left, right) => right.score - left.score);
    return scored.slice(0, MAX_RESULTS).map(({ match }) => match);
  }, [enabled, modules, query, scope, subcommands]);

  const scopeItems = useMemo(() => {
    if (!scope || arguments_.length > 0) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return scope.items.filter((item) => (
      !normalizedQuery
      || item.label.toLocaleLowerCase().includes(normalizedQuery)
      || item.url.toLocaleLowerCase().includes(normalizedQuery)
    )).slice(0, MAX_RESULTS);
  }, [arguments_.length, query, scope]);

  const generatedUrl = useMemo(() => {
    if (!scope?.freeform || arguments_.length !== scope.freeform.fields.length) return null;
    const values = Object.fromEntries(
      scope.freeform.fields.map((field, index) => [field.name, arguments_[index]]),
    );
    return resolveSubcommandUrl(scope.freeform, values);
  }, [arguments_, scope]);

  const liveGeneratedUrl = useMemo(() => {
    if (!scope?.freeform || !query.trim()) return null;
    if (arguments_.length !== scope.freeform.fields.length - 1) return null;
    const values = Object.fromEntries(
      scope.freeform.fields.map((field, index) => [
        field.name,
        index < arguments_.length ? arguments_[index] : query.trim(),
      ]),
    );
    return resolveSubcommandUrl(scope.freeform, values);
  }, [arguments_, query, scope]);

  const visibleResultCount = scope
    ? (generatedUrl ? 1 : scopeItems.length + (liveGeneratedUrl ? 1 : 0))
    : globalMatches.length;

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedIndex]);

  useLayoutEffect(() => {
    if (!selectOnRenderRef.current) return;
    inputRef.current?.select();
    selectOnRenderRef.current = false;
  }, [arguments_.length, query]);

  if (!launcherEnabled) return null;

  const kbdHidden = isFocused || query.length > 0 || scope !== null;
  const kbdLabel = isMac() ? '⌘K' : 'Ctrl K';
  const currentField = scope?.freeform?.fields[arguments_.length];
  const fieldSyntax = scope?.freeform?.fields.map((field) => `<${field.name}>`).join(' ');

  function activateScope(subcommand: SubcommandConfig) {
    setScope(subcommand);
    setArguments([]);
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }

  function exitScope() {
    setScope(null);
    setArguments([]);
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }

  function returnToPreviousField(selectValue: boolean) {
    if (arguments_.length === 0) return;
    const previousValue = arguments_[arguments_.length - 1];
    setArguments(arguments_.slice(0, -1));
    setQuery(previousValue);
    setSelectedIndex(0);
    if (selectValue) selectOnRenderRef.current = true;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (query) setQuery('');
      else if (scope) exitScope();
      return;
    }

    if (scope && event.key === 'Backspace' && !query) {
      event.preventDefault();
      returnToPreviousField(false);
      return;
    }

    if (event.key === 'Tab') {
      if (!scope) {
        const exact = subcommands.find(
          (subcommand) => subcommand.trigger.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
        );
        if (exact) {
          event.preventDefault();
          activateScope(exact);
        }
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        returnToPreviousField(true);
        return;
      }
      if (!scope.freeform || generatedUrl || !query.trim()) return;
      setArguments([...arguments_, query.trim()]);
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, visibleResultCount - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key !== 'Enter') return;

    if (scope) {
      if (generatedUrl) onNavigate(generatedUrl, scope.name);
      else if (scopeItems[selectedIndex]) {
        const item = scopeItems[selectedIndex];
        onNavigate(item.url, item.label);
      } else if (liveGeneratedUrl && selectedIndex === scopeItems.length) {
        onNavigate(liveGeneratedUrl, scope.name);
      }
      return;
    }

    const match = globalMatches[selectedIndex];
    if (!match) return;
    if (match.kind === 'subcommand') activateScope(match);
    else onNavigate(match.url, match.label);
  }

  return (
    <div className="search-bar-container">
      <div className="search-bar-wrapper">
        <div className={`search-bar-shell${isFocused ? ' focused' : ''}`}>
          {scope && (
            <button
              type="button"
              className="search-scope-chip"
              onClick={exitScope}
              aria-label={`Exit ${scope.name} subcommand`}
            >
              <strong>{scope.trigger}</strong>
              <span aria-hidden="true">×</span>
            </button>
          )}
          {scope?.freeform && arguments_.map((value, index) => (
            <span className="search-argument-chip" key={`${scope.freeform?.fields[index].name}-${index}`}>
              <small>{scope.freeform?.fields[index].name}</small>
              {value}
            </span>
          ))}
          <input
            ref={inputRef}
            className={`search-bar${kbdHidden ? '' : ' search-bar--has-kbd'}`}
            type="text"
            aria-label={scope ? `${scope.name} ${currentField?.name ?? 'destination'}` : undefined}
            placeholder={scope
              ? (generatedUrl ? 'Press Enter to open' : currentField ? `<${currentField.name}>` : 'Filter items...')
              : enabled ? placeholder : 'Run a subcommand...'}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            readOnly={Boolean(generatedUrl)}
            autoFocus
          />
          <kbd className={`search-bar-kbd${kbdHidden ? ' search-bar-kbd--hidden' : ''}`} aria-hidden="true">
            {kbdLabel}
          </kbd>
        </div>

        {scope && fieldSyntax && (
          <div className="search-scope-syntax">
            <span>{scope.name}</span>
            <code>{fieldSyntax}</code>
            <span>Tab to commit</span>
          </div>
        )}

        {globalMatches.length > 0 && !scope && (
          <ul className="search-dropdown" ref={listRef}>
            {globalMatches.map((match, index) => (
              <li key={match.kind === 'subcommand' ? `subcommand-${match.trigger}` : `${match.url}-${match.label}`}>
                <a
                  className={`search-dropdown-item${index === selectedIndex ? ' selected' : ''}`}
                  href={match.kind === 'link' ? match.url : '#'}
                  onClick={(event) => {
                    event.preventDefault();
                    if (match.kind === 'subcommand') activateScope(match);
                    else onNavigate(match.url, match.label);
                  }}
                >
                  <span className="search-dropdown-left">
                    {match.kind === 'link' && match.favicon && (
                      <img className="search-dropdown-favicon" src={match.favicon} alt="" width={16} height={16} />
                    )}
                    {match.kind === 'subcommand' && <span className="search-subcommand-icon" aria-hidden="true">›_</span>}
                    <span className="search-dropdown-label">{match.kind === 'subcommand' ? match.name : match.label}</span>
                  </span>
                  <span className="search-dropdown-module">
                    {match.kind === 'subcommand' ? match.trigger : match.moduleTitle}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {scope && (generatedUrl || liveGeneratedUrl || scopeItems.length > 0) && (
          <ul className="search-dropdown" ref={listRef}>
            {generatedUrl ? (
              <li>
                <a
                  className="search-dropdown-item selected search-generated-item"
                  href={generatedUrl}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(generatedUrl, scope.name);
                  }}
                >
                  <span className="search-dropdown-left">
                    <span className="search-subcommand-icon" aria-hidden="true">↗</span>
                    <span className="search-dropdown-label">Open generated destination</span>
                  </span>
                  <span className="search-generated-url">{generatedUrl}</span>
                </a>
              </li>
            ) : (
              <>
                {scopeItems.map((item, index) => (
                  <li key={`${item.url}-${item.label}`}>
                    <a
                      className={`search-dropdown-item${index === selectedIndex ? ' selected' : ''}`}
                      href={item.url}
                      onClick={(event) => {
                        event.preventDefault();
                        onNavigate(item.url, item.label);
                      }}
                    >
                      <span className="search-dropdown-left">
                        {itemFavicon(item) && (
                          <img className="search-dropdown-favicon" src={itemFavicon(item)} alt="" width={16} height={16} />
                        )}
                        <span className="search-dropdown-label">{item.label}</span>
                      </span>
                      <span className="search-dropdown-module">{scope.trigger}</span>
                    </a>
                  </li>
                ))}
                {liveGeneratedUrl && (
                  <li>
                    <a
                      className={`search-dropdown-item search-generated-item${selectedIndex === scopeItems.length ? ' selected' : ''}`}
                      href={liveGeneratedUrl}
                      onClick={(event) => {
                        event.preventDefault();
                        onNavigate(liveGeneratedUrl, scope.name);
                      }}
                    >
                      <span className="search-dropdown-left">
                        <span className="search-subcommand-icon" aria-hidden="true">↗</span>
                        <span className="search-dropdown-label">Open generated destination</span>
                      </span>
                      <span className="search-generated-url">{liveGeneratedUrl}</span>
                    </a>
                  </li>
                )}
              </>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
