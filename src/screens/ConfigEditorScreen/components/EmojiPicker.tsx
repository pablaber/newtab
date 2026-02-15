import { useState } from 'react';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '😎', '🤩', '🥳', '😤', '🤯', '🥺', '😱', '💀', '👻', '🤖', '👽', '💩'],
  },
  {
    label: 'Hands',
    emojis: ['👍', '👎', '👊', '✊', '🤞', '✌️', '🤟', '👋', '🤚', '🖐️', '✋', '👏', '🙌', '🤝', '🙏', '💪', '🫶'],
  },
  {
    label: 'Objects',
    emojis: ['💻', '🖥️', '📱', '📧', '📝', '📁', '📂', '📌', '📎', '🔗', '🔒', '🔑', '🔧', '🔨', '⚙️', '🛠️', '📊', '📈', '📉', '💡', '🔔', '📦', '🗂️', '🏷️', '💾', '🖨️'],
  },
  {
    label: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '⭐', '🌟', '✨', '💥', '🔥', '⚡', '❗', '❓', '✅', '❌', '⬆️', '➡️', '⬇️', '⬅️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣'],
  },
  {
    label: 'Nature',
    emojis: ['🌍', '🌎', '🌏', '🌞', '🌙', '⛅', '🌈', '🌊', '🌸', '🌺', '🌻', '🍀', '🌲', '🌴', '🍄', '🐶', '🐱', '🐸', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐵'],
  },
  {
    label: 'Food',
    emojis: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍕', '🍔', '🌮', '🍣', '🍩', '🍪', '🎂', '🍰', '☕', '🍵', '🧃', '🍺', '🍷', '🥤', '🧁'],
  },
  {
    label: 'Travel',
    emojis: ['🏠', '🏢', '🏫', '🏥', '🏪', '🚗', '🚕', '🚌', '🚀', '✈️', '🚢', '🚲', '🏖️', '🏔️', '⛺', '🗼', '🗽', '🎡'],
  },
  {
    label: 'Activities',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🎮', '🎲', '🎯', '🎨', '🎬', '🎤', '🎧', '🎵', '🎹', '📚', '🎓', '🏆', '🥇', '🎪', '🎭'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const filteredCategories = search
    ? EMOJI_CATEGORIES.map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((e) => e.includes(search)),
      })).filter((cat) => cat.emojis.length > 0)
    : EMOJI_CATEGORIES;

  return (
    <div className="config-editor-modal-overlay" onClick={onClose}>
      <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
        <div className="emoji-picker-header">
          <input
            className="config-editor-input emoji-picker-search"
            type="text"
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button className="config-editor-back" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {!search && (
          <div className="emoji-picker-tabs">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                className={`emoji-picker-tab${i === activeCategory ? ' active' : ''}`}
                onClick={() => setActiveCategory(i)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
        <div className="emoji-picker-grid">
          {(search ? filteredCategories : [EMOJI_CATEGORIES[activeCategory]]).map((cat) => (
            <div key={cat.label}>
              {search && <div className="emoji-picker-category-label">{cat.label}</div>}
              <div className="emoji-picker-emojis">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    className="emoji-picker-emoji"
                    onClick={() => onSelect(emoji)}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {search && filteredCategories.length === 0 && (
            <div className="emoji-picker-empty">No emojis found</div>
          )}
        </div>
      </div>
    </div>
  );
}
