import { useState, useEffect, useId } from 'react';
import type { AppConfig, ModuleConfig } from '../../../types/config.ts';
import { ensureProtocol, MAX_LINK_LABEL, MAX_SECTION_NAME } from '../../../utils/linkConfig.ts';
import { LinkActionsMenu } from './LinkActionsMenu.tsx';
import { MoveLinkModal } from './MoveLinkModal.tsx';
import { DragHandle } from './DragHandle.tsx';
import { moveItem, movedIndex, useDragReorder } from '../../../hooks/useDragReorder.ts';

function TrashIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

const SECTIONS_LIST = 'sections';
const linksList = (sectionIndex: number) => `links-${sectionIndex}`;

interface LinksTabProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onConfigChange: (config: AppConfig) => void;
}

export function LinksTab({ config, onSave, onClose, onConfigChange }: LinksTabProps) {
  const [modules, setModules] = useState<ModuleConfig[]>(
    () => config.modules.map((m) => ({ ...m, links: m.links.map((l) => ({ ...l })) })),
  );
  const [submitted, setSubmitted] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Sections start collapsed; tracks expanded section indices
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [moving, setMoving] = useState<{ section: number; link: number } | null>(null);
  const idPrefix = useId();

  // Push link changes to the shared draft so they persist across tab switches
  useEffect(() => {
    onConfigChange({ ...config, modules });
  }, [modules]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Section handlers ---

  const addSection = () => {
    setModules([{ type: 'links', title: '', links: [] }, ...modules]);
    setExpanded((current) => new Set([0, ...[...current].map((i) => i + 1)]));
  };

  const removeSection = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
    setExpanded((current) => new Set(
      [...current].filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    ));
  };

  const toggleSectionExpanded = (index: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const allExpanded = modules.length > 0 && modules.every((_, i) => expanded.has(i));

  const toggleAllExpanded = () => {
    setExpanded(allExpanded ? new Set() : new Set(modules.map((_, i) => i)));
  };

  const renameSection = (index: number, title: string) => {
    if (title.length > MAX_SECTION_NAME) return;
    setModules(modules.map((m, i) => (i === index ? { ...m, title } : m)));
  };

  const moveSection = (from: number, to: number) => {
    setModules(moveItem(modules, from, to));
    setExpanded((current) => new Set([...current].map((i) => movedIndex(i, from, to))));
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

  const moveLink = (sectionIndex: number, from: number, to: number) => {
    setModules(modules.map((m, si) => (si === sectionIndex ? { ...m, links: moveItem(m.links, from, to) } : m)));
  };

  const moveLinkToSection = (fromSection: number, linkIndex: number, toSection: number) => {
    const link = modules[fromSection].links[linkIndex];
    setModules(modules.map((m, si) => {
      if (si === fromSection) return { ...m, links: m.links.filter((_, li) => li !== linkIndex) };
      if (si === toSection) return { ...m, links: [...m.links, link] };
      return m;
    }));
    setMoving(null);
  };

  const reorder = useDragReorder((list, from, to) => {
    if (list === SECTIONS_LIST) moveSection(from, to);
    else moveLink(Number(list.slice('links-'.length)), from, to);
  });

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
    setExpanded(new Set());
    setShowClearConfirm(false);
  };

  // --- Save ---

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors) {
      // Expand any section with an error so the message is visible
      setExpanded((current) => new Set([
        ...current,
        ...errors.flatMap((e) => (e.section === undefined ? [] : [e.section])),
      ]));
      return;
    }

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
        {modules.length > 0 && (
          <button className="config-editor-btn-add" onClick={toggleAllExpanded}>
            {allExpanded ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 20 12 15 17 20" />
                <polyline points="7 4 12 9 17 4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="7 15 12 20 17 15" />
                <polyline points="7 9 12 4 17 9" />
              </svg>
            )}
            {allExpanded ? 'Collapse All' : 'Expand All'}
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

      {modules.map((mod, si) => {
        const isExpanded = expanded.has(si);
        const bodyId = `${idPrefix}-section-${si}`;
        const linkCount = mod.links.length;

        return (
          <div
            key={si}
            className={`config-editor-link-section${isExpanded ? '' : ' collapsed'}${reorder.isDragging(SECTIONS_LIST, si) ? ' dragging' : ''}`}
            {...reorder.itemProps(SECTIONS_LIST, si)}
          >
            <div className="config-editor-section-header">
              <DragHandle
                size={14}
                title="Drag to reorder section"
                aria-label="Reorder section"
                {...reorder.handleProps(SECTIONS_LIST, si)}
              />
              <button
                className="config-editor-btn-icon"
                onClick={() => toggleSectionExpanded(si)}
                title={isExpanded ? 'Collapse section' : 'Expand section'}
                aria-expanded={isExpanded}
                aria-controls={bodyId}
              >
                <svg className={`config-editor-chevron${isExpanded ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {isExpanded ? (
                <input
                  type="text"
                  className="config-editor-input"
                  value={mod.title}
                  onChange={(e) => renameSection(si, e.target.value)}
                  placeholder="Section name"
                  maxLength={MAX_SECTION_NAME}
                />
              ) : (
                <button
                  className={`config-editor-section-title-text${mod.title.trim() ? '' : ' untitled'}`}
                  onClick={() => toggleSectionExpanded(si)}
                  aria-expanded={false}
                  aria-controls={bodyId}
                >
                  {mod.title.trim() || 'Untitled section'}
                </button>
              )}
              <span className="config-editor-link-count">
                {linkCount} {linkCount === 1 ? 'link' : 'links'}
              </span>
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
                className="config-editor-btn-icon trash"
                onClick={() => removeSection(si)}
                title="Remove section"
              >
                <TrashIcon size={14} />
              </button>
            </div>

            {submitted && getFieldError(si, 'title') && (
              <div className="config-editor-field-error" style={{ marginTop: -8, marginBottom: 8 }}>
                {getFieldError(si, 'title')}
              </div>
            )}

            {isExpanded && (
              <div id={bodyId}>
                {linkCount > 0 && <div className="config-editor-section-divider" />}

                {mod.links.map((link, li) => (
                  <div
                    key={li}
                    className={`config-editor-link-row${reorder.isDragging(linksList(si), li) ? ' dragging' : ''}`}
                    {...reorder.itemProps(linksList(si), li)}
                  >
                    <DragHandle
                      title="Drag to reorder link"
                      aria-label="Reorder link"
                      {...reorder.handleProps(linksList(si), li)}
                    />
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
                        className="config-editor-btn-icon trash"
                        onClick={() => removeLink(si, li)}
                        title="Remove link"
                      >
                        <TrashIcon size={12} />
                      </button>
                      <LinkActionsMenu
                        canMove={modules.length > 1}
                        onMoveToSection={() => setMoving({ section: si, link: li })}
                      />
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
            )}
          </div>
        );
      })}

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

      {moving && (
        <MoveLinkModal
          linkLabel={modules[moving.section].links[moving.link].label}
          sections={modules
            .map((m, index) => ({ index, title: m.title, linkCount: m.links.length, hidden: m.hidden }))
            .filter(({ index }) => index !== moving.section)}
          onMove={(toSection) => moveLinkToSection(moving.section, moving.link, toSection)}
          onClose={() => setMoving(null)}
        />
      )}

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
