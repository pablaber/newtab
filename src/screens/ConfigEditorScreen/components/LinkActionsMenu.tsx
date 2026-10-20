import { useEffect, useId, useRef, useState } from 'react';

interface LinkActionsMenuProps {
  canMove: boolean;
  onMoveToSection: () => void;
}

export function LinkActionsMenu({ canMove, onMoveToSection }: LinkActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="config-editor-menu-anchor" ref={containerRef}>
      <button
        type="button"
        className="config-editor-btn-icon"
        onClick={() => setOpen((current) => !current)}
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div id={menuId} className="config-editor-menu" role="menu">
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            className="config-editor-menu-item"
            disabled={!canMove}
            title={canMove ? undefined : 'Add another section first'}
            onClick={() => {
              setOpen(false);
              onMoveToSection();
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <path d="M21 3l-7 7" />
              <path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
            </svg>
            Move to section…
          </button>
        </div>
      )}
    </div>
  );
}
