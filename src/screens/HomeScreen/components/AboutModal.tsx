interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="about-modal-overlay" onClick={onClose}>
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-modal-header">
          <h2 className="about-modal-title">About</h2>
          <button className="config-editor-back" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="about-modal-text">
          A clean, customizable new tab page designed to keep your favorite links
          organized and just a click away. Configure your sections, add your most-used
          links, and make every new tab work for you.
        </p>
        <button className="about-modal-back-btn" onClick={onClose}>Back</button>
      </div>
    </div>
  );
}
