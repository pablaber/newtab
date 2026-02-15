import type { AppConfig, ModuleConfig, LinkConfig, BackgroundConfig } from '../types/config.ts';

export const mockLink: LinkConfig = {
  url: 'https://github.com',
  label: 'GitHub',
};

export const mockLinkWithIcon: LinkConfig = {
  url: 'https://example.com',
  label: 'Example',
  icon: 'https://example.com/icon.png',
};

export const mockLinkWithIconUrl: LinkConfig = {
  url: 'https://example.com',
  label: 'Custom Icon URL',
  iconUrl: 'https://example.com/custom-icon.png',
};

export const mockLinkWithEmoji: LinkConfig = {
  url: 'https://example.com',
  label: 'Emoji Link',
  iconEmoji: '🚀',
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
