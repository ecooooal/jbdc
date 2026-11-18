/**
 * The one panel a form can open to create an entry by name without leaving it.
 * No entry kind lives here: a caller keeps whatever else its picker needs and
 * holds this slice as one field of its own state.
 */
export type InlineCreationState = {
  open: boolean;
  name: string;
  error: string | null;
};

/** What happened to the panel — five facts, and no knowledge of what is created. */
export type InlineCreationEvent =
  | { type: 'opened' }
  | { type: 'closed' }
  | { type: 'name-changed'; name: string }
  | { type: 'created'; id: string }
  | { type: 'refused'; message: string };

export function createInitialInlineCreationState(): InlineCreationState {
  return { open: false, name: '', error: null };
}

/** The error a create's own rule throws; any other error is a bug, not an answer. */
type Refusal = abstract new (...args: never[]) => Error;

/**
 * The one create adapter. A caller supplies how to create and which errors are
 * refusals; the adapter turns the answer into the fact the reducer handles. Any
 * other error is rethrown, so a bug is never shown as a refusal.
 */
export function inlineCreationResult<Created extends { id: string }>(
  create: () => Created,
  ...refusals: Refusal[]
): InlineCreationEvent {
  try {
    return { type: 'created', id: create().id };
  } catch (caught) {
    if (refusals.some((refusal) => caught instanceof refusal)) {
      return { type: 'refused', message: (caught as Error).message };
    }

    throw caught;
  }
}

/**
 * A refusal records its message only: the name the owner typed and the open
 * panel stay, so the refusal can be read and corrected in place. Opening or
 * completing a create drops the draft; changing the name clears the message.
 */
export function inlineCreationReducer(
  state: InlineCreationState,
  event: InlineCreationEvent
): InlineCreationState {
  switch (event.type) {
    case 'opened':
      return { open: true, name: '', error: null };
    case 'closed':
    case 'created':
      return createInitialInlineCreationState();
    case 'name-changed':
      return { ...state, name: event.name, error: null };
    case 'refused':
      return { ...state, error: event.message };
  }
}
