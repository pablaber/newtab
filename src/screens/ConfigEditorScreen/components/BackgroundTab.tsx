import { useState } from 'react';
import type { AppConfig, BackgroundConfig } from '../../../types/config.ts';

interface BackgroundTabProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onPreview: (background: BackgroundConfig) => void;
}

export function BackgroundTab({ config, onSave, onClose, onPreview }: BackgroundTabProps) {
  const [imageUrl, setImageUrl] = useState(config.background?.imageUrl ?? '');
  const [appliedImageUrl, setAppliedImageUrl] = useState(config.background?.imageUrl ?? '');
  const [opacity, setOpacity] = useState(config.background?.opacity ?? 0.5);
  const [color, setColor] = useState(config.background?.color ?? '#000000');

  const hasImage = appliedImageUrl.trim() !== '';

  const updatePreview = (updates: { imageUrl?: string; opacity?: number; color?: string }) => {
    const next = {
      imageUrl: (updates.imageUrl ?? appliedImageUrl) || undefined,
      opacity: updates.opacity ?? opacity,
      color: updates.color ?? color,
    };
    onPreview(next);
  };

  const applyImageUrl = () => {
    setAppliedImageUrl(imageUrl);
    updatePreview({ imageUrl: imageUrl || undefined });
  };

  const removeImageUrl = () => {
    setImageUrl('');
    setAppliedImageUrl('');
    updatePreview({ imageUrl: '' });
  };

  const handleSave = () => {
    onSave({
      ...config,
      background: {
        ...config.background,
        imageUrl: appliedImageUrl || undefined,
        opacity,
        color,
      },
    });
    onClose();
  };

  return (
    <div className="config-editor-section">
      <h2 className="config-editor-section-title">Background</h2>

      <div className="config-editor-field">
        <span className="config-editor-label">Image URL</span>
        <div className="config-editor-input-group">
          <input
            type="text"
            className="config-editor-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={hasImage}
          />
          {hasImage ? (
            <button
              className="config-editor-btn config-editor-btn-remove"
              onClick={removeImageUrl}
            >
              Remove
            </button>
          ) : (
            <button
              className="config-editor-btn config-editor-btn-apply"
              onClick={applyImageUrl}
              disabled={imageUrl.trim() === ''}
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {hasImage && (
        <label className="config-editor-field">
          <span className="config-editor-label">Overlay Opacity ({opacity})</span>
          <input
            type="range"
            className="config-editor-range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => { const v = parseFloat(e.target.value); setOpacity(v); updatePreview({ opacity: v }); }}
          />
        </label>
      )}

      <label className="config-editor-field">
        <span className="config-editor-label">Color</span>
        <input
          type="color"
          className="config-editor-color"
          value={color}
          onChange={(e) => { setColor(e.target.value); updatePreview({ color: e.target.value }); }}
        />
      </label>

      <div className="config-editor-actions">
        <button className="config-editor-btn config-editor-btn-save" onClick={handleSave}>
          Save
        </button>
        <button className="config-editor-btn config-editor-btn-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
