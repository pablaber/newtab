import { useState } from 'react';
import type { AppConfig, BackgroundConfig, GradientDirection } from '../../../types/config.ts';

const DIRECTION_ARROWS: { value: GradientDirection; arrow: string }[] = [
  { value: 'up', arrow: '↑' },
  { value: 'down', arrow: '↓' },
  { value: 'left', arrow: '←' },
  { value: 'right', arrow: '→' },
];

interface GeneralTabProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onPreview: (background: BackgroundConfig) => void;
}

export function GeneralTab({ config, onSave, onClose, onPreview }: GeneralTabProps) {
  const [imageUrl, setImageUrl] = useState(config.background?.imageUrl ?? '');
  const [appliedImageUrl, setAppliedImageUrl] = useState(config.background?.imageUrl ?? '');
  const [opacity, setOpacity] = useState(config.background?.opacity ?? 0.5);
  const [color, setColor] = useState(config.background?.color ?? '#000000');
  const [gradientEnabled, setGradientEnabled] = useState(config.background?.gradient?.enabled ?? false);
  const [gradientColor2, setGradientColor2] = useState(config.background?.gradient?.color2 ?? '#000000');
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>(config.background?.gradient?.direction ?? 'down');
  const [placeholder, setPlaceholder] = useState(config.search?.placeholder ?? '');

  const hasImage = appliedImageUrl.trim() !== '';

  const buildGradient = (updates: { enabled?: boolean; color2?: string; direction?: GradientDirection } = {}) => ({
    enabled: updates.enabled ?? gradientEnabled,
    color2: updates.color2 ?? gradientColor2,
    direction: updates.direction ?? gradientDirection,
  });

  const updatePreview = (updates: {
    imageUrl?: string;
    opacity?: number;
    color?: string;
    gradient?: { enabled?: boolean; color2?: string; direction?: GradientDirection };
  }) => {
    const next: BackgroundConfig = {
      imageUrl: (updates.imageUrl ?? appliedImageUrl) || undefined,
      opacity: updates.opacity ?? opacity,
      color: updates.color ?? color,
      gradient: buildGradient(updates.gradient),
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
        gradient: {
          enabled: gradientEnabled,
          color2: gradientColor2,
          direction: gradientDirection,
        },
      },
      search: {
        ...config.search,
        enabled: config.search?.enabled ?? false,
        placeholder: placeholder || undefined,
      },
    });
    onClose();
  };

  return (
    <>
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

        <div className="config-editor-field">
          <span className="config-editor-label">{gradientEnabled ? 'Colors' : 'Color'}</span>
          <div className="config-editor-color-row">
            <input
              type="color"
              className="config-editor-color"
              value={color}
              onChange={(e) => { setColor(e.target.value); updatePreview({ color: e.target.value }); }}
            />
            {gradientEnabled && (
              <input
                type="color"
                className="config-editor-color"
                value={gradientColor2}
                onChange={(e) => { setGradientColor2(e.target.value); updatePreview({ gradient: { color2: e.target.value } }); }}
              />
            )}
          </div>
        </div>

        <div className="config-editor-field">
          <label className="config-editor-toggle">
            <input
              type="checkbox"
              checked={gradientEnabled}
              onChange={(e) => {
                setGradientEnabled(e.target.checked);
                updatePreview({ gradient: { enabled: e.target.checked } });
              }}
            />
            <span className="config-editor-toggle-label">Enable Gradient</span>
          </label>
        </div>

        {gradientEnabled && (
          <>
            <div className="config-editor-field">
              <span className="config-editor-label">Direction</span>
              <div className="config-editor-direction-row">
                {DIRECTION_ARROWS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`config-editor-direction-btn${gradientDirection === opt.value ? ' active' : ''}`}
                    onClick={() => {
                      setGradientDirection(opt.value);
                      updatePreview({ gradient: { direction: opt.value } });
                    }}
                  >
                    {opt.arrow}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="config-editor-section config-editor-section-gap">
        <h2 className="config-editor-section-title">Search</h2>

        <div className="config-editor-field">
          <span className="config-editor-label">Placeholder</span>
          <input
            type="text"
            className="config-editor-input"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            placeholder="Filter links..."
          />
        </div>
      </div>

      <div className="config-editor-actions">
        <button className="config-editor-btn config-editor-btn-save" onClick={handleSave}>
          Save
        </button>
        <button className="config-editor-btn config-editor-btn-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}
