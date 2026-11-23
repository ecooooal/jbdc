/** How far a pressed tap target dips: slight, never a pop. */
export const PRESS_HIGHLIGHT_SCALE = 0.98;

/** The beat the highlight holds before the tap's route opens. */
export const PRESS_HIGHLIGHT_HOLD_MS = 120;

/**
 * The Library's press decision: a touch-down dips one card, and a completed tap
 * holds that highlight for a beat before the Design opens. The phase is the
 * whole rule, so the highlight stays up while the held beat runs and a tap
 * that lands meanwhile opens nothing a second time.
 */
export type LibraryScreenState = {
  press: { designId: string; phase: "down" | "holding" } | null;
};

/** What the Owner did to a card — four facts naming the Design it happened to. */
export type LibraryScreenEvent =
  | { type: "press-started"; designId: string }
  | { type: "press-released"; designId: string }
  | { type: "card-tapped"; designId: string }
  | { type: "hold-elapsed"; designId: string };

/** The work the press declares: hold the cards' highlight, then open one Design. */
export type LibraryScreenEffect =
  { type: "hold-cards-open"; designId: string } | { type: "open-design"; designId: string };

/** What one Library event settled and the work it asked for. */
export type LibraryScreenResult = {
  state: LibraryScreenState;
  effects: LibraryScreenEffect[];
};

/** Nothing is pressed until a touch lands on a card. */
export function createInitialLibraryScreenState(): LibraryScreenState {
  return { press: null };
}

/**
 * Who opens when. A touch-down dips the card; a lift before the tap ends it. A
 * tap raises the highlight into its held beat and declares that beat; while
 * that beat holds, another tap is ignored. The beat's elapsing clears the
 * highlight and declares the route, but a late beat for a Design the surface
 * has moved on from opens nothing. A lift during the beat is not the end of
 * it: the highlight stays up until the beat elapses.
 */
export function libraryScreenReducer(
  state: LibraryScreenState,
  event: LibraryScreenEvent,
): LibraryScreenResult {
  switch (event.type) {
    case "press-started":
      return { state: { press: { designId: event.designId, phase: "down" } }, effects: [] };

    case "press-released":
      return state.press?.designId === event.designId && state.press.phase === "down"
        ? { state: createInitialLibraryScreenState(), effects: [] }
        : { state, effects: [] };

    case "card-tapped":
      return state.press?.phase === "holding"
        ? { state, effects: [] }
        : {
            state: { press: { designId: event.designId, phase: "holding" } },
            effects: [{ type: "hold-cards-open", designId: event.designId }],
          };

    case "hold-elapsed":
      return state.press?.designId === event.designId && state.press.phase === "holding"
        ? {
            state: createInitialLibraryScreenState(),
            effects: [{ type: "open-design", designId: event.designId }],
          }
        : { state, effects: [] };
  }
}
