import { configsEqual, validateConfig } from './configValidation.ts';
import { mockConfig } from '../test/fixtures.ts';
import seedConfig from '../../public/config.json';

describe('config validation', () => {
  it('accepts a complete app config', () => {
    expect(validateConfig(mockConfig)).toBe(true);
  });

  it('accepts the bundled seed config', () => {
    expect(validateConfig(seedConfig)).toBe(true);
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

  it('accepts backward-compatible configs without subcommands and complete scoped commands', () => {
    expect(validateConfig({ version: 1, modules: [] })).toBe(true);
    expect(validateConfig({
      version: 1,
      modules: [],
      subcommands: [{
        name: 'GitHub',
        trigger: 'gh',
        items: [{ label: 'newtab', url: 'https://github.com/pablaber/newtab', icon: '/icon.png' }],
        freeform: {
          fields: [{ name: 'account' }, { name: 'repo' }],
          urlTemplate: 'https://github.com/{account}/{repo}',
        },
      }],
    })).toBe(true);
  });

  it.each([
    [{ name: 'Empty', trigger: 'empty', items: [] }],
    [
      { name: 'One', trigger: 'GH', items: [{ label: 'a', url: 'https://example.com' }] },
      { name: 'Two', trigger: 'gh', items: [{ label: 'b', url: 'https://example.com' }] },
    ],
    [{ name: 'Bad trigger', trigger: 'not valid', items: [{ label: 'a', url: 'https://example.com' }] }],
    [{ name: 'Long trigger', trigger: 'a'.repeat(21), items: [{ label: 'a', url: 'https://example.com' }] }],
    [{ name: 'Bad item', trigger: 'bad', items: [{ label: '', url: 'ftp://example.com' }] }],
  ])('rejects malformed or non-actionable subcommands %#', (subcommands) => {
    expect(validateConfig({ version: 1, modules: [], subcommands })).toBe(false);
  });

  it.each([
    { fields: [], urlTemplate: 'https://example.com' },
    { fields: [{ name: 'bad field' }], urlTemplate: 'https://example.com/{bad field}' },
    { fields: [{ name: 'repo' }, { name: 'REPO' }], urlTemplate: 'https://example.com/{repo}' },
    { fields: [{ name: 'repo' }], urlTemplate: 'https://example.com/{unknown}' },
    { fields: [{ name: 'repo' }, { name: 'account' }], urlTemplate: 'https://example.com/{repo}' },
    { fields: [{ name: 'repo' }], urlTemplate: 'ftp://example.com/{repo}' },
    { fields: [{ name: 'repo' }], urlTemplate: 'https://example.com/{repo' },
  ])('rejects invalid freeform definitions %#', (freeform) => {
    expect(validateConfig({
      version: 1,
      modules: [],
      subcommands: [{ name: 'GitHub', trigger: 'gh', items: [], freeform }],
    })).toBe(false);
  });
});
