const LABEL_WEIGHT = 3;
const SECTION_WEIGHT = 2;
const URL_WEIGHT = 1;

/**
 * Strips non-alphanumeric characters and lowercases for fuzzy comparison.
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Scores how well a query matches a text string.
 * Returns 0 for no match, higher values for better matches.
 * Exact match > prefix match > contains match (earlier position is better).
 *
 * Tries both a plain lowercase comparison and a normalized (stripped
 * non-alphanumeric) comparison, returning the better of the two. This allows
 * "zwift power" to match "zwiftpower" and vice-versa.
 */
export function scoreMatch(query: string, text: string): number {
  return Math.max(
    scoreMatchInner(query.toLowerCase(), text.toLowerCase()),
    scoreMatchInner(normalize(query), normalize(text)),
  );
}

function scoreMatchInner(q: string, t: string): number {
  if (!q || !t) return 0;

  if (t === q) return 1.0;

  const ratio = q.length / t.length;
  if (t.startsWith(q)) return 0.75 + 0.24 * ratio;

  const idx = t.indexOf(q);
  if (idx >= 0) return 0.4 + 0.3 * ratio - 0.1 * (idx / t.length);

  return 0;
}

/**
 * Computes a weighted relevance score for a single token against a link's fields.
 * Searches label (weight 3), section title (weight 2), and url (weight 1).
 */
function scoreTokenMatch(
  token: string,
  label: string,
  sectionTitle: string,
  url: string,
): number {
  return (
    scoreMatch(token, label) * LABEL_WEIGHT +
    scoreMatch(token, sectionTitle) * SECTION_WEIGHT +
    scoreMatch(token, url) * URL_WEIGHT
  );
}

/**
 * Computes a weighted relevance score for a (possibly multi-word) query
 * against a link's fields. When the query contains multiple words, every word
 * must match at least one field; the overall score is the average of the
 * per-token scores. This allows "Fitness strava" to match a link with label
 * "Strava" inside a section titled "Fitness".
 */
export function scoreLinkMatch(
  query: string,
  label: string,
  sectionTitle: string,
  url: string,
): number {
  const tokens = query.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return 0;

  if (tokens.length === 1) {
    return scoreTokenMatch(tokens[0], label, sectionTitle, url);
  }

  let total = 0;
  for (const token of tokens) {
    const tokenScore = scoreTokenMatch(token, label, sectionTitle, url);
    if (tokenScore === 0) return 0;
    total += tokenScore;
  }

  return total / tokens.length;
}
