/**
 * Drives an effect-declaring reducer without React. `send` applies one event,
 * `getState` reads the state after it, and `getEffects` returns every effect
 * declared so far, in order — so a test asserts the whole list and an extra
 * effect fails too (docs/FRONTEND_STATE.md).
 */
export type ReducerResult<State, Effect> = {
  state: State;
  effects: Effect[];
};

export type EffectfulReducer<State, Event, Effect> = (
  state: State,
  event: Event,
) => ReducerResult<State, Effect>;

export function createReducerTester<State, Event, Effect>(
  reducer: EffectfulReducer<State, Event, Effect>,
  initial: State,
): {
  send(event: Event): void;
  getState(): State;
  getEffects(): Effect[];
} {
  let state = initial;
  const effects: Effect[] = [];

  return {
    send(event) {
      const result = reducer(state, event);
      state = result.state;
      effects.push(...result.effects);
    },
    getState() {
      return state;
    },
    getEffects() {
      // A snapshot, so a test that keeps an earlier list cannot compare it to
      // itself after sending more events.
      return [...effects];
    },
  };
}
