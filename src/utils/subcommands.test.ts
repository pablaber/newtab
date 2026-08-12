import { isValidFreeform, normalizeSubcommand, resolveSubcommandUrl } from './subcommands.ts';

describe('subcommand helpers', () => {
  it('normalizes names, identifiers, item URLs, and preserves imported icons', () => {
    expect(normalizeSubcommand({
      name: ' GitHub ',
      trigger: ' GH ',
      items: [{ label: ' Newtab ', url: ' github.com/pablaber/newtab ', icon: '/github.svg' }],
      freeform: {
        fields: [{ name: ' Account ' }, { name: ' Repo ' }],
        urlTemplate: ' https://github.com/{account}/{repo} ',
      },
    })).toEqual({
      name: 'GitHub',
      trigger: 'gh',
      items: [{ label: 'Newtab', url: 'https://github.com/pablaber/newtab', icon: '/github.svg' }],
      freeform: {
        fields: [{ name: 'account' }, { name: 'repo' }],
        urlTemplate: 'https://github.com/{account}/{repo}',
      },
    });
  });

  it('encodes each complete value before interpolation', () => {
    expect(resolveSubcommandUrl(
      {
        fields: [{ name: 'account' }, { name: 'repo' }],
        urlTemplate: 'https://github.com/{account}/{repo}',
      },
      { account: 'Patrick Bacon', repo: 'tools/new tab' },
    )).toBe('https://github.com/Patrick%20Bacon/tools%2Fnew%20tab');
  });

  it('requires complete placeholder coverage', () => {
    expect(isValidFreeform({
      fields: [{ name: 'account' }, { name: 'repo' }],
      urlTemplate: 'https://github.com/{account}/{repo}',
    })).toBe(true);
    expect(isValidFreeform({
      fields: [{ name: 'account' }, { name: 'repo' }],
      urlTemplate: 'https://github.com/{account}',
    })).toBe(false);
  });
});
