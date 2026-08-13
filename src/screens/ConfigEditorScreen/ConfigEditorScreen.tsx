import { useState, useCallback } from 'react';
import type { AppConfig, BackgroundConfig } from '../../types/config.ts';
import { parseConfig } from '../../utils/configValidation.ts';
import { GeneralTab } from './components/GeneralTab.tsx';
import { LinksTab } from './components/LinksTab.tsx';
import { SubcommandsTab } from './components/SubcommandsTab.tsx';
import { AccountTab, type AccountTabProps } from './components/AccountTab.tsx';

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

function fromBase64(b64: string): string {
  const binString = atob(b64);
  const bytes = Uint8Array.from(binString, (c) => c.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}

type ImportExportPanel = 'none' | 'export' | 'import';
export type ConfigEditorTab = 'general' | 'links' | 'subcommands' | 'account';

interface ConfigEditorProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onPreview: (background: BackgroundConfig | undefined) => void;
  initialTab?: ConfigEditorTab;
  accountControls?: AccountTabProps;
  stageNewSubcommand?: boolean;
}

export function ConfigEditor({
  config,
  onSave,
  onClose,
  onPreview,
  initialTab = 'general',
  accountControls,
  stageNewSubcommand = false,
}: ConfigEditorProps) {
  const [tab, setTab] = useState<ConfigEditorTab>(
    initialTab === 'account' && !accountControls ? 'general' : initialTab,
  );
  const [draftConfig, setDraftConfig] = useState<AppConfig>(() => {
    const subcommands = config.subcommands?.map((subcommand) => ({
      ...subcommand,
      items: subcommand.items.map((item) => ({ ...item })),
      freeform: subcommand.freeform && {
        ...subcommand.freeform,
        fields: subcommand.freeform.fields.map((field) => ({ ...field })),
      },
    }));
    return {
      ...config,
      modules: config.modules.map((m) => ({ ...m, links: m.links.map((l) => ({ ...l })) })),
      subcommands: stageNewSubcommand
        ? [{ name: '', trigger: '', items: [] }, ...(subcommands ?? [])]
        : subcommands,
    };
  });
  const [activePanel, setActivePanel] = useState<ImportExportPanel>('none');
  const [exportString, setExportString] = useState('');
  const [copied, setCopied] = useState(false);
  const [importString, setImportString] = useState('');
  const [importError, setImportError] = useState('');

  const handleConfigChange = useCallback((updatedConfig: AppConfig) => {
    setDraftConfig(updatedConfig);
  }, []);

  const handleSave = useCallback((configToSave: AppConfig) => {
    onSave(configToSave);
    onClose();
  }, [onSave, onClose]);

  const handleExport = () => {
    if (activePanel === 'export') {
      setActivePanel('none');
      return;
    }
    setExportString(toBase64(JSON.stringify(config)));
    setCopied(false);
    setActivePanel('export');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  };

  const handleImportToggle = () => {
    if (activePanel === 'import') {
      setActivePanel('none');
      return;
    }
    setImportString('');
    setImportError('');
    setActivePanel('import');
  };

  const handleImportApply = () => {
    setImportError('');

    const trimmed = importString.trim();
    if (!trimmed) {
      setImportError('Paste a base64 config string first.');
      return;
    }

    let decoded: string;
    try {
      decoded = fromBase64(trimmed);
    } catch {
      setImportError('Invalid base64 string.');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      setImportError('Decoded string is not valid JSON.');
      return;
    }

    const imported = parseConfig(parsed);
    if (!imported) {
      setImportError('JSON does not match the expected config format.');
      return;
    }

    onSave(imported);
    onClose();
  };

  const closePanel = () => {
    setActivePanel('none');
    setImportString('');
    setImportError('');
    setCopied(false);
  };

  return (
    <div className="config-editor">
      <div className="config-editor-header">
        <h1 className="config-editor-title">Settings</h1>
        <div className="config-editor-header-actions">
          <button className="config-editor-btn config-editor-btn-ie" onClick={handleImportToggle}>
            Import
          </button>
          <button className="config-editor-btn config-editor-btn-ie" onClick={handleExport}>
            Export
          </button>
          <button className="config-editor-back" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="config-editor-tabs">
        <button
          className={`config-editor-tab${tab === 'general' ? ' active' : ''}`}
          onClick={() => setTab('general')}
        >
          General
        </button>
        <button
          className={`config-editor-tab${tab === 'links' ? ' active' : ''}`}
          onClick={() => setTab('links')}
        >
          Links
        </button>
        <button
          className={`config-editor-tab${tab === 'subcommands' ? ' active' : ''}`}
          onClick={() => setTab('subcommands')}
        >
          Subcommands
        </button>
        {accountControls && (
          <button
            className={`config-editor-tab${tab === 'account' ? ' active' : ''}`}
            onClick={() => setTab('account')}
          >
            Account
          </button>
        )}
      </div>

      {tab === 'general' && (
        <GeneralTab
          config={draftConfig}
          onSave={handleSave}
          onClose={onClose}
          onPreview={onPreview}
          onConfigChange={handleConfigChange}
        />
      )}

      {tab === 'links' && (
        <LinksTab
          config={draftConfig}
          onSave={handleSave}
          onClose={onClose}
          onConfigChange={handleConfigChange}
        />
      )}

      {tab === 'subcommands' && (
        <SubcommandsTab
          config={draftConfig}
          onSave={handleSave}
          onClose={onClose}
          onConfigChange={handleConfigChange}
          stageNew={false}
        />
      )}

      {tab === 'account' && accountControls && (
        <AccountTab {...accountControls} />
      )}

      {activePanel !== 'none' && (
        <div className="config-editor-modal-overlay" onClick={closePanel}>
          <div className="config-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="config-editor-modal-header">
              <h2 className="config-editor-modal-title">
                {activePanel === 'export' ? 'Export Config' : 'Import Config'}
              </h2>
              <button className="config-editor-back" onClick={closePanel}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {activePanel === 'export' && (
              <div className="config-editor-ie-panel">
                <span className="config-editor-label">Base64 Config</span>
                <textarea
                  className="config-editor-textarea"
                  value={exportString}
                  readOnly
                  rows={5}
                />
                <button
                  className="config-editor-btn config-editor-btn-copy"
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            {activePanel === 'import' && (
              <div className="config-editor-ie-panel">
                <span className="config-editor-label">Paste Base64 Config</span>
                <textarea
                  className="config-editor-textarea"
                  value={importString}
                  onChange={(e) => { setImportString(e.target.value); setImportError(''); }}
                  rows={5}
                  placeholder="Paste exported base64 string here..."
                />
                {importError && (
                  <div className="config-editor-ie-error">{importError}</div>
                )}
                <button
                  className="config-editor-btn config-editor-btn-apply"
                  onClick={handleImportApply}
                  disabled={importString.trim() === ''}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
