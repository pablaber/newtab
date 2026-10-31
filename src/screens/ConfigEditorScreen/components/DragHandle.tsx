import type { ComponentProps } from 'react';

interface DragHandleProps extends Omit<ComponentProps<'button'>, 'type' | 'className' | 'children'> {
  size?: number;
}

/** Grip button that starts a drag from `useDragReorder().handleProps`. */
export function DragHandle({ size = 12, ...props }: DragHandleProps) {
  return (
    <button type="button" className="config-editor-drag-handle" {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
}
