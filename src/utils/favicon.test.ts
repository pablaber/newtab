import { getFaviconUrl } from './favicon.ts';

describe('getFaviconUrl', () => {
  it('passes the complete page URL to the favicon service', () => {
    expect(getFaviconUrl('https://my.dart.bank/login')).toBe(
      'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fmy.dart.bank%2Flogin&sz=32',
    );
  });

  it('returns an empty string for an invalid URL', () => {
    expect(getFaviconUrl('not a URL')).toBe('');
  });
});
