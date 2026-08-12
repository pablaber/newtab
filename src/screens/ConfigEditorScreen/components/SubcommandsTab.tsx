import { useEffect, useState } from 'react';
import type { AppConfig, SubcommandConfig } from '../../../types/config.ts';
import {
  isHttpUrl,
  isValidFreeform,
  MAX_SUBCOMMAND_FIELD_NAME,
  MAX_SUBCOMMAND_NAME,
  MAX_SUBCOMMAND_TRIGGER,
  normalizeSubcommand,
  SUBCOMMAND_IDENTIFIER_PATTERN,
} from '../../../utils/subcommands.ts';

interface SubcommandsTabProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
  onConfigChange: (config: AppConfig) => void;
  stageNew?: boolean;
}

interface EditorError {
  subcommand: number;
  field: string;
  item?: number;
  freeformField?: number;
  message: string;
}

const blankSubcommand = (): SubcommandConfig => ({ name: '', trigger: '', items: [] });

function move<T>(values: T[], index: number, offset: -1 | 1): T[] {
  const destination = index + offset;
  if (destination < 0 || destination >= values.length) return values;
  const next = [...values];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function SubcommandsTab({
  config,
  onSave,
  onClose,
  onConfigChange,
  stageNew = false,
}: SubcommandsTabProps) {
  const [subcommands, setSubcommands] = useState<SubcommandConfig[]>(() => {
    const existing = (config.subcommands ?? []).map((subcommand) => ({
      ...subcommand,
      items: subcommand.items.map((item) => ({ ...item })),
      freeform: subcommand.freeform && {
        ...subcommand.freeform,
        fields: subcommand.freeform.fields.map((field) => ({ ...field })),
      },
    }));
    return stageNew ? [blankSubcommand(), ...existing] : existing;
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    onConfigChange({ ...config, subcommands });
  }, [subcommands]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (index: number, transform: (value: SubcommandConfig) => SubcommandConfig) => {
    setSubcommands((current) => current.map((value, valueIndex) => (
      valueIndex === index ? transform(value) : value
    )));
  };

  const errors: EditorError[] = [];
  subcommands.forEach((subcommand, subcommandIndex) => {
    if (!subcommand.name.trim()) {
      errors.push({ subcommand: subcommandIndex, field: 'name', message: 'Name is required' });
    }
    const trigger = subcommand.trigger.trim();
    if (!trigger) {
      errors.push({ subcommand: subcommandIndex, field: 'trigger', message: 'Trigger is required' });
    } else if (!SUBCOMMAND_IDENTIFIER_PATTERN.test(trigger)) {
      errors.push({ subcommand: subcommandIndex, field: 'trigger', message: 'Use letters, numbers, _ or -' });
    } else if (subcommands.some((other, otherIndex) => (
      otherIndex !== subcommandIndex
      && other.trigger.trim().toLocaleLowerCase() === trigger.toLocaleLowerCase()
    ))) {
      errors.push({ subcommand: subcommandIndex, field: 'trigger', message: 'Trigger must be unique' });
    }

    if (subcommand.items.length === 0 && !subcommand.freeform) {
      errors.push({ subcommand: subcommandIndex, field: 'actionable', message: 'Add an item or enable a freeform URL' });
    }
    subcommand.items.forEach((item, itemIndex) => {
      if (!item.label.trim()) {
        errors.push({ subcommand: subcommandIndex, item: itemIndex, field: 'item-label', message: 'Label is required' });
      }
      if (!item.url.trim()) {
        errors.push({ subcommand: subcommandIndex, item: itemIndex, field: 'item-url', message: 'URL is required' });
      } else if (!isHttpUrl(item.url.trim()) && !isHttpUrl(`https://${item.url.trim()}`)) {
        errors.push({ subcommand: subcommandIndex, item: itemIndex, field: 'item-url', message: 'Enter a valid HTTP(S) URL' });
      }
    });

    if (subcommand.freeform) {
      if (subcommand.freeform.fields.length === 0) {
        errors.push({ subcommand: subcommandIndex, field: 'fields', message: 'Add at least one field' });
      }
      subcommand.freeform.fields.forEach((field, fieldIndex) => {
        const name = field.name.trim();
        if (!name) {
          errors.push({ subcommand: subcommandIndex, freeformField: fieldIndex, field: 'field-name', message: 'Field name is required' });
        } else if (!SUBCOMMAND_IDENTIFIER_PATTERN.test(name)) {
          errors.push({ subcommand: subcommandIndex, freeformField: fieldIndex, field: 'field-name', message: 'Use letters, numbers, _ or -' });
        } else if (subcommand.freeform?.fields.some((other, otherIndex) => (
          otherIndex !== fieldIndex
          && other.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
        ))) {
          errors.push({ subcommand: subcommandIndex, freeformField: fieldIndex, field: 'field-name', message: 'Field names must be unique' });
        }
      });
      if (!subcommand.freeform.urlTemplate.trim()) {
        errors.push({ subcommand: subcommandIndex, field: 'template', message: 'URL template is required' });
      } else if (subcommand.freeform.fields.length > 0 && !isValidFreeform({
        fields: subcommand.freeform.fields.map((field) => ({ name: field.name.trim() })),
        urlTemplate: subcommand.freeform.urlTemplate.trim(),
      })) {
        errors.push({ subcommand: subcommandIndex, field: 'template', message: 'Use every field once or more, with no unknown placeholders, in an HTTP(S) URL' });
      }
    }
  });

  const errorFor = (
    subcommand: number,
    field: string,
    item?: number,
    freeformField?: number,
  ) => errors.find((error) => (
    error.subcommand === subcommand
    && error.field === field
    && error.item === item
    && error.freeformField === freeformField
  ))?.message;

  const handleSave = () => {
    setSubmitted(true);
    if (errors.length > 0) return;
    const normalized = subcommands.map(normalizeSubcommand);
    onSave({ ...config, subcommands: normalized.length > 0 ? normalized : undefined });
  };

  return (
    <>
      <div className="config-editor-tab-toolbar">
        <button className="config-editor-btn-add" onClick={() => setSubcommands([blankSubcommand(), ...subcommands])}>
          <span aria-hidden="true">+</span>
          Add Subcommand
        </button>
        <button className="config-editor-btn-add config-editor-btn-save-top" onClick={handleSave}>
          <span aria-hidden="true">✓</span>
          Save
        </button>
      </div>

      {subcommands.length === 0 && (
        <div className="config-editor-links-empty">No subcommands yet. Add one to get started.</div>
      )}

      {subcommands.map((subcommand, subcommandIndex) => (
        <section className="config-editor-link-section subcommand-editor-card" key={subcommandIndex}>
          <div className="config-editor-section-header">
            <div className="subcommand-heading-fields">
              <input
                className="config-editor-input"
                value={subcommand.name}
                maxLength={MAX_SUBCOMMAND_NAME}
                placeholder="Subcommand name"
                aria-label={`Subcommand ${subcommandIndex + 1} name`}
                onChange={(event) => update(subcommandIndex, (value) => ({ ...value, name: event.target.value }))}
              />
              <input
                className="config-editor-input subcommand-trigger-input"
                value={subcommand.trigger}
                maxLength={MAX_SUBCOMMAND_TRIGGER}
                placeholder="Trigger"
                aria-label={`Subcommand ${subcommandIndex + 1} trigger`}
                onChange={(event) => update(subcommandIndex, (value) => ({ ...value, trigger: event.target.value }))}
              />
            </div>
            <button className="config-editor-btn-icon" disabled={subcommandIndex === 0} title="Move subcommand up" onClick={() => setSubcommands(move(subcommands, subcommandIndex, -1))}>↑</button>
            <button className="config-editor-btn-icon" disabled={subcommandIndex === subcommands.length - 1} title="Move subcommand down" onClick={() => setSubcommands(move(subcommands, subcommandIndex, 1))}>↓</button>
            <button className="config-editor-btn-icon danger" title="Remove subcommand" onClick={() => setSubcommands(subcommands.filter((_, index) => index !== subcommandIndex))}>×</button>
          </div>
          {submitted && errorFor(subcommandIndex, 'name') && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'name')}</div>}
          {submitted && errorFor(subcommandIndex, 'trigger') && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'trigger')}</div>}
          {submitted && errorFor(subcommandIndex, 'actionable') && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'actionable')}</div>}

          <div className="subcommand-editor-group">
            <div className="subcommand-editor-group-header">
              <h3>Predefined items</h3>
              <button
                className="config-editor-btn-add"
                aria-label="Add Item"
                onClick={() => update(subcommandIndex, (value) => ({
                  ...value,
                  items: [...value.items, { label: '', url: '' }],
                }))}
              >
                + Add Item
              </button>
            </div>
            {subcommand.items.map((item, itemIndex) => (
              <div className="config-editor-link-row" key={itemIndex}>
                <div className="config-editor-link-fields">
                  <input
                    className="config-editor-input"
                    value={item.label}
                    placeholder="Label"
                    aria-label={`${subcommand.name || 'Subcommand'} item ${itemIndex + 1} label`}
                    onChange={(event) => update(subcommandIndex, (value) => ({
                      ...value,
                      items: value.items.map((current, index) => index === itemIndex ? { ...current, label: event.target.value } : current),
                    }))}
                  />
                  {submitted && errorFor(subcommandIndex, 'item-label', itemIndex) && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'item-label', itemIndex)}</div>}
                  <input
                    className="config-editor-input"
                    value={item.url}
                    placeholder="URL (e.g. example.com)"
                    aria-label={`${subcommand.name || 'Subcommand'} item ${itemIndex + 1} URL`}
                    onChange={(event) => update(subcommandIndex, (value) => ({
                      ...value,
                      items: value.items.map((current, index) => index === itemIndex ? { ...current, url: event.target.value } : current),
                    }))}
                  />
                  {submitted && errorFor(subcommandIndex, 'item-url', itemIndex) && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'item-url', itemIndex)}</div>}
                </div>
                <div className="config-editor-link-actions">
                  <button className="config-editor-btn-icon" disabled={itemIndex === 0} title="Move item up" onClick={() => update(subcommandIndex, (value) => ({ ...value, items: move(value.items, itemIndex, -1) }))}>↑</button>
                  <button className="config-editor-btn-icon" disabled={itemIndex === subcommand.items.length - 1} title="Move item down" onClick={() => update(subcommandIndex, (value) => ({ ...value, items: move(value.items, itemIndex, 1) }))}>↓</button>
                  <button className="config-editor-btn-icon danger" title="Remove item" onClick={() => update(subcommandIndex, (value) => ({ ...value, items: value.items.filter((_, index) => index !== itemIndex) }))}>×</button>
                </div>
              </div>
            ))}
          </div>

          <div className="subcommand-editor-group">
            <label className="config-editor-toggle">
              <input
                type="checkbox"
                checked={Boolean(subcommand.freeform)}
                onChange={(event) => update(subcommandIndex, (value) => ({
                  ...value,
                  freeform: event.target.checked ? { fields: [{ name: '' }], urlTemplate: '' } : undefined,
                }))}
              />
              <span className="config-editor-toggle-label">Enable freeform URL</span>
            </label>

            {subcommand.freeform && (
              <div className="subcommand-freeform-editor">
                <div className="subcommand-editor-group-header">
                  <h3>Ordered fields</h3>
                  <button
                    className="config-editor-btn-add"
                    aria-label="Add Field"
                    onClick={() => update(subcommandIndex, (value) => ({
                      ...value,
                      freeform: value.freeform && {
                        ...value.freeform,
                        fields: [...value.freeform.fields, { name: '' }],
                      },
                    }))}
                  >
                    + Add Field
                  </button>
                </div>
                {subcommand.freeform.fields.map((field, fieldIndex) => (
                  <div className="subcommand-field-row" key={fieldIndex}>
                    <div className="config-editor-link-fields">
                      <input
                        className="config-editor-input"
                        value={field.name}
                        maxLength={MAX_SUBCOMMAND_FIELD_NAME}
                        placeholder="Field name"
                        aria-label={`${subcommand.name || 'Subcommand'} field ${fieldIndex + 1} name`}
                        onChange={(event) => update(subcommandIndex, (value) => ({
                          ...value,
                          freeform: value.freeform && {
                            ...value.freeform,
                            fields: value.freeform.fields.map((current, index) => index === fieldIndex ? { name: event.target.value } : current),
                          },
                        }))}
                      />
                      {submitted && errorFor(subcommandIndex, 'field-name', undefined, fieldIndex) && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'field-name', undefined, fieldIndex)}</div>}
                    </div>
                    <button className="config-editor-btn-icon" disabled={fieldIndex === 0} title="Move field up" onClick={() => update(subcommandIndex, (value) => ({ ...value, freeform: value.freeform && { ...value.freeform, fields: move(value.freeform.fields, fieldIndex, -1) } }))}>↑</button>
                    <button className="config-editor-btn-icon" disabled={fieldIndex === subcommand.freeform!.fields.length - 1} title="Move field down" onClick={() => update(subcommandIndex, (value) => ({ ...value, freeform: value.freeform && { ...value.freeform, fields: move(value.freeform.fields, fieldIndex, 1) } }))}>↓</button>
                    <button className="config-editor-btn-icon danger" title="Remove field" onClick={() => update(subcommandIndex, (value) => ({ ...value, freeform: value.freeform && { ...value.freeform, fields: value.freeform.fields.filter((_, index) => index !== fieldIndex) } }))}>×</button>
                  </div>
                ))}
                {submitted && errorFor(subcommandIndex, 'fields') && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'fields')}</div>}
                <label className="config-editor-field">
                  <span className="config-editor-label">URL template</span>
                  <input
                    className="config-editor-input"
                    value={subcommand.freeform.urlTemplate}
                    placeholder="https://example.com/{field}"
                    onChange={(event) => update(subcommandIndex, (value) => ({
                      ...value,
                      freeform: value.freeform && { ...value.freeform, urlTemplate: event.target.value },
                    }))}
                  />
                  {submitted && errorFor(subcommandIndex, 'template') && <div className="config-editor-field-error">{errorFor(subcommandIndex, 'template')}</div>}
                </label>
              </div>
            )}
          </div>
        </section>
      ))}

      <div className="config-editor-actions">
        <button className="config-editor-btn config-editor-btn-save" onClick={handleSave}>Save</button>
        <button className="config-editor-btn config-editor-btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}
