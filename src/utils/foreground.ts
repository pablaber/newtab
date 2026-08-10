import type { BackgroundConfig } from '../types/config.ts';

/** The resolved foreground content color: `light` = white text, `dark` = black text. */
export type ResolvedForeground = 'light' | 'dark';

export const DEFAULT_BACKGROUND_COLOR = '#1a1a2e';
export const DEFAULT_OVERLAY_OPACITY = 0.4;

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/** WCAG relative luminance for a hex color, or `null` if the value is not parseable. */
export function hexLuminance(hex: string): number | null {
  const value = hex.trim();
  const short = HEX_SHORT.exec(value);
  const long = HEX_LONG.exec(value);
  if (!short && !long) return null;

  const parts = short
    ? [short[1] + short[1], short[2] + short[2], short[3] + short[3]]
    : [long![1], long![2], long![3]];

  const [r, g, b] = parts.map((part) => parseInt(part, 16) / 255);
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between white and a background of the given luminance. */
function contrastWithWhite(luminance: number): number {
  return 1.05 / (luminance + 0.05);
}

/** WCAG contrast ratio between black and a background of the given luminance. */
function contrastWithBlack(luminance: number): number {
  return (luminance + 0.05) / 0.05;
}

/**
 * The range of luminance the foreground has to stay readable against.
 *
 * Gradients span both stops rather than collapsing to an average, and images
 * (whose pixels we cannot reliably sample — remote images are usually blocked
 * by CORS) are treated as covering the full luminance range behind the overlay,
 * so the range widens as overlay opacity drops.
 */
export function backgroundLuminanceRange(
  bg: BackgroundConfig | undefined,
): { min: number; max: number } {
  const base = hexLuminance(bg?.color ?? DEFAULT_BACKGROUND_COLOR)
    ?? hexLuminance(DEFAULT_BACKGROUND_COLOR)!;

  const stops = [base];
  if (bg?.gradient?.enabled && bg.gradient.color2) {
    const second = hexLuminance(bg.gradient.color2);
    if (second !== null) stops.push(second);
  }

  let min = Math.min(...stops);
  let max = Math.max(...stops);

  if (bg?.imageUrl && bg.imageUrl.trim() !== '') {
    const rawOpacity = bg.opacity ?? DEFAULT_OVERLAY_OPACITY;
    const opacity = Number.isFinite(rawOpacity)
      ? Math.min(1, Math.max(0, rawOpacity))
      : DEFAULT_OVERLAY_OPACITY;
    // Composite luminance ≈ opacity * overlay + (1 - opacity) * unknown image,
    // with the unknown image spanning [0, 1].
    min = opacity * min;
    max = opacity * max + (1 - opacity);
  }

  return { min, max };
}

/**
 * Resolve the foreground content color for a background.
 *
 * An explicit `light`/`dark` setting always wins. In `auto` mode we pick the
 * color with the better worst-case contrast across the background's luminance
 * range, which reduces to the usual luminance threshold for solid colors.
 */
export function resolveForeground(
  bg: BackgroundConfig | undefined,
): ResolvedForeground {
  if (bg?.foreground === 'light' || bg?.foreground === 'dark') {
    return bg.foreground;
  }

  const { min, max } = backgroundLuminanceRange(bg);
  return contrastWithWhite(max) >= contrastWithBlack(min) ? 'light' : 'dark';
}

/** CSS custom property values that follow the resolved foreground. */
export function foregroundCssVars(foreground: ResolvedForeground): {
  fg: string;
  dropdownBg: string;
} {
  return foreground === 'light'
    ? { fg: '255, 255, 255', dropdownBg: '30, 30, 30' }
    : { fg: '0, 0, 0', dropdownBg: '240, 240, 240' };
}
