import type { ModuleConfig } from '../types/config.ts';
import { LinkModule } from './LinkModule.tsx';

interface ModuleGridProps {
  modules: ModuleConfig[];
  onNavigate: (url: string, label: string) => void;
}

export function ModuleGrid({ modules, onNavigate }: ModuleGridProps) {
  return (
    <div className="module-grid">
      {modules.map((module) => (
        <LinkModule key={module.title} module={module} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
