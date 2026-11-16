/** A description is trimmed; whitespace alone means no description. */
export function normalizeDescription(raw: string | null | undefined): string | null {
  const description = raw?.trim();

  return description ? description : null;
}
