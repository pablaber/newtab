import { useState, useCallback, useMemo } from 'react';
import type { AppConfig } from '../../types/config.ts';
import { isHosted } from '../../env.ts';
import { SearchBar } from './components/SearchBar.tsx';
import { ModuleGrid } from './components/ModuleGrid.tsx';

interface HomeScreenProps {
  config: AppConfig;
  onOpenSettings: () => void;
}

export function HomeScreen({ config, onOpenSettings }: HomeScreenProps) {
  const [navigating, setNavigating] = useState<{ url: string; label: string } | null>(null);

  const handleNavigate = useCallback((url: string, label: string) => {
    setNavigating({ url, label });
    window.location.href = url;
  }, []);

  const hasVisibleModules = useMemo(
    () => config.modules.some((m) => !m.hidden),
    [config.modules],
  );

  if (navigating) {
    let favicon = '';
    try {
      const domain = new URL(navigating.url).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { /* ignore */ }

    return (
      <div className="navigating">
        {favicon && (
          <img className="navigating-favicon" src={favicon} alt="" width={24} height={24} />
        )}
        <span className="navigating-text">Navigating to {navigating.label}</span>
        <div className="navigating-spinner" />
      </div>
    );
  }

  return (
    <>
      <button className="config-button" tabIndex={-1} onClick={onOpenSettings} aria-label="Settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <div className="content">
        <SearchBar
          enabled={config.search?.enabled ?? false}
          placeholder={config.search?.placeholder ?? 'Filter links...'}
          modules={config.modules}
          onNavigate={handleNavigate}
        />
        {hasVisibleModules ? (
          <ModuleGrid modules={config.modules} onNavigate={handleNavigate} />
        ) : (
          <div className="home-empty">
            <p className="home-empty-text">No links to show yet.</p>
            <p className="home-empty-hint">Add sections and links in settings to get started.</p>
            <button className="home-empty-btn" onClick={onOpenSettings}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Open Settings
            </button>
          </div>
        )}
      </div>
      {isHosted && (
        <footer className="hosted-footer">
          <span>A website by Patrick Bacon-Blaber</span>
          <a href="https://buymeacoffee.com/pablaber" target="_blank" rel="noopener noreferrer">
            ☕ Buy Me A Coffee
          </a>
        </footer>
      )}
    </>
  );
}
