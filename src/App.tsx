import { useState, useCallback } from 'react';
import { useConfig } from './hooks/useConfig.ts';
import { BackgroundLayer } from './components/BackgroundLayer.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { ModuleGrid } from './components/ModuleGrid.tsx';
import './App.css';

function App() {
  const { config, loading, error } = useConfig();
  const [navigating, setNavigating] = useState<{ url: string; label: string } | null>(null);

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

  return (
    <>
      <BackgroundLayer background={config.background} />
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
