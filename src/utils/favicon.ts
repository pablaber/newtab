export function getFaviconUrl(url: string): string {
  try {
    const pageUrl = new URL(url).href;
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(pageUrl)}&sz=32`;
  } catch {
    return '';
  }
}
