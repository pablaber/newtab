import type { AppConfig, ModuleConfig, LinkConfig, BackgroundConfig, SubcommandConfig } from '../types/config.ts';

export const mockLink: LinkConfig = {
  url: 'https://github.com',
  label: 'GitHub',
};

export const mockLinkWithIcon: LinkConfig = {
  url: 'https://example.com',
  label: 'Example',
  icon: 'https://example.com/icon.png',
};

export const mockHiddenLink: LinkConfig = {
  url: 'https://hidden.com',
  label: 'Hidden Link',
  hidden: true,
};

export const mockModule: ModuleConfig = {
  type: 'links',
  title: 'Favorites',
  links: [
    { url: 'https://github.com', label: 'GitHub' },
    { url: 'https://news.ycombinator.com', label: 'Hacker News' },
    { url: 'https://youtube.com', label: 'YouTube' },
  ],
};

export const mockModuleWithHiddenLinks: ModuleConfig = {
  type: 'links',
  title: 'Tools',
  links: [
    { url: 'https://google.com', label: 'Google' },
    { url: 'https://hidden.com', label: 'Hidden', hidden: true },
  ],
};

export const mockHiddenModule: ModuleConfig = {
  type: 'links',
  title: 'Hidden Section',
  hidden: true,
  links: [
    { url: 'https://secret.com', label: 'Secret' },
  ],
};

export const mockBackground: BackgroundConfig = {
  color: '#1a1a2e',
  opacity: 0.4,
};

export const mockBackgroundWithGradient: BackgroundConfig = {
  color: '#1a1a2e',
  opacity: 0.4,
  gradient: {
    enabled: true,
    color2: '#2b82fb',
    direction: 'down',
  },
};

export const mockBackgroundWithImage: BackgroundConfig = {
  imageUrl: 'https://example.com/bg.jpg',
  color: '#1a1a2e',
  opacity: 0.4,
};

export const mockConfig: AppConfig = {
  version: 1,
  background: mockBackground,
  search: {
    enabled: true,
    placeholder: 'Filter links...',
  },
  modules: [mockModule, mockModuleWithHiddenLinks],
};

export const mockConfigNoSearch: AppConfig = {
  version: 1,
  modules: [mockModule],
};

export const mockSubcommands: SubcommandConfig[] = [
  {
    name: 'GitHub Project',
    trigger: 'ghp',
    items: [
      { label: 'newtab', url: 'https://github.com/pablaber/newtab' },
      { label: 'website', url: 'https://github.com/pablaber/website' },
    ],
    freeform: {
      fields: [{ name: 'repo' }],
      urlTemplate: 'https://github.com/pablaber/{repo}',
    },
  },
  {
    name: 'GitHub',
    trigger: 'gh',
    items: [],
    freeform: {
      fields: [{ name: 'account' }, { name: 'repo' }],
      urlTemplate: 'https://github.com/{account}/{repo}',
    },
  },
];
