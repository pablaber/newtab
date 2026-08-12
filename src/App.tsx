import { useState, useEffect, useMemo } from 'react';
import { useConfig } from './hooks/useConfig.ts';
import type { BackgroundConfig } from './types/config.ts';
import { BackgroundLayer } from './components/BackgroundLayer.tsx';
import { SyncConflictModal } from './components/SyncConflictModal.tsx';
import { HomeScreen } from './screens/HomeScreen/index.ts';
import { ConfigEditor, type ConfigEditorTab } from './screens/ConfigEditorScreen/index.ts';
import { resolveForeground, foregroundCssVars } from './utils/foreground.ts';
import './App.css';

function App() {
  const {
    config,
    loading,
    error,
    setConfig,
    account,
    syncStatus,
    syncError,
    lastSyncedAt,
    initialSyncConflict,
    requestEmailCode,
    verifyEmailCode,
    signOut,
    retrySync,
    resolveInitialSync,
    setEditorOpen,
  } = useConfig();
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState<ConfigEditorTab>('general');
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

  useEffect(() => {
    setEditorOpen(showConfig);
  }, [setEditorOpen, showConfig]);

  const openSettings = (tab: ConfigEditorTab = 'general') => {
    setConfigTab(tab);
    setShowConfig(true);
  };

  const closeSettings = () => {
    setShowConfig(false);
    setPreviewBackground(null);
  };

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
          key={account.status === 'signed-in'
            ? `${account.userId}:${lastSyncedAt ?? 'pending'}`
            : account.status}
          config={config}
          onSave={setConfig}
          onClose={closeSettings}
          onPreview={(bg) => setPreviewBackground(bg ?? null)}
          initialTab={configTab}
          accountControls={account.status === 'disabled' ? undefined : {
            account,
            syncStatus,
            syncError,
            lastSyncedAt,
            onRequestEmailCode: requestEmailCode,
            onVerifyEmailCode: verifyEmailCode,
            onSignOut: signOut,
            onRetrySync: retrySync,
          }}
        />
        {initialSyncConflict && (
          <SyncConflictModal
            conflict={initialSyncConflict}
            onResolve={(choice) => void resolveInitialSync(choice)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <BackgroundLayer background={config.background} />
      <HomeScreen
        config={config}
        onSaveConfig={setConfig}
        onOpenSettings={() => openSettings('general')}
        account={account}
        syncStatus={syncStatus}
        onOpenAccount={account.status === 'disabled' ? undefined : () => openSettings('account')}
        onSignOut={account.status === 'signed-in' ? signOut : undefined}
      />
      {initialSyncConflict && (
        <SyncConflictModal
          conflict={initialSyncConflict}
          onResolve={(choice) => void resolveInitialSync(choice)}
        />
      )}
    </>
  );
}

export default App;
