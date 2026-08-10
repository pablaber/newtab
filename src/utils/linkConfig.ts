export const MAX_SECTION_NAME = 50;
export const MAX_LINK_LABEL = 80;

export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
