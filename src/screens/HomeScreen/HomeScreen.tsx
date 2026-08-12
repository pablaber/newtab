import { useState, useCallback, useMemo } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { AppConfig } from '../../types/config.ts';
import type { AccountState, SyncStatus } from '../../hooks/useConfig.ts';
import { isHosted } from '../../env.ts';
import { SearchBar } from './components/SearchBar.tsx';
import { ModuleGrid } from './components/ModuleGrid.tsx';
import { AboutModal } from './components/AboutModal.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';

interface HomeScreenProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
  onOpenSettings: () => void;
  account?: AccountState;
  syncStatus?: SyncStatus;
  onOpenAccount?: () => void;
}

export function HomeScreen({
  config,
  onSaveConfig,
  onOpenSettings,
  account,
  syncStatus = 'local',
  onOpenAccount,
}: HomeScreenProps) {
  const [navigating, setNavigating] = useState<{ url: string; label: string } | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const openCommands = useCallback(() => {
    setShowAbout(false);
    setShowCommands(true);
  }, []);

  useHotkey('Mod+P', openCommands, { preventDefault: true });

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
      <div className="top-right-buttons">
        {account && account.status !== 'disabled' && onOpenAccount && (
          <button
            className={`config-button account-button account-button-${syncStatus}`}
            tabIndex={-1}
            onClick={onOpenAccount}
            aria-label={account.status === 'signed-out'
              ? 'Sign in to sync'
              : syncStatus === 'error'
                ? 'Account – sync needs attention'
                : `Account – ${syncStatus}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {syncStatus === 'error' && <span className="account-button-indicator" />}
          </button>
        )}
        <button className="config-button" tabIndex={-1} onClick={() => setShowAbout(true)} aria-label="About">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
        <button className="config-button" tabIndex={-1} onClick={onOpenSettings} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
      <div className="content">
        <SearchBar
          enabled={config.search?.enabled ?? false}
          hotkeyEnabled={!showCommands && !showAbout}
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
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showCommands && (
        <CommandPalette
          config={config}
          onSave={onSaveConfig}
          onClose={() => setShowCommands(false)}
          onOpenSettings={onOpenSettings}
          onOpenAbout={() => setShowAbout(true)}
        />
      )}
    </>
  );
}
