import type {
  SubcommandConfig,
  SubcommandFreeformConfig,
} from '../types/config.ts';
import { ensureProtocol } from './linkConfig.ts';

export const MAX_SUBCOMMAND_NAME = 50;
export const MAX_SUBCOMMAND_TRIGGER = 20;
export const MAX_SUBCOMMAND_FIELD_NAME = 30;
export const SUBCOMMAND_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function templatePlaceholders(template: string): string[] | null {
  const placeholders = Array.from(template.matchAll(/\{([^{}]+)\}/g), (match) => match[1]);
  const remainder = template.replace(/\{[^{}]+\}/g, '');
  return /[{}]/.test(remainder) ? null : placeholders;
}

export function isValidFreeform(freeform: SubcommandFreeformConfig): boolean {
  if (!Array.isArray(freeform.fields) || freeform.fields.length === 0) return false;
  if (typeof freeform.urlTemplate !== 'string' || !freeform.urlTemplate.trim()) return false;

  const names = freeform.fields.map((field) => field.name);
  if (names.some((name) => (
    typeof name !== 'string'
    || !name
    || name.length > MAX_SUBCOMMAND_FIELD_NAME
    || !SUBCOMMAND_IDENTIFIER_PATTERN.test(name)
  ))) return false;
  if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) return false;

  const placeholders = templatePlaceholders(freeform.urlTemplate);
  if (!placeholders) return false;
  const normalizedNames = names.map((name) => name.toLocaleLowerCase());
  const normalizedPlaceholders = placeholders.map((name) => name.toLocaleLowerCase());
  if (normalizedPlaceholders.some((name) => !normalizedNames.includes(name))) return false;
  if (normalizedNames.some((name) => !normalizedPlaceholders.includes(name))) return false;

  const sampleValues = Object.fromEntries(normalizedNames.map((name) => [name, 'value']));
  return isHttpUrl(resolveSubcommandUrl(
    {
      fields: freeform.fields.map((field) => ({ name: field.name.toLocaleLowerCase() })),
      urlTemplate: freeform.urlTemplate.trim(),
    },
    sampleValues,
  ));
}

export function resolveSubcommandUrl(
  freeform: SubcommandFreeformConfig,
  values: Record<string, string>,
): string {
  return freeform.urlTemplate.replace(/\{([^{}]+)\}/g, (_, rawName: string) => (
    encodeURIComponent(values[rawName.toLocaleLowerCase()] ?? '')
  ));
}

export function normalizeSubcommand(subcommand: SubcommandConfig): SubcommandConfig {
  const normalized: SubcommandConfig = {
    name: subcommand.name.trim(),
    trigger: subcommand.trigger.trim().toLocaleLowerCase(),
    items: subcommand.items.map((item) => ({
      ...item,
      label: item.label.trim(),
      url: ensureProtocol(item.url),
    })),
  };

  if (subcommand.freeform) {
    normalized.freeform = {
      fields: subcommand.freeform.fields.map((field) => ({
        name: field.name.trim().toLocaleLowerCase(),
      })),
      urlTemplate: subcommand.freeform.urlTemplate.trim(),
    };
  }

  return normalized;
}
