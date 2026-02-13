import { useState } from 'react';
import type { AppConfig, ModuleConfig } from '../../../types/config.ts';

const MAX_SECTION_NAME = 50;
const MAX_LINK_LABEL = 80;

function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface LinksTabProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

export function LinksTab({ config, onSave, onClose }: LinksTabProps) {
  const [modules, setModules] = useState<ModuleConfig[]>(
    () => config.modules.map((m) => ({ ...m, links: m.links.map((l) => ({ ...l })) })),
  );
  const [submitted, setSubmitted] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- Section handlers ---

  const addSection = () => {
    setModules([{ type: 'links', title: '', links: [] }, ...modules]);
  };

  const removeSection = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const renameSection = (index: number, title: string) => {
    if (title.length > MAX_SECTION_NAME) return;
    setModules(modules.map((m, i) => (i === index ? { ...m, title } : m)));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const next = [...modules];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setModules(next);
  };

  const moveSectionDown = (index: number) => {
    if (index >= modules.length - 1) return;
    const next = [...modules];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setModules(next);
  };

  const toggleSectionHidden = (index: number) => {
    setModules(modules.map((m, i) => (i === index ? { ...m, hidden: !m.hidden } : m)));
  };

  // --- Link handlers ---

  const addLink = (sectionIndex: number) => {
    setModules(modules.map((m, i) =>
      i === sectionIndex ? { ...m, links: [...m.links, { url: '', label: '' }] } : m,
    ));
  };

  const removeLink = (sectionIndex: number, linkIndex: number) => {
    setModules(modules.map((m, i) =>
      i === sectionIndex ? { ...m, links: m.links.filter((_, li) => li !== linkIndex) } : m,
    ));
  };

  const updateLink = (sectionIndex: number, linkIndex: number, field: 'url' | 'label', value: string) => {
    if (field === 'label' && value.length > MAX_LINK_LABEL) return;
    setModules(modules.map((m, si) =>
      si === sectionIndex
        ? { ...m, links: m.links.map((l, li) => (li === linkIndex ? { ...l, [field]: value } : l)) }
        : m,
    ));
  };

  const moveLinkUp = (sectionIndex: number, linkIndex: number) => {
    if (linkIndex === 0) return;
    setModules(modules.map((m, si) => {
      if (si !== sectionIndex) return m;
      const links = [...m.links];
      [links[linkIndex - 1], links[linkIndex]] = [links[linkIndex], links[linkIndex - 1]];
      return { ...m, links };
    }));
  };

  const moveLinkDown = (sectionIndex: number, linkIndex: number) => {
    setModules(modules.map((m, si) => {
      if (si !== sectionIndex) return m;
      if (linkIndex >= m.links.length - 1) return m;
      const links = [...m.links];
      [links[linkIndex], links[linkIndex + 1]] = [links[linkIndex + 1], links[linkIndex]];
      return { ...m, links };
    }));
  };

  const toggleLinkHidden = (sectionIndex: number, linkIndex: number) => {
    setModules(modules.map((m, si) =>
      si === sectionIndex
        ? { ...m, links: m.links.map((l, li) => (li === linkIndex ? { ...l, hidden: !l.hidden } : l)) }
        : m,
    ));
  };

  // --- Validation ---

  const getErrors = () => {
    const errors: { section?: number; link?: number; field: string; message: string }[] = [];

    modules.forEach((m, si) => {
      if (!m.title.trim()) {
        errors.push({ section: si, field: 'title', message: 'Section name is required' });
      }

      m.links.forEach((l, li) => {
        if (!l.label.trim()) {
          errors.push({ section: si, link: li, field: 'label', message: 'Label is required' });
        }
        if (!l.url.trim()) {
          errors.push({ section: si, link: li, field: 'url', message: 'URL is required' });
        }
      });
    });

    return errors;
  };

  const errors = getErrors();
  const hasErrors = errors.length > 0;

  const getFieldError = (section: number, field: string, link?: number) => {
    return errors.find(
      (e) => e.section === section && e.field === field && e.link === link,
    )?.message;
  };

  // --- Clear all ---

  const handleClearAll = () => {
    setModules([]);
    setShowClearConfirm(false);
  };

  // --- Save ---

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors) return;

    const cleaned: ModuleConfig[] = modules.map((m) => ({
      ...m,
      title: m.title.trim(),
      links: m.links.map((l) => ({
        ...l,
        label: l.label.trim(),
        url: ensureProtocol(l.url),
      })),
    }));

    onSave({ ...config, modules: cleaned });
    onClose();
  };

  const totalLinks = modules.reduce((sum, m) => sum + m.links.length, 0);

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="config-editor-btn-add" onClick={addSection}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Section
        </button>
        {modules.length > 0 && (
          <button
            className="config-editor-btn-clear-all"
            onClick={() => setShowClearConfirm(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear All Links
          </button>
        )}
        <button
          className="config-editor-btn-add config-editor-btn-save-top"
          onClick={handleSave}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save
        </button>
      </div>

      {modules.length === 0 && (
        <div className="config-editor-links-empty">
          No sections yet. Add one to get started.
        </div>
      )}

      {modules.map((mod, si) => (
        <div key={si} className="config-editor-link-section">
          <div className="config-editor-section-header">
            <input
              type="text"
              className="config-editor-input"
              value={mod.title}
              onChange={(e) => renameSection(si, e.target.value)}
              placeholder="Section name"
              maxLength={MAX_SECTION_NAME}
            />
            <label className="config-editor-checkbox" title={mod.hidden ? 'Hidden — click to show' : 'Visible — click to hide'}>
              <input
                type="checkbox"
                checked={mod.hidden ?? false}
                onChange={() => toggleSectionHidden(si)}
              />
              {mod.hidden ? (
                <svg className="config-editor-checkbox-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="config-editor-checkbox-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </label>
            <button
              className="config-editor-btn-icon"
              onClick={() => moveSectionUp(si)}
              disabled={si === 0}
              title="Move section up"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              className="config-editor-btn-icon"
              onClick={() => moveSectionDown(si)}
              disabled={si === modules.length - 1}
              title="Move section down"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button
              className="config-editor-btn-icon danger"
              onClick={() => removeSection(si)}
              title="Remove section"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {submitted && getFieldError(si, 'title') && (
            <div className="config-editor-field-error" style={{ marginTop: -8, marginBottom: 8 }}>
              {getFieldError(si, 'title')}
            </div>
          )}

          {mod.links.length > 0 && <div className="config-editor-section-divider" />}

          {mod.links.map((link, li) => (
            <div key={li} className="config-editor-link-row">
              <div className="config-editor-link-fields">
                <input
                  type="text"
                  className="config-editor-input"
                  value={link.label}
                  onChange={(e) => updateLink(si, li, 'label', e.target.value)}
                  placeholder="Label"
                  maxLength={MAX_LINK_LABEL}
                />
                {submitted && getFieldError(si, 'label', li) && (
                  <div className="config-editor-field-error">{getFieldError(si, 'label', li)}</div>
                )}
                <input
                  type="text"
                  className="config-editor-input"
                  value={link.url}
                  onChange={(e) => updateLink(si, li, 'url', e.target.value)}
                  placeholder="URL (e.g. example.com)"
                />
                {submitted && getFieldError(si, 'url', li) && (
                  <div className="config-editor-field-error">{getFieldError(si, 'url', li)}</div>
                )}
              </div>
              <div className="config-editor-link-actions">
                <label className="config-editor-checkbox" title={mod.hidden ? 'Section is hidden' : (link.hidden ? 'Hidden — click to show' : 'Visible — click to hide')}>
                  <input
                    type="checkbox"
                    checked={mod.hidden ? true : (link.hidden ?? false)}
                    onChange={() => toggleLinkHidden(si, li)}
                    disabled={mod.hidden ?? false}
                  />
                  {(mod.hidden || link.hidden) ? (
                    <svg className="config-editor-checkbox-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="config-editor-checkbox-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </label>
                <button
                  className="config-editor-btn-icon"
                  onClick={() => moveLinkUp(si, li)}
                  disabled={li === 0}
                  title="Move link up"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  className="config-editor-btn-icon"
                  onClick={() => moveLinkDown(si, li)}
                  disabled={li === mod.links.length - 1}
                  title="Move link down"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button
                  className="config-editor-btn-icon danger"
                  onClick={() => removeLink(si, li)}
                  title="Remove link"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <button className="config-editor-btn-add" onClick={() => addLink(si)} style={{ marginTop: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Link
          </button>
        </div>
      ))}

      <div className="config-editor-actions">
        <button
          className="config-editor-btn config-editor-btn-save"
          onClick={handleSave}
        >
          Save
        </button>
        <button className="config-editor-btn config-editor-btn-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>

      {showClearConfirm && (
        <div className="config-editor-modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="config-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="config-editor-modal-header">
              <h2 className="config-editor-modal-title">Clear All Links</h2>
              <button className="config-editor-back" onClick={() => setShowClearConfirm(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="config-editor-clear-all-body">
              <p className="config-editor-clear-all-warning">
                This will remove all {modules.length} {modules.length === 1 ? 'section' : 'sections'} and {totalLinks} {totalLinks === 1 ? 'link' : 'links'}. This action cannot be undone.
              </p>
              <div className="config-editor-clear-all-actions">
                <button
                  className="config-editor-btn config-editor-btn-remove"
                  onClick={handleClearAll}
                >
                  Remove
                </button>
                <button
                  className="config-editor-btn config-editor-btn-cancel"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
