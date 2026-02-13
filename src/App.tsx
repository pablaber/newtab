import { useState, useCallback, useEffect, useMemo } from 'react';
import { useConfig } from './hooks/useConfig.ts';
import type { BackgroundConfig } from './types/config.ts';
import { BackgroundLayer } from './components/BackgroundLayer.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { ModuleGrid } from './components/ModuleGrid.tsx';
import { ConfigEditor } from './components/ConfigEditor.tsx';
import './App.css';

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.179;
}

function App() {
  const { config, loading, error, setConfig } = useConfig();
  const [navigating, setNavigating] = useState<{ url: string; label: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<BackgroundConfig | null>(null);

  const effectiveColor =
    (showConfig ? previewBackground?.color : undefined)
    ?? config?.background?.color
    ?? '#1a1a2e';

  const light = useMemo(() => isLightColor(effectiveColor), [effectiveColor]);

  useEffect(() => {
    const fg = light ? '0, 0, 0' : '255, 255, 255';
    const dropdownBg = light ? '240, 240, 240' : '30, 30, 30';
    document.documentElement.style.setProperty('--fg', fg);
    document.documentElement.style.setProperty('--dropdown-bg', dropdownBg);
  }, [light]);

  const handleNavigate = useCallback((url: string, label: string) => {
    setNavigating({ url, label });
    window.location.href = url;
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error || !config) {
    return <div className="error">Failed to load configuration: {error}</div>;
  }

  if (navigating) {
    let favicon = '';
    try {
      const domain = new URL(navigating.url).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { /* ignore */ }

    return (
      <>
        <BackgroundLayer background={config.background} />
        <div className="navigating">
          {favicon && (
            <img className="navigating-favicon" src={favicon} alt="" width={24} height={24} />
          )}
          <span className="navigating-text">Navigating to {navigating.label}</span>
          <div className="navigating-spinner" />
        </div>
      </>
    );
  }

  if (showConfig) {
    return (
      <>
        <BackgroundLayer background={previewBackground ?? config.background} />
        <ConfigEditor
          config={config}
          onSave={setConfig}
          onClose={() => { setShowConfig(false); setPreviewBackground(null); }}
          onPreview={(bg) => setPreviewBackground(bg ?? null)}
        />
      </>
    );
  }

  return (
    <>
      <BackgroundLayer background={config.background} />
      <button className="config-button" tabIndex={-1} onClick={() => setShowConfig(true)} aria-label="Settings">
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
        <ModuleGrid modules={config.modules} onNavigate={handleNavigate} />
      </div>
    </>
  );
}

export default App;
