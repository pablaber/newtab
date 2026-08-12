import type { AppConfig } from '../types/config.ts';

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
