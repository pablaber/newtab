import { useState, useEffect, useMemo } from 'react';
import { useConfig } from './hooks/useConfig.ts';
import type { BackgroundConfig } from './types/config.ts';
import { BackgroundLayer } from './components/BackgroundLayer.tsx';
import { HomeScreen } from './screens/HomeScreen/index.ts';
import { ConfigEditor } from './screens/ConfigEditorScreen/index.ts';
import { resolveForeground, foregroundCssVars } from './utils/foreground.ts';
import './App.css';

function App() {
  const { config, loading, error, setConfig } = useConfig();
  const [showConfig, setShowConfig] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<BackgroundConfig | null>(null);

  const effectiveBackground: BackgroundConfig | undefined =
    (showConfig && previewBackground) ? previewBackground : config?.background;

  const foreground = useMemo(
    () => resolveForeground(effectiveBackground),
    [effectiveBackground],
  );

  useEffect(() => {
    const { fg, dropdownBg } = foregroundCssVars(foreground);
    document.documentElement.style.setProperty('--fg', fg);
    document.documentElement.style.setProperty('--dropdown-bg', dropdownBg);
  }, [foreground]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error || !config) {
    return <div className="error">Failed to load configuration: {error}</div>;
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
      <HomeScreen
        config={config}
        onSaveConfig={setConfig}
        onOpenSettings={() => setShowConfig(true)}
      />
    </>
  );
}

export default App;
