import { useState, useEffect, useRef, useMemo } from 'react';
import type { LinkConfig, ModuleConfig } from '../types/config.ts';

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
  const listRef = useRef<HTMLUListElement>(null);

  const matches: MatchedLink[] = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return modules.flatMap((m) =>
      m.links
        .filter((link) => link.label.toLowerCase().includes(q))
        .map((link) => ({ ...link, moduleTitle: m.title, favicon: link.icon || getFaviconUrl(link.url) }))
    );
  }, [query, modules]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [matches.length]);

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!enabled) return null;

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
          className="search-bar"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
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
