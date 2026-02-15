import type { LinkConfig } from '../../../types/config.ts';
import { getIconDisplay } from './iconDisplay.ts';

interface LinkItemProps {
  link: LinkConfig;
  onNavigate: (url: string, label: string) => void;
}

export function LinkItem({ link, onNavigate }: LinkItemProps) {
  const icon = getIconDisplay(link);

  return (
    <a
      href={link.url}
      className="link-item"
      onClick={(e) => {
        e.preventDefault();
        onNavigate(link.url, link.label);
      }}
    >
      {icon?.type === 'emoji' && (
        <span className="link-item-emoji" role="img" aria-hidden="true">
          {icon.emoji}
        </span>
      )}
      {icon?.type === 'img' && (
        <img
          className="link-item-icon"
          src={icon.src}
          alt=""
          width={20}
          height={20}
        />
      )}
      <span className="link-item-label">{link.label}</span>
    </a>
  );
}
