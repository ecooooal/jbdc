import { useCallback, useRef, useState } from "react";

/** What one event settles and the work it asks the runner for. */
export type RunnerResult<State, Effect> = {
  state: State;
  effects: readonly Effect[];
};

/**
 * The work one effect asks for, and the door outcomes go back through. A
 * surface performs the I/O here and sends what it answered back as an event;
 * the runner owns when the loop runs, not what each effect does.
 */
export type EffectPerformer<Effect, Event> = (
  effect: Effect,
  dispatch: (event: Event) => void,
) => void;

/**
 * The one runner behind every surface that declares effects
 * (docs/FRONTEND_STATE.md). It keeps the state, the latest ref, the
 * state-then-latest ordering, and the effect loop once, so a surface keeps
 * only its perform body.
 *
 * `dispatch` reads the latest state rather than the one the last render
 * painted: a performer may send an outcome back synchronously — the visit's
 * writes do — and the next event must see the state the previous event
 * produced. Effects are performed in declared order after the state is
 * recorded, so a synchronous outcome already reads the settled state.
 */
export function useReducerRunner<State, Event, Effect>(
  reducer: (state: State, event: Event) => RunnerResult<State, Effect>,
  createInitialState: () => State,
  perform: EffectPerformer<Effect, Event>,
): readonly [State, (event: Event) => void] {
  const [state, setState] = useState(createInitialState);
  const latest = useRef(state);

  const dispatch = useCallback(
    // The named function is the recursion: a performer that sends an outcome
    // back calls this same dispatch, and the latest ref is already current.
    function dispatch(event: Event) {
      const result = reducer(latest.current, event);

      setState(result.state);
      latest.current = result.state;

      for (const effect of result.effects) perform(effect, dispatch);
    },
    [perform, reducer],
  );

  return [state, dispatch];
}
