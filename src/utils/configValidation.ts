import type { AppConfig, ModuleConfig } from '../types/config.ts';
import {
  isHttpUrl,
  isValidFreeform,
  MAX_SUBCOMMAND_NAME,
  MAX_SUBCOMMAND_TRIGGER,
  SUBCOMMAND_IDENTIFIER_PATTERN,
} from './subcommands.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

export function validateConfig(value: unknown): value is AppConfig {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'number' || !Number.isFinite(value.version)) return false;
  if (!Array.isArray(value.modules)) return false;

  if (value.background !== undefined) {
    if (!isRecord(value.background)) return false;
    const background = value.background;
    if (!isOptionalString(background.imageUrl)) return false;
    if (background.opacity !== undefined && typeof background.opacity !== 'number') return false;
    if (!isOptionalString(background.color)) return false;
    if (
      background.foreground !== undefined
      && !['auto', 'light', 'dark'].includes(background.foreground as string)
    ) return false;

    if (background.gradient !== undefined) {
      if (!isRecord(background.gradient)) return false;
      if (typeof background.gradient.enabled !== 'boolean') return false;
      if (typeof background.gradient.color2 !== 'string') return false;
      if (!['up', 'down', 'left', 'right'].includes(background.gradient.direction as string)) {
        return false;
      }
    }
  }

  if (value.search !== undefined) {
    if (!isRecord(value.search)) return false;
    if (typeof value.search.enabled !== 'boolean') return false;
    if (!isOptionalString(value.search.placeholder)) return false;
  }

  if (value.subcommands !== undefined) {
    if (!Array.isArray(value.subcommands)) return false;
    const triggers = new Set<string>();

    for (const subcommand of value.subcommands) {
      if (!isRecord(subcommand)) return false;
      if (
        typeof subcommand.name !== 'string'
        || !subcommand.name.trim()
        || subcommand.name.length > MAX_SUBCOMMAND_NAME
        || typeof subcommand.trigger !== 'string'
        || !subcommand.trigger
        || subcommand.trigger.length > MAX_SUBCOMMAND_TRIGGER
        || !SUBCOMMAND_IDENTIFIER_PATTERN.test(subcommand.trigger)
        || !Array.isArray(subcommand.items)
      ) return false;

      const trigger = subcommand.trigger.toLocaleLowerCase();
      if (triggers.has(trigger)) return false;
      triggers.add(trigger);

      for (const item of subcommand.items) {
        if (!isRecord(item)) return false;
        if (
          typeof item.label !== 'string'
          || !item.label.trim()
          || typeof item.url !== 'string'
          || !isHttpUrl(item.url)
          || !isOptionalString(item.icon)
        ) return false;
      }

      if (subcommand.freeform !== undefined) {
        if (!isRecord(subcommand.freeform)) return false;
        if (!Array.isArray(subcommand.freeform.fields)) return false;
        if (!subcommand.freeform.fields.every((field) => (
          isRecord(field) && typeof field.name === 'string'
        ))) return false;
        if (typeof subcommand.freeform.urlTemplate !== 'string') return false;
        if (!isValidFreeform(subcommand.freeform as unknown as import('../types/config.ts').SubcommandFreeformConfig)) return false;
      }

      if (subcommand.items.length === 0 && subcommand.freeform === undefined) return false;
    }
  }

  for (const module of value.modules) {
    if (!isRecord(module)) return false;
    if (module.type !== 'links' || typeof module.title !== 'string') return false;
    if (!isOptionalBoolean(module.hidden) || !Array.isArray(module.links)) return false;

    for (const link of module.links) {
      if (!isRecord(link)) return false;
      if (typeof link.url !== 'string' || typeof link.label !== 'string') return false;
      if (!isOptionalString(link.icon) || !isOptionalBoolean(link.hidden)) return false;
    }
  }

  return true;
}

/** Module fields that were once documented but are no longer part of the schema. */
const LEGACY_MODULE_KEYS = ['columns'] as const;

/**
 * Drops fields that are no longer supported so older configs converge on the
 * current schema. Returns the original config when nothing changed, keeping
 * reference equality for untouched configs.
 */
export function migrateConfig(config: AppConfig): AppConfig {
  let changed = false;

  const modules = config.modules.map((module) => {
    const record = module as unknown as Record<string, unknown>;
    if (!LEGACY_MODULE_KEYS.some((key) => key in record)) return module;

    changed = true;
    const next = { ...record };
    for (const key of LEGACY_MODULE_KEYS) delete next[key];
    return next as unknown as ModuleConfig;
  });

  return changed ? { ...config, modules } : config;
}

/** Validates and migrates an unknown value, returning `null` when invalid. */
export function parseConfig(value: unknown): AppConfig | null {
  return validateConfig(value) ? migrateConfig(value) : null;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length
      && left.every((value, index) => valuesEqual(value, right[index]));
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => (
        key === rightKeys[index] && valuesEqual(left[key], right[key])
      ));
  }
  return false;
}

export function configsEqual(left: AppConfig, right: AppConfig): boolean {
  return valuesEqual(left, right);
}
