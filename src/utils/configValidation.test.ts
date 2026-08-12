import { configsEqual, validateConfig } from './configValidation.ts';
import { mockConfig } from '../test/fixtures.ts';

describe('config validation', () => {
  it('accepts a complete app config', () => {
    expect(validateConfig(mockConfig)).toBe(true);
  });

  it.each([
    null,
    { version: '1', modules: [] },
    { version: 1, modules: 'links' },
    { version: 1, modules: [{ type: 'notes', title: 'Notes', links: [] }] },
    { version: 1, modules: [{ type: 'links', title: 'Links', links: [{ url: 3, label: 'Bad' }] }] },
    { version: 1, modules: [], background: { foreground: 'blue' } },
    { version: 1, modules: [], search: { enabled: 'yes' } },
  ])('rejects malformed config %#', (value) => {
    expect(validateConfig(value)).toBe(false);
  });

  it('compares configs structurally instead of relying on object key order', () => {
    const sameWithReorderedTopLevel = {
      modules: mockConfig.modules,
      search: mockConfig.search,
      background: mockConfig.background,
      version: mockConfig.version,
    };
    expect(configsEqual(mockConfig, sameWithReorderedTopLevel)).toBe(true);
  });
});
