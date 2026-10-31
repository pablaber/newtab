import { moveItem, movedIndex } from './useDragReorder.ts';

describe('moveItem', () => {
  it('moves an item forward and backward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const items = ['a', 'b'];
    moveItem(items, 0, 1);
    expect(items).toEqual(['a', 'b']);
  });
});

describe('movedIndex', () => {
  it('matches the positions produced by moveItem', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    for (let from = 0; from < items.length; from++) {
      for (let to = 0; to < items.length; to++) {
        const moved = moveItem(items, from, to);
        items.forEach((item, index) => {
          expect(moved[movedIndex(index, from, to)]).toBe(item);
        });
      }
    }
  });
});
