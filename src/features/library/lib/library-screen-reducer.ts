/** How far a pressed tap target dips: slight, never a pop. */
export const PRESS_HIGHLIGHT_SCALE = 0.98;

/** The beat the highlight holds before the tap's route opens. */
export const PRESS_HIGHLIGHT_HOLD_MS = 120;

/**
 * The Library's two decisions: a touch-down dips one card and a completed tap
 * holds that highlight for a beat before the Design opens, and the FAB's
 * actions are open or shut. The press phase is the whole rule, so the
 * highlight stays up while the held beat runs and a tap that lands meanwhile
 * opens nothing a second time. The actions are a speed-dial: their own tap
 * toggles them, and every exit from the screen. a tap outside, choosing an
 * action, leaving the route, or backgrounding the app, shuts them.
 */
export type LibraryScreenState = {
  press: { designId: string; phase: "down" | "holding" } | null;
  actionsOpen: boolean;
};

/** What the Owner did — facts naming the Design or the exit that happened. */
export type LibraryScreenEvent =
  | { type: "press-started"; designId: string }
  | { type: "press-released"; designId: string }
  | { type: "card-tapped"; designId: string }
  | { type: "hold-elapsed"; designId: string }
  | { type: "fab-tapped" }
  | { type: "fab-dismissed" }
  | { type: "fab-action-taken"; action: "add" }
  | { type: "fab-action-taken"; action: "theme"; scheme: "light" | "dark" }
  | { type: "library-left" }
  | { type: "app-backgrounded" };

/** The work the surface declares: a beat, a route, or the chosen theme. */
export type LibraryScreenEffect =
  | { type: "hold-cards-open"; designId: string }
  | { type: "open-design"; designId: string }
  | { type: "open-create-screen" }
  | { type: "apply-theme"; scheme: "light" | "dark" };

/** What one Library event settled and the work it asked for. */
export type LibraryScreenResult = {
  state: LibraryScreenState;
  effects: LibraryScreenEffect[];
};

/** Nothing is pressed and the actions are shut until the Owner acts. */
export function createInitialLibraryScreenState(): LibraryScreenState {
  return { press: null, actionsOpen: false };
}

/** Shut the actions if they were open; an already-shut menu asks for nothing. */
function closeActions(state: LibraryScreenState): LibraryScreenResult {
  return state.actionsOpen
    ? { state: { ...state, actionsOpen: false }, effects: [] }
    : { state, effects: [] };
}

/**
 * Who opens when. A touch-down dips the card; a lift before the tap ends it. A
 * tap raises the highlight into its held beat and declares that beat; while
 * that beat holds, another tap is ignored. The beat's elapsing clears the
 * highlight and declares the route, but a late beat for a Design the surface
 * has moved on from opens nothing. A lift during the beat is not the end of
 * it: the highlight stays up until the beat elapses.
 *
 * The FAB's actions follow one rule: any exit shuts them, and choosing one of
 * them declares the work it opens. An action taken after the menu has already
 * shut asks for nothing, so a double tap cannot open two routes or apply the
 * theme twice.
 */
export function libraryScreenReducer(
  state: LibraryScreenState,
  event: LibraryScreenEvent,
): LibraryScreenResult {
  switch (event.type) {
    case "press-started":
      return {
        state: { ...state, press: { designId: event.designId, phase: "down" } },
        effects: [],
      };

    case "press-released":
      return state.press?.designId === event.designId && state.press.phase === "down"
        ? { state: { ...state, press: null }, effects: [] }
        : { state, effects: [] };

    case "card-tapped":
      return state.press?.phase === "holding"
        ? { state, effects: [] }
        : {
            state: { ...state, press: { designId: event.designId, phase: "holding" } },
            effects: [{ type: "hold-cards-open", designId: event.designId }],
          };

    case "hold-elapsed":
      return state.press?.designId === event.designId && state.press.phase === "holding"
        ? {
            state: { ...state, press: null },
            effects: [{ type: "open-design", designId: event.designId }],
          }
        : { state, effects: [] };

    case "fab-tapped":
      return { state: { ...state, actionsOpen: !state.actionsOpen }, effects: [] };

    case "fab-dismissed":
    case "library-left":
    case "app-backgrounded":
      return closeActions(state);

    case "fab-action-taken":
      if (!state.actionsOpen) return { state, effects: [] };

      return {
        state: { ...state, actionsOpen: false },
        effects:
          event.action === "add"
            ? [{ type: "open-create-screen" }]
            : [{ type: "apply-theme", scheme: event.scheme }],
      };
  }
}
