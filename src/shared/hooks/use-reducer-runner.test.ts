import { act, renderHook } from "@testing-library/react-native";
import { useReducerRunner } from "./use-reducer-runner";

type State = { count: number };
type Event = { type: "increment" } | { type: "reported" };
type Effect = { type: "report" };

/**
 * The runner's contract: one event produces the state its reducer settles on
 * and every effect it declared is performed. A report's outcome is sent back
 * through the runner, so the test sees whether the next event read the state
 * the previous one produced.
 */
function reducer(state: State, event: Event): { state: State; effects: Effect[] } {
  switch (event.type) {
    case "increment":
      return { state: { count: state.count + 1 }, effects: [{ type: "report" }] };
    case "reported":
      return { state: { count: state.count + 10 }, effects: [] };
  }
}

function runner(perform: (effect: Effect, dispatch: (event: Event) => void) => void) {
  return renderHook(() => useReducerRunner(reducer, () => ({ count: 0 }), perform));
}

test("renders the state the reducer settles on", async () => {
  const { result } = await runner(() => {});

  expect(result.current[0]).toEqual({ count: 0 });

  await act(async () => result.current[1]({ type: "increment" }));

  expect(result.current[0]).toEqual({ count: 1 });
});

test("performs each declared effect, dispatching outcomes against the state just produced", async () => {
  const performed: Effect[] = [];
  const { result } = await runner((effect, dispatch) => {
    performed.push(effect);
    dispatch({ type: "reported" });
  });

  await act(async () => result.current[1]({ type: "increment" }));

  expect(performed).toEqual([{ type: "report" }]);
  // The reported outcome added ten to the incremented state, not to the state
  // the render held before the event. An effect loop that read stale state
  // would settle on ten.
  expect(result.current[0]).toEqual({ count: 11 });
});

test("performs effects that answer after a promise", async () => {
  const { result } = await runner(async (_effect, dispatch) => {
    await Promise.resolve();
    dispatch({ type: "reported" });
  });

  await act(async () => result.current[1]({ type: "increment" }));

  expect(result.current[0]).toEqual({ count: 11 });
});
