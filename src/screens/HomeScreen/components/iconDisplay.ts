import type { LinkConfig } from '../../../types/config.ts';

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

export function getIconDisplay(link: LinkConfig): { type: 'emoji'; emoji: string } | { type: 'img'; src: string } | null {
  if (link.iconEmoji) {
    return { type: 'emoji', emoji: link.iconEmoji };
  }
  const imgSrc = link.iconUrl || link.icon || getFaviconUrl(link.url);
  if (imgSrc) {
    return { type: 'img', src: imgSrc };
  }
  return null;
}
