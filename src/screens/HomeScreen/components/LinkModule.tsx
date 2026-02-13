import type { ModuleConfig } from '../../../types/config.ts';
import { LinkItem } from './LinkItem.tsx';

interface LinkModuleProps {
  module: ModuleConfig;
  onNavigate: (url: string, label: string) => void;
}

export function LinkModule({ module, onNavigate }: LinkModuleProps) {
  return (
    <div className="link-module">
      <h2 className="link-module-title">{module.title}</h2>
      <div className="link-module-grid">
        {module.links.map((link) => (
          <LinkItem key={link.url} link={link} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
