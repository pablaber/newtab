import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

// Distance from the viewport edge (px) where dragging starts auto-scrolling
const EDGE_SCROLL_ZONE = 48;
const EDGE_SCROLL_SPEED = 12;

/** Move the item at `from` to `to`, shifting the items in between. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The new position of `index` after the item at `from` moves to `to`. */
export function movedIndex(index: number, from: number, to: number): number {
  if (index === from) return to;
  if (from < to && index > from && index <= to) return index - 1;
  if (to < from && index >= to && index < from) return index + 1;
  return index;
}

// Index the dragged item should drop at, given its current center and the
// resting centers of every item in the list
function dropIndex(centers: number[], from: number, center: number): number {
  let to = from;
  for (let i = from + 1; i < centers.length && center > centers[i]; i++) to = i;
  for (let i = from - 1; i >= 0 && center < centers[i]; i--) to = i;
  return to;
}

interface DragState {
  list: string;
  from: number;
  to: number;
  /** Pointer travel (page px) since the drag started */
  offset: number;
  /** How far siblings slide to make room: dragged item height plus the gap */
  shift: number;
}

interface DragOrigin {
  pageY: number;
  clientY: number;
  centers: number[];
}

const itemKey = (list: string, index: number) => `${list}:${index}`;

/**
 * Pointer-driven drag-to-reorder for one or more vertical lists, identified by
 * a string key. Items follow the pointer while siblings slide out of the way;
 * the reorder is committed on release. Focused handles also accept ArrowUp /
 * ArrowDown so reordering stays keyboard accessible.
 */
export function useDragReorder(onReorder: (list: string, from: number, to: number) => void) {
  const items = useRef(new Map<string, HTMLElement>());
  const handles = useRef(new Map<string, HTMLElement>());
  const origin = useRef<DragOrigin | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const listLength = (list: string) => {
    let count = 0;
    while (items.current.has(itemKey(list, count))) count++;
    return count;
  };

  // Keyboard moves re-render handles at new indices; keep focus on the moved one
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    handles.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  const trackPointer = useEffectEvent((clientY: number) => {
    const current = dragRef.current;
    const start = origin.current;
    if (!current || !start) return;
    start.clientY = clientY;
    const offset = clientY + window.scrollY - start.pageY;
    const to = dropIndex(start.centers, current.from, start.centers[current.from] + offset);
    updateDrag({ ...current, offset, to });
  });

  const finishDrag = useEffectEvent((commit: boolean) => {
    const current = dragRef.current;
    updateDrag(null);
    origin.current = null;
    if (commit && current && current.to !== current.from) {
      onReorder(current.list, current.from, current.to);
    }
  });

  const dragging = drag !== null;

  useEffect(() => {
    if (!dragging) return;

    let frame = 0;
    const edgeScroll = () => {
      const clientY = origin.current?.clientY;
      if (clientY !== undefined) {
        if (clientY < EDGE_SCROLL_ZONE) window.scrollBy(0, -EDGE_SCROLL_SPEED);
        else if (clientY > window.innerHeight - EDGE_SCROLL_ZONE) window.scrollBy(0, EDGE_SCROLL_SPEED);
      }
      frame = requestAnimationFrame(edgeScroll);
    };
    frame = requestAnimationFrame(edgeScroll);

    const handleMove = (event: globalThis.PointerEvent) => trackPointer(event.clientY);
    const handleScroll = () => {
      if (origin.current) trackPointer(origin.current.clientY);
    };
    const handleUp = () => finishDrag(true);
    const handleCancel = () => finishDrag(false);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') finishDrag(false);
    };

    document.body.classList.add('is-reordering');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove('is-reordering');
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragging]);

  const startDrag = (list: string, index: number, event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    const rects = Array.from({ length: listLength(list) }, (_, i) =>
      items.current.get(itemKey(list, i))!.getBoundingClientRect(),
    );
    if (rects.length < 2) return;
    event.preventDefault();

    const rect = rects[index];
    const gap = index + 1 < rects.length
      ? rects[index + 1].top - rect.bottom
      : rect.top - rects[index - 1].bottom;
    origin.current = {
      pageY: event.clientY + window.scrollY,
      clientY: event.clientY,
      centers: rects.map((r) => r.top + window.scrollY + r.height / 2),
    };
    updateDrag({ list, from: index, to: index, offset: 0, shift: rect.height + gap });
  };

  const moveWithKeyboard = (list: string, index: number, event: KeyboardEvent<HTMLElement>) => {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (step === 0 || dragRef.current) return;
    event.preventDefault();
    const to = index + step;
    if (to < 0 || to >= listLength(list)) return;
    pendingFocus.current = itemKey(list, to);
    onReorder(list, index, to);
  };

  const register = (map: Map<string, HTMLElement>, key: string) => (el: HTMLElement | null) => {
    if (!el) return;
    map.set(key, el);
    return () => {
      if (map.get(key) === el) map.delete(key);
    };
  };

  /** Props for the element that moves: the whole row or card. */
  const itemProps = (list: string, index: number): { ref: (el: HTMLElement | null) => void; style?: CSSProperties } => {
    const ref = register(items.current, itemKey(list, index));
    if (!drag || drag.list !== list) return { ref };
    if (index === drag.from) {
      return { ref, style: { transform: `translateY(${drag.offset}px)`, position: 'relative', zIndex: 2 } };
    }
    const target = movedIndex(index, drag.from, drag.to);
    const shift = target === index ? 0 : (target - index) * drag.shift;
    return { ref, style: { transform: `translateY(${shift}px)`, transition: 'transform 150ms' } };
  };

  /** Props for the grip button that starts a drag. */
  const handleProps = (list: string, index: number) => ({
    ref: register(handles.current, itemKey(list, index)),
    onPointerDown: (event: PointerEvent<HTMLElement>) => startDrag(list, index, event),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => moveWithKeyboard(list, index, event),
    'aria-keyshortcuts': 'ArrowUp ArrowDown',
  });

  const isDragging = (list: string, index: number) => drag?.list === list && drag.from === index;

  return { itemProps, handleProps, isDragging };
}
