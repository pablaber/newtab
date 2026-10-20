import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MAX_SECTION_NAME } from '../../../utils/linkConfig.ts';

export interface MoveTargetSection {
  index: number;
  title: string;
  linkCount: number;
  hidden?: boolean;
}

interface MoveLinkModalProps {
  linkLabel: string;
  sections: MoveTargetSection[];
  onMove: (sectionIndex: number) => void;
  onClose: () => void;
}

export function MoveLinkModal({ linkLabel, sections, onMove, onClose }: MoveLinkModalProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Rank exact matches first, then prefix matches, then substring matches
  const options = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return sections;
    return sections
      .map((section) => {
        const title = section.title.trim().toLocaleLowerCase();
        const score = title === normalized ? 3 : title.startsWith(normalized) ? 2 : title.includes(normalized) ? 1 : -1;
        return { section, score };
      })
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score || a.section.index - b.section.index)
      .map(({ section }) => section);
  }, [query, sections]);

  const target = options[activeIndex];
  const optionId = (section: MoveTargetSection) => `${listId}-${section.index}`;
  const activeOptionId = target ? optionId(target) : undefined;

  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeOptionId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && target) {
      event.preventDefault();
      onMove(target.index);
    }
  };

  return (
    <div
      className="config-editor-modal-overlay"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        className="config-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${listId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="config-editor-modal-header">
          <h2 id={`${listId}-title`} className="config-editor-modal-title">
            Move &ldquo;{linkLabel.trim() || 'Untitled link'}&rdquo;
          </h2>
          <button className="config-editor-back" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <label className="config-editor-label config-editor-move-label" htmlFor={`${listId}-input`}>
          Section
        </label>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          className="config-editor-input"
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Start typing a section name"
          maxLength={MAX_SECTION_NAME}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded="true"
          aria-activedescendant={activeOptionId}
        />
        <div id={listId} className="config-editor-move-list" role="listbox">
          {options.length === 0 && (
            <div className="config-editor-move-empty">No matching sections</div>
          )}
          {options.map((section, optionIndex) => (
            <button
              key={section.index}
              id={optionId(section)}
              type="button"
              role="option"
              aria-selected={optionIndex === activeIndex}
              className={`config-editor-move-option${optionIndex === activeIndex ? ' selected' : ''}`}
              onClick={() => setActiveIndex(optionIndex)}
              onDoubleClick={() => onMove(section.index)}
            >
              <span className="config-editor-move-option-title">{section.title.trim() || 'Untitled section'}</span>
              {section.hidden && <span className="command-hidden-badge">Hidden</span>}
              <span className="config-editor-move-option-meta">
                {section.linkCount} {section.linkCount === 1 ? 'link' : 'links'}
              </span>
            </button>
          ))}
        </div>

        <div className="config-editor-move-actions">
          <button
            className="config-editor-btn config-editor-btn-save"
            onClick={() => target && onMove(target.index)}
            disabled={!target}
          >
            Move
          </button>
          <button className="config-editor-btn config-editor-btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
