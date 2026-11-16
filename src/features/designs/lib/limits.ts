/** A name is trimmed and must survive trimming; this is the only cap. */
export const DESIGN_NAME_MAX_LENGTH = 120;

/**
 * The one name rule, shared by the forms and the write path. A name is
 * trimmed before it is judged, so whitespace alone is empty.
 */
export function designNameProblem(name: string): 'empty' | 'too_long' | null {
  const trimmed = name.trim();

  if (trimmed.length === 0) return 'empty';
  if (trimmed.length > DESIGN_NAME_MAX_LENGTH) return 'too_long';

  return null;
}
