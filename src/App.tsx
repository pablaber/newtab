import { useState, useEffect, useMemo } from 'react';
import { useConfig } from './hooks/useConfig.ts';
import type { BackgroundConfig } from './types/config.ts';
import { BackgroundLayer } from './components/BackgroundLayer.tsx';
import { HomeScreen } from './screens/HomeScreen/index.ts';
import { ConfigEditor } from './screens/ConfigEditorScreen/index.ts';
import './App.css';

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isLightBackground(bg: BackgroundConfig | undefined): boolean {
  const color = bg?.color ?? '#1a1a2e';
  if (bg?.gradient?.enabled && bg.gradient.color2) {
    const avg = (hexLuminance(color) + hexLuminance(bg.gradient.color2)) / 2;
    return avg > 0.179;
  }
  return hexLuminance(color) > 0.179;
}

function App() {
  const { config, loading, error, setConfig } = useConfig();
  const [showConfig, setShowConfig] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<BackgroundConfig | null>(null);

  const effectiveBackground: BackgroundConfig | undefined =
    (showConfig && previewBackground) ? previewBackground : config?.background;

  const light = useMemo(() => isLightBackground(effectiveBackground), [effectiveBackground]);

  useEffect(() => {
    const fg = light ? '0, 0, 0' : '255, 255, 255';
    const dropdownBg = light ? '240, 240, 240' : '30, 30, 30';
    document.documentElement.style.setProperty('--fg', fg);
    document.documentElement.style.setProperty('--dropdown-bg', dropdownBg);
  }, [light]);

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
      <HomeScreen config={config} onOpenSettings={() => setShowConfig(true)} />
    </>
  );
}

export default App;
