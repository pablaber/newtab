import { useState, useEffect, useRef, useMemo } from 'react';
import type { LinkConfig, ModuleConfig } from '../types/config.ts';

interface SearchBarProps {
  enabled: boolean;
  placeholder: string;
  modules: ModuleConfig[];
}

interface MatchedLink extends LinkConfig {
  moduleTitle: string;
}

export function SearchBar({ enabled, placeholder, modules }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const matches: MatchedLink[] = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return modules.flatMap((m) =>
      m.links
        .filter((link) => link.label.toLowerCase().includes(q))
        .map((link) => ({ ...link, moduleTitle: m.title }))
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
      window.location.href = matches[selectedIndex].url;
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
                >
                  <span className="search-dropdown-label">{link.label}</span>
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
