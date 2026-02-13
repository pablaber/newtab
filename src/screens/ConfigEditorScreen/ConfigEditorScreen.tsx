import { useState } from 'react';
import type { AppConfig, BackgroundConfig } from '../../types/config.ts';
import { GeneralTab } from './components/GeneralTab.tsx';
import { LinksTab } from './components/LinksTab.tsx';

const STORAGE_KEY = 'newtab-config';

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

function validateConfig(value: unknown): value is AppConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.version !== 'number') return false;
  if (!Array.isArray(obj.modules)) return false;
  for (const mod of obj.modules) {
    if (typeof mod !== 'object' || mod === null) return false;
    const m = mod as Record<string, unknown>;
    if (m.type !== 'links') return false;
    if (typeof m.title !== 'string') return false;
    if (!Array.isArray(m.links)) return false;
    for (const link of m.links) {
      if (typeof link !== 'object' || link === null) return false;
      const l = link as Record<string, unknown>;
      if (typeof l.url !== 'string' || typeof l.label !== 'string') return false;
    }
  }
  return true;
}

type ImportExportPanel = 'none' | 'export' | 'import';
type Tab = 'general' | 'links';

interface ConfigEditorProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onPreview: (background: BackgroundConfig | undefined) => void;
}

export function ConfigEditor({ config, onSave, onClose, onPreview }: ConfigEditorProps) {
  const [tab, setTab] = useState<Tab>('general');
  const [activePanel, setActivePanel] = useState<ImportExportPanel>('none');
  const [exportString, setExportString] = useState('');
  const [copied, setCopied] = useState(false);
  const [importString, setImportString] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const handleExport = () => {
    if (activePanel === 'export') {
      setActivePanel('none');
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setExportString(toBase64(raw));
    }
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
    setImportSuccess(false);
    setActivePanel('import');
  };

  const handleImportApply = () => {
    setImportError('');
    setImportSuccess(false);

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

    if (!validateConfig(parsed)) {
      setImportError('JSON does not match the expected config format.');
      return;
    }

    onSave(parsed);

    const bg = parsed.background;
    onPreview(bg ? {
      imageUrl: bg.imageUrl,
      opacity: bg.opacity ?? 0.5,
      color: bg.color ?? '#000000',
      gradient: bg.gradient,
    } : undefined);

    setImportSuccess(true);
  };

  const closePanel = () => {
    setActivePanel('none');
    setImportString('');
    setImportError('');
    setImportSuccess(false);
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
      </div>

      {tab === 'general' && (
        <GeneralTab
          config={config}
          onSave={onSave}
          onClose={onClose}
          onPreview={onPreview}
        />
      )}

      {tab === 'links' && (
        <LinksTab config={config} onSave={onSave} onClose={onClose} />
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
                  onChange={(e) => { setImportString(e.target.value); setImportError(''); setImportSuccess(false); }}
                  rows={5}
                  placeholder="Paste exported base64 string here..."
                />
                {importError && (
                  <div className="config-editor-ie-error">{importError}</div>
                )}
                {importSuccess && (
                  <div className="config-editor-ie-success">Config applied successfully.</div>
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
