import {
  hexLuminance,
  backgroundLuminanceRange,
  resolveForeground,
  foregroundCssVars,
} from './foreground.ts';
import type { BackgroundConfig } from '../types/config.ts';

describe('hexLuminance', () => {
  it('computes luminance for the extremes', () => {
    expect(hexLuminance('#000000')).toBe(0);
    expect(hexLuminance('#ffffff')).toBe(1);
  });

  it('supports shorthand hex', () => {
    expect(hexLuminance('#fff')).toBe(hexLuminance('#ffffff'));
  });

  it('returns null for unparseable values', () => {
    expect(hexLuminance('nope')).toBeNull();
    expect(hexLuminance('')).toBeNull();
    expect(hexLuminance('rgb(0,0,0)')).toBeNull();
  });
});

describe('resolveForeground — explicit override', () => {
  it('forces light foreground regardless of background', () => {
    expect(resolveForeground({ color: '#ffffff', foreground: 'light' })).toBe('light');
  });

  it('forces dark foreground regardless of background', () => {
    expect(resolveForeground({ color: '#000000', foreground: 'dark' })).toBe('dark');
  });

  it('overrides image backgrounds where pixel analysis is unavailable', () => {
    const bg: BackgroundConfig = {
      imageUrl: 'https://example.com/bright.jpg',
      color: '#000000',
      opacity: 0.1,
      foreground: 'dark',
    };
    expect(resolveForeground(bg)).toBe('dark');
  });

  it('treats auto the same as an unset value', () => {
    expect(resolveForeground({ color: '#ffffff', foreground: 'auto' })).toBe('dark');
    expect(resolveForeground({ color: '#ffffff' })).toBe('dark');
  });
});

describe('resolveForeground — solid backgrounds', () => {
  it('picks light foreground on dark colors', () => {
    expect(resolveForeground({ color: '#1a1a2e' })).toBe('light');
    expect(resolveForeground({ color: '#000000' })).toBe('light');
  });

  it('picks dark foreground on light colors', () => {
    expect(resolveForeground({ color: '#ffffff' })).toBe('dark');
    expect(resolveForeground({ color: '#f0e6d2' })).toBe('dark');
  });

  it('falls back to the default dark background when unset or invalid', () => {
    expect(resolveForeground(undefined)).toBe('light');
    expect(resolveForeground({ color: 'not-a-color' })).toBe('light');
  });

  it('ignores gradient colors when the gradient is disabled', () => {
    const bg: BackgroundConfig = {
      color: '#000000',
      gradient: { enabled: false, color2: '#ffffff', direction: 'down' },
    };
    expect(backgroundLuminanceRange(bg)).toEqual({ min: 0, max: 0 });
  });
});

describe('resolveForeground — gradients', () => {
  it('spans both stops instead of averaging them', () => {
    const bg: BackgroundConfig = {
      color: '#000000',
      gradient: { enabled: true, color2: '#dddddd', direction: 'down' },
    };
    const range = backgroundLuminanceRange(bg);
    expect(range.min).toBe(0);
    expect(range.max).toBeCloseTo(hexLuminance('#dddddd')!, 10);
    // Average luminance would exceed the light threshold and pick dark text,
    // which is unreadable over the black stop.
    expect(resolveForeground(bg)).toBe('light');
  });

  it('picks dark foreground only when both stops are light', () => {
    const bg: BackgroundConfig = {
      color: '#ffffff',
      gradient: { enabled: true, color2: '#e8e8e8', direction: 'right' },
    };
    expect(resolveForeground(bg)).toBe('dark');
  });

  it('is independent of stop order', () => {
    const a: BackgroundConfig = {
      color: '#000000',
      gradient: { enabled: true, color2: '#dddddd', direction: 'down' },
    };
    const b: BackgroundConfig = {
      color: '#dddddd',
      gradient: { enabled: true, color2: '#000000', direction: 'down' },
    };
    expect(resolveForeground(a)).toBe(resolveForeground(b));
  });

  it('ignores an unparseable second stop', () => {
    const bg: BackgroundConfig = {
      color: '#ffffff',
      gradient: { enabled: true, color2: 'oops', direction: 'down' },
    };
    expect(backgroundLuminanceRange(bg)).toEqual({ min: 1, max: 1 });
  });
});

describe('resolveForeground — images and overlay opacity', () => {
  it('widens the luminance range as overlay opacity drops', () => {
    const overlay = { imageUrl: 'https://example.com/bg.jpg', color: '#000000' };
    const opaque = backgroundLuminanceRange({ ...overlay, opacity: 1 });
    const sheer = backgroundLuminanceRange({ ...overlay, opacity: 0.2 });

    expect(opaque).toEqual({ min: 0, max: 0 });
    expect(sheer.max).toBeCloseTo(0.8, 10);
  });

  it('trusts the overlay color when it is nearly opaque', () => {
    const bg: BackgroundConfig = {
      imageUrl: 'https://example.com/bg.jpg',
      color: '#ffffff',
      opacity: 0.95,
    };
    expect(resolveForeground(bg)).toBe('dark');
  });

  it('does not treat a mid-tone overlay as if the image were not there', () => {
    const solid: BackgroundConfig = { color: '#666666' };
    const overImage: BackgroundConfig = {
      imageUrl: 'https://example.com/bg.jpg',
      color: '#666666',
      opacity: 0.5,
    };
    expect(resolveForeground(solid)).toBe('light');
    expect(resolveForeground(overImage)).toBe('dark');
  });

  it('uses the default overlay opacity when unset', () => {
    const bg: BackgroundConfig = { imageUrl: 'https://example.com/bg.jpg', color: '#000000' };
    expect(backgroundLuminanceRange(bg)).toEqual(
      backgroundLuminanceRange({ ...bg, opacity: 0.4 }),
    );
  });

  it('clamps out-of-range opacity values', () => {
    const bg: BackgroundConfig = { imageUrl: 'https://example.com/bg.jpg', color: '#000000' };
    expect(backgroundLuminanceRange({ ...bg, opacity: 5 })).toEqual({ min: 0, max: 0 });
    expect(backgroundLuminanceRange({ ...bg, opacity: -2 })).toEqual({ min: 0, max: 1 });
  });

  it('ignores an empty image url', () => {
    const bg: BackgroundConfig = { imageUrl: '   ', color: '#ffffff', opacity: 0.1 };
    expect(backgroundLuminanceRange(bg)).toEqual({ min: 1, max: 1 });
  });

  it('combines a gradient overlay with the image range', () => {
    const bg: BackgroundConfig = {
      imageUrl: 'https://example.com/bg.jpg',
      color: '#000000',
      opacity: 0.5,
      gradient: { enabled: true, color2: '#ffffff', direction: 'down' },
    };
    expect(backgroundLuminanceRange(bg)).toEqual({ min: 0, max: 1 });
  });
});

describe('foregroundCssVars', () => {
  it('maps light foreground to white text and a dark dropdown surface', () => {
    expect(foregroundCssVars('light')).toEqual({ fg: '255, 255, 255', dropdownBg: '30, 30, 30' });
  });

  it('maps dark foreground to black text and a light dropdown surface', () => {
    expect(foregroundCssVars('dark')).toEqual({ fg: '0, 0, 0', dropdownBg: '240, 240, 240' });
  });
});
