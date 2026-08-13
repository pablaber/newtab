import type { LinkConfig } from '../../../types/config.ts';
import { getFaviconUrl } from '../../../utils/favicon.ts';

interface LinkItemProps {
  link: LinkConfig;
  onNavigate: (url: string, label: string) => void;
}

export function LinkItem({ link, onNavigate }: LinkItemProps) {
  const iconSrc = link.icon || getFaviconUrl(link.url);

  return (
    <a
      href={link.url}
      className="link-item"
      onClick={(e) => {
        e.preventDefault();
        onNavigate(link.url, link.label);
      }}
    >
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
