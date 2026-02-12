import type { ModuleConfig } from '../types/config.ts';
import { LinkModule } from './LinkModule.tsx';

interface ModuleGridProps {
  modules: ModuleConfig[];
}

export function ModuleGrid({ modules }: ModuleGridProps) {
  return (
    <div className="module-grid">
      {modules.map((module) => (
        <LinkModule key={module.title} module={module} />
      ))}
    </div>
  );
}
