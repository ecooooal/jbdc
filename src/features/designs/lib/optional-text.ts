/** Optional text is trimmed; whitespace alone means no value at all. */
export function normalizeOptionalText(raw: string | null | undefined): string | null {
  const text = raw?.trim();

  return text ? text : null;
}
