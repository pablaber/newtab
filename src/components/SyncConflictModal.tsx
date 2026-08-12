import type { AppConfig } from '../types/config.ts';
import type { InitialSyncChoice, InitialSyncConflict } from '../hooks/useConfig.ts';

function configSummary(config: AppConfig): string {
  const sectionCount = config.modules.length;
  const linkCount = config.modules.reduce((total, module) => total + module.links.length, 0);
  return `${sectionCount} ${sectionCount === 1 ? 'section' : 'sections'} · ${linkCount} ${linkCount === 1 ? 'link' : 'links'}`;
}

interface SyncConflictModalProps {
  conflict: InitialSyncConflict;
  onResolve: (choice: InitialSyncChoice) => void;
}

export function SyncConflictModal({ conflict, onResolve }: SyncConflictModalProps) {
  return (
    <div className="config-editor-modal-overlay sync-conflict-overlay">
      <div
        className="config-editor-modal sync-conflict-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-conflict-title"
      >
        <h2 id="sync-conflict-title" className="config-editor-modal-title">Choose your starting config</h2>
        <p className="sync-conflict-intro">
          This browser and your account both have customized configs. Choose which one should become
          the synced copy. Your guest config will remain available after signing out.
        </p>
        <div className="sync-conflict-options">
          <div className="sync-conflict-option">
            <div>
              <strong>Synced account</strong>
              <span>{configSummary(conflict.syncedConfig)}</span>
            </div>
            <button
              type="button"
              className="config-editor-btn config-editor-btn-save"
              onClick={() => onResolve('synced')}
            >
              Use synced config
            </button>
          </div>
          <div className="sync-conflict-option">
            <div>
              <strong>This browser</strong>
              <span>{configSummary(conflict.browserConfig)}</span>
            </div>
            <button
              type="button"
              className="config-editor-btn config-editor-btn-save"
              onClick={() => onResolve('browser')}
            >
              Use this browser
            </button>
          </div>
        </div>
        <button
          type="button"
          className="config-editor-btn config-editor-btn-cancel sync-conflict-cancel"
          onClick={() => onResolve('cancel')}
        >
          Cancel sign-in
        </button>
      </div>
    </div>
  );
}
