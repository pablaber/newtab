import type { ModuleConfig } from '../../../types/config.ts';
import { LinkModule } from './LinkModule.tsx';

interface ModuleGridProps {
  modules: ModuleConfig[];
  onNavigate: (url: string, label: string) => void;
}

export function ModuleGrid({ modules, onNavigate }: ModuleGridProps) {
  const visibleModules = modules.filter((m) => !m.hidden);

  return (
    <div className="module-grid">
      {visibleModules.map((module) => (
        <LinkModule key={module.title} module={module} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
