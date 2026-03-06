import { useState, useEffect, useRef, useMemo } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { LinkConfig, ModuleConfig } from '../../../types/config.ts';
import { scoreLinkMatch } from './searchScoring.ts';

const MAX_RESULTS = 5;

function isMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

interface SearchBarProps {
  enabled: boolean;
  placeholder: string;
  modules: ModuleConfig[];
  onNavigate: (url: string, label: string) => void;
}

interface MatchedLink extends LinkConfig {
  moduleTitle: string;
  favicon: string;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

export function SearchBar({ enabled, placeholder, modules, onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useHotkey('Mod+K', () => {
    inputRef.current?.focus();
  }, { preventDefault: true });

  const matches: MatchedLink[] = useMemo(() => {
    if (!query) return [];

    const scored: { link: MatchedLink; score: number }[] = [];

    for (const m of modules) {
      for (const link of m.links) {
        const score = scoreLinkMatch(query, link.label, m.title, link.url);
        if (score > 0) {
          scored.push({
            link: {
              ...link,
              moduleTitle: m.title,
              favicon: link.icon || getFaviconUrl(link.url),
            },
            score,
          });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS).map((s) => s.link);
  }, [query, modules]);

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!enabled) return null;

  const kbdHidden = isFocused || query.length > 0;
  const kbdLabel = isMac() ? '⌘K' : 'Ctrl K';

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && matches[selectedIndex]) {
      onNavigate(matches[selectedIndex].url, matches[selectedIndex].label);
    }
  }

  return (
    <div className="search-bar-container">
      <div className="search-bar-wrapper">
        <input
          ref={inputRef}
          className={`search-bar${kbdHidden ? '' : ' search-bar--has-kbd'}`}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus
        />
        <kbd className={`search-bar-kbd${kbdHidden ? ' search-bar-kbd--hidden' : ''}`} aria-hidden="true">
          {kbdLabel}
        </kbd>
        {matches.length > 0 && (
          <ul className="search-dropdown" ref={listRef}>
            {matches.map((link, i) => (
              <li key={`${link.url}-${link.label}`}>
                <a
                  className={`search-dropdown-item${i === selectedIndex ? ' selected' : ''}`}
                  href={link.url}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(link.url, link.label);
                  }}
                >
                  <span className="search-dropdown-left">
                    {link.favicon && (
                      <img className="search-dropdown-favicon" src={link.favicon} alt="" width={16} height={16} />
                    )}
                    <span className="search-dropdown-label">{link.label}</span>
                  </span>
                  <span className="search-dropdown-module">{link.moduleTitle}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
