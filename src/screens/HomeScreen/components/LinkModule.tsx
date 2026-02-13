import type { ModuleConfig } from '../../../types/config.ts';
import { LinkItem } from './LinkItem.tsx';

interface LinkModuleProps {
  module: ModuleConfig;
  onNavigate: (url: string, label: string) => void;
}

export function LinkModule({ module, onNavigate }: LinkModuleProps) {
  const visibleLinks = module.links.filter((l) => !l.hidden);

  return (
    <div className="link-module">
      <h2 className="link-module-title">{module.title}</h2>
      <div className="link-module-grid">
        {visibleLinks.map((link) => (
          <LinkItem key={link.url} link={link} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
