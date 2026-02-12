import type { LinkConfig } from '../types/config.ts';

interface LinkItemProps {
  link: LinkConfig;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

export function LinkItem({ link }: LinkItemProps) {
  const iconSrc = link.icon || getFaviconUrl(link.url);

  return (
    <a href={link.url} className="link-item">
      {iconSrc && (
        <img
          className="link-item-icon"
          src={iconSrc}
          alt=""
          width={20}
          height={20}
        />
      )}
      <span className="link-item-label">{link.label}</span>
    </a>
  );
}
