import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useHotkey } from '@tanstack/react-hotkeys';
import type { AppConfig, ModuleConfig } from '../../../types/config.ts';
import { ensureProtocol, MAX_LINK_LABEL, MAX_SECTION_NAME } from '../../../utils/linkConfig.ts';

type CommandId = 'add-link';
type PaletteView = 'commands' | CommandId;

interface CommandDefinition {
  id: CommandId;
  label: string;
  description: string;
  keywords: string[];
}

const COMMANDS = [
  {
    id: 'add-link',
    label: 'Add Link',
    description: 'Create a link in a category',
    keywords: ['bookmark', 'url', 'folder', 'category'],
  },
] satisfies readonly CommandDefinition[];

interface CommandPaletteProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

interface AddLinkFormProps extends CommandPaletteProps {
  onBack: () => void;
}

interface FormErrors {
  url?: string;
  label?: string;
  category?: string;
}

type CategorySelection =
  | { type: 'existing'; index: number; title: string }
  | { type: 'create'; title: string };

type CategoryOption =
  | { type: 'existing'; id: string; index: number; module: ModuleConfig }
  | { type: 'create'; id: string; title: string };

const MAX_CATEGORY_RESULTS = 3;

function AddLinkForm({ config, onSave, onClose, onBack }: AddLinkFormProps) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategorySelection | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(-1);
  const [submitted, setSubmitted] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const categoryListId = useId();

  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const normalized = category.trim().toLocaleLowerCase();
    const matchingModules = config.modules
      .map((module, index) => {
        const title = module.title.trim().toLocaleLowerCase();
        const score = !normalized
          ? 0
          : title === normalized
            ? 3
            : title.startsWith(normalized)
              ? 2
              : title.includes(normalized)
                ? 1
                : -1;
        return { type: 'existing' as const, id: `existing-${index}`, index, module, score };
      })
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, MAX_CATEGORY_RESULTS)
      .map(({ id, index, module, type }) => ({ id, index, module, type }));

    const hasExactMatch = normalized !== '' && config.modules.some(
      (module) => module.title.trim().toLocaleLowerCase() === normalized,
    );

    return normalized && !hasExactMatch
      ? [...matchingModules, { type: 'create', id: 'create', title: category.trim() }]
      : matchingModules;
  }, [category, config.modules]);

  const trimmedCategory = category.trim();
  const exactModuleIndex = config.modules.findIndex(
    (module) => module.title.trim().toLocaleLowerCase() === trimmedCategory.toLocaleLowerCase(),
  );
  const resolvedCategory: CategorySelection | null = selectedCategory?.title === trimmedCategory
    ? selectedCategory
    : exactModuleIndex >= 0
      ? { type: 'existing', index: exactModuleIndex, title: config.modules[exactModuleIndex].title }
      : null;

  const errors: FormErrors = {};
  if (submitted) {
    if (!url.trim()) errors.url = 'URL is required';
    if (!label.trim()) errors.label = 'Label is required';
    if (!trimmedCategory) {
      errors.category = 'Category is required';
    } else if (!resolvedCategory) {
      errors.category = 'Choose a category or select the create option';
    }
  }

  const selectCategoryOption = (option: CategoryOption) => {
    if (option.type === 'existing') {
      setCategory(option.module.title);
      setSelectedCategory({ type: 'existing', index: option.index, title: option.module.title });
    } else {
      setCategory(option.title);
      setSelectedCategory({ type: 'create', title: option.title });
    }
    setShowCategories(false);
    setActiveCategoryIndex(-1);
  };

  const handleCategoryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setShowCategories(true);
      setActiveCategoryIndex((current) => (
        Math.min(current + 1, categoryOptions.length - 1)
      ));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setShowCategories(true);
      setActiveCategoryIndex((current) => Math.max(current - 1, 0));
    } else if (
      event.key === 'Enter'
      && showCategories
      && activeCategoryIndex >= 0
      && categoryOptions[activeCategoryIndex]
    ) {
      event.preventDefault();
      selectCategoryOption(categoryOptions[activeCategoryIndex]);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim();
    if (!trimmedUrl || !trimmedLabel || !trimmedCategory || !resolvedCategory) return;

    const link = {
      url: ensureProtocol(trimmedUrl),
      label: trimmedLabel,
    };

    const modules = resolvedCategory.type === 'existing'
      ? config.modules.map((module, index) => (
          index === resolvedCategory.index
            ? { ...module, links: [...module.links, link] }
            : module
        ))
      : [
          { type: 'links' as const, title: trimmedCategory, links: [link] },
          ...config.modules,
        ];

    onSave({ ...config, modules });
    onClose();
  };

  return (
    <form className="command-add-link-form" onSubmit={handleSubmit} noValidate>
      <label className="command-field">
        <span className="command-field-label">Link URL</span>
        <input
          ref={urlInputRef}
          type="text"
          className="command-input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="example.com"
          aria-invalid={Boolean(errors.url)}
          aria-describedby={errors.url ? 'command-url-error' : undefined}
        />
        {errors.url && <span id="command-url-error" className="command-field-error">{errors.url}</span>}
      </label>

      <label className="command-field">
        <span className="command-field-label">Link label</span>
        <input
          type="text"
          className="command-input"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="GitHub"
          maxLength={MAX_LINK_LABEL}
          aria-invalid={Boolean(errors.label)}
          aria-describedby={errors.label ? 'command-label-error' : undefined}
        />
        {errors.label && <span id="command-label-error" className="command-field-error">{errors.label}</span>}
      </label>

      <div
        className="command-field command-category-field"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setShowCategories(false);
            setActiveCategoryIndex(-1);
          }
        }}
      >
        <label className="command-field-label" htmlFor="command-category-input">
          Folder / category
        </label>
        <input
          id="command-category-input"
          type="text"
          className="command-input"
          role="combobox"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setSelectedCategory(null);
            setShowCategories(true);
            setActiveCategoryIndex(-1);
          }}
          onFocus={() => setShowCategories(true)}
          onKeyDown={handleCategoryKeyDown}
          placeholder="Choose or create a category"
          maxLength={MAX_SECTION_NAME}
          aria-autocomplete="list"
          aria-controls={categoryListId}
          aria-expanded={showCategories}
          aria-activedescendant={activeCategoryIndex >= 0
            ? `${categoryListId}-${categoryOptions[activeCategoryIndex]?.id}`
            : undefined}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? 'command-category-error' : undefined}
        />
        {showCategories && categoryOptions.length > 0 && (
          <div id={categoryListId} className="command-category-list" role="listbox">
            {categoryOptions.map((option, optionIndex) => {
              const isSelected = option.type === 'existing'
                ? selectedCategory?.type === 'existing' && selectedCategory.index === option.index
                : selectedCategory?.type === 'create' && selectedCategory.title === option.title;

              return (
                <button
                  id={`${categoryListId}-${option.id}`}
                  key={option.id}
                  type="button"
                  className={`command-category-option${option.type === 'create' ? ' command-category-create' : ''}${optionIndex === activeCategoryIndex ? ' selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveCategoryIndex(optionIndex)}
                  onClick={() => selectCategoryOption(option)}
                >
                  {option.type === 'existing' ? (
                    <>
                      <span>{option.module.title}</span>
                      {option.module.hidden && <span className="command-hidden-badge">Hidden</span>}
                    </>
                  ) : (
                    <span>Create new category <strong>&ldquo;{option.title}&rdquo;</strong></span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {errors.category && (
          <span id="command-category-error" className="command-field-error">{errors.category}</span>
        )}
        <span className="command-field-hint">Search categories, or choose the create option.</span>
      </div>

      <div className="command-form-actions">
        <button type="submit" className="command-primary-button">Add Link</button>
        <button type="button" className="command-secondary-button" onClick={onClose}>Cancel</button>
        <button type="button" className="command-text-button" onClick={onBack}>Back to commands</button>
      </div>
    </form>
  );
}

export function CommandPalette({ config, onSave, onClose }: CommandPaletteProps) {
  const [view, setView] = useState<PaletteView>('commands');
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const listId = useId();

  const filteredCommands = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return COMMANDS;

    return COMMANDS.filter((command) => {
      const haystack = [command.label, command.description, ...command.keywords]
        .join(' ')
        .toLocaleLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [query]);

  useHotkey('Escape', onClose, { preventDefault: true });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    if (view === 'commands') commandInputRef.current?.focus();
  }, [view]);

  const activateCommand = (command: CommandDefinition) => {
    setView(command.id);
  };

  const handleCommandKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, filteredCommands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && filteredCommands[selectedIndex]) {
      event.preventDefault();
      activateCommand(filteredCommands[selectedIndex]);
    }
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled])',
    ) ?? []);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="command-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="command-header">
          <div className="command-header-title-group">
            {view !== 'commands' && (
              <button
                type="button"
                className="command-icon-button"
                aria-label="Back to commands"
                onClick={() => setView('commands')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
            <h2 id={titleId} className="command-title">
              {view === 'commands' ? 'Commands' : 'Add Link'}
            </h2>
          </div>
          <button type="button" className="command-icon-button" aria-label="Close commands" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {view === 'commands' ? (
          <>
            <input
              ref={commandInputRef}
              type="text"
              className="command-search-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleCommandKeyDown}
              placeholder="Type a command..."
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded="true"
              aria-activedescendant={filteredCommands[selectedIndex]
                ? `${listId}-${filteredCommands[selectedIndex].id}`
                : undefined}
            />
            <div id={listId} className="command-list" role="listbox">
              {filteredCommands.map((command, index) => (
                <button
                  id={`${listId}-${command.id}`}
                  key={command.id}
                  type="button"
                  className={`command-list-item${index === selectedIndex ? ' selected' : ''}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => activateCommand(command)}
                >
                  <span className="command-list-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </span>
                  <span className="command-list-copy">
                    <span className="command-list-label">{command.label}</span>
                    <span className="command-list-description">{command.description}</span>
                  </span>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <p className="command-empty">No commands found.</p>
              )}
            </div>
          </>
        ) : (
          <AddLinkForm
            config={config}
            onSave={onSave}
            onClose={onClose}
            onBack={() => setView('commands')}
          />
        )}
      </div>
    </div>
  );
}
