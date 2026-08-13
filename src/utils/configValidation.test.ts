import { configsEqual, migrateConfig, parseConfig, validateConfig } from './configValidation.ts';
import { mockConfig, mockLink } from '../test/fixtures.ts';
import type { AppConfig } from '../types/config.ts';
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

describe('config migration', () => {
  const legacyConfig = {
    version: 1,
    modules: [
      { type: 'links', title: 'Favorites', columns: 3, links: [mockLink] },
      { type: 'links', title: 'Tools', columns: 2, links: [] },
    ],
  };

  it('still accepts configs that contain the removed columns field', () => {
    expect(validateConfig(legacyConfig)).toBe(true);
  });

  it('drops the removed columns field from every module', () => {
    const migrated = migrateConfig(legacyConfig as unknown as AppConfig);

    for (const module of migrated.modules) {
      expect(module).not.toHaveProperty('columns');
    }
    expect(migrated.modules.map((module) => module.title)).toEqual(['Favorites', 'Tools']);
    expect(migrated.modules[0].links).toEqual([mockLink]);
  });

  it('returns the same reference when there is nothing to migrate', () => {
    expect(migrateConfig(mockConfig)).toBe(mockConfig);
  });

  it('does not mutate the config it migrates', () => {
    const original = structuredClone(legacyConfig);
    migrateConfig(legacyConfig as unknown as AppConfig);
    expect(legacyConfig).toEqual(original);
  });

  it('parses and migrates in one step, rejecting invalid values', () => {
    const parsed = parseConfig(legacyConfig);
    expect(parsed?.modules[0]).not.toHaveProperty('columns');
    expect(parseConfig({ version: '1', modules: [] })).toBeNull();
  });

  it('keeps the bundled seed config free of removed fields', () => {
    expect(migrateConfig(seedConfig as AppConfig)).toBe(seedConfig);
  });
});
