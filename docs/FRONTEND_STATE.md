# Frontend state

Every decision a UI surface makes lives in a **pure reducer**. The component renders state and dispatches events. A thin runner performs any I/O the reducer asks for and dispatches the outcome back as another event. Tests drive the reducer with a sequence of events and assert on the state and the declared effects. They do not render.

A rule in a reducer takes one fast test with no React, no mocks and no timers — the same shape every test in this repo already has. The same rule inside a `useState` + `useEffect` tangle can only be reached by rendering the surface and waiting for effects. A renderer is kept for wiring and presentation only; [Testing](#testing) says which layer gets what.

This is the elaboration of **"State lives in reducers"** in `CODING_STANDARDS.md`. ADR [0004](adr/0004-design-history-holds-no-session-state.md) is the first application: the Edit screen holds its own snapshot rather than a module keeping one.

## Where a reducer lives

`src/features/<feature>/lib/<surface>-reducer.ts`, with no React import and no database access. Its test is `src/features/<feature>/tests/<surface>-reducer.test.ts`. Both stay private to the feature; a component reaches the reducer through the feature's own tree, not through `index.ts`/`react.ts` unless a screen genuinely needs it.

One file per **surface**, not per feature: two screens that do not share a state machine get two reducers.

## The pattern

```
 press / text change / app state / live-query result / timer / promise result
        │  dispatch(event)                     ← a fact: what happened
        ▼
 reducer(state, event) ──► next state ──► render
        │  exec({ type: "commit-edit", … })   ← a command, as data (only when needed)
        ▼
 thin runner ── does the I/O ──► dispatch(outcome event)
```

Start with `useReducer` from React. Most surfaces here need no effect runner at all: `expo-sqlite` writes are synchronous and `useLiveQuery` already pushes read results in. Declare effects as data only when a surface has async work whose order or outcome is a decision.

Do not take a dependency for it. There is no maintained effect-reducer package for React 19; if the need is real, vendor a small hook beside the surface that uses it, with its own tests.

The rules:

1. **One reducer per surface**, exporting `<Surface>State`, `<Surface>Event`, `<Surface>Effect` and `createInitial<Surface>State()`. No React import.
2. **Events are facts, not commands.** An event says what happened outside the reducer; it never says what state to set. A gesture is named after the gesture (`press-delete`, `edit-opened`), something the world reports is past tense (`design-saved`, `save-failed`, `app-backgrounded`). Names are kebab-case. A setter event such as `set-saving`, `set-modal-open` or `UPDATE_PROGRESS` is not allowed, because the caller would already have decided what changes.
3. **Effects are commands, and they are data.** Name them with an imperative verb (`commit-edit`, `archive-designs`) and put everything the handler needs on the effect object. A handler never reaches into props or closures for its input. That is what makes the effect worth asserting on.
4. **The runner is thin.** Each handler makes one call and dispatches the outcome as an event. It contains no `if` about what to do next: that is the reducer's decision, made when it handles the outcome. A handler may return a cleanup function.
5. **The reducer never reads the clock, randomness, dimensions or device state.** Put the value on the event, e.g. `{ type: "edit-closed", now: Date.now() }`. That is how coalescing and timing become deterministic.
6. **Derived rules are selectors**, pure functions of state. Do not copy them into state and do not duplicate them in a component. Presentation-only formatting may stay in render.
7. **A `useEffect` in a component only bridges to the outside world.** It subscribes and dispatches what it hears; it does not set local state and it does not decide anything. `DatabaseProvider` closing the handle on unmount is the shape.

Three situations come up often enough to have a fixed answer:

- **One I/O must finish before the next starts.** Either chain them with an outcome event, or declare one effect and put the order on it as data.
- **A late outcome.** Name what it was for (`designId`) and have the reducer ignore one for a surface that has since moved on.
- **A caller that awaits.** The hook puts a `requestId` on the event, the reducer copies it onto the effect, and the runner settles the promise when the effect is done. The reducer still decides.

## React Native exceptions

The reducer owns decisions, not everything that changes on screen.

- **Reanimated shared values and worklets are not reducer state.** They run off the JS thread; a reducer cannot read or write them. Dispatch an event when a gesture or animation ends and a rule must run.
- **Mid-gesture state is not reducer state.** `react-native-gesture-handler` decides during the gesture; dispatch at the end.
- **Route state belongs to expo-router.** Read it at the edge and pass what a rule needs (`{ type: "edit-opened", designId }`).
- **Live data belongs to `useLiveQuery`.** Do not copy rows into reducer state. The reducer holds the surface's decisions — the draft, the step, the error — not the catalog.
- **One modal, one field.** Two `is…Open` booleans that cannot both be true are one piece of state: `openModal: "rename" | "copy" | null`.

## When plain `useState` is fine

A component may keep `useState` when **all** of these are true:

- The state is the component's own presentation: a text draft, a hover, a popover that is open.
- No other state is updated in step with it, and no rule decides how it changes beyond "set it to what the user just typed or clicked".
- No effect writes to it.

`NewDesignForm` keeps `name` and `error` this way: two fields, no effect, below the guard's limit. It is not the model to extend — a third coupled field, or an async create, turns it into a reducer.

## Testing

Two layers. The rule is which layer gets what.

**Decisions go to the reducer, directly.** No renderer, no mocks.

- A test drives a scenario ("a failed save can be retried"), not one `case` at a time.
- Until a reducer declares effects, call it directly: `expect(editReducer(state, event)).toEqual({ … })`. No helper is needed.
- With effects, add `ReducerTester` at `src/shared/testing/reducer-tester.ts`: `send(event)`, `getState()`, `getEffects()`. Assert the whole effect list with `toEqual`, so an extra effect fails the test too. The effects are the reducer's output, not internal collaborators.
- Effect handlers are glue and normally have no test. If one grows complicated, extract the pure part and test that.

**Wiring and presentation go to React Native Testing Library** (`@testing-library/react-native`), when a test genuinely has to render. v14 is the React 19 line: `render`, `renderHook`, `fireEvent`, `userEvent` and `act` are async and must be awaited.

- It covers what a reducer test cannot reach: a gesture dispatches the right event, a state looks the way the user sees it (accessible name, disabled, visible), a bridge subscribes and unsubscribes, a screen navigates.
- It does not cover a transition. If a scenario can be driven by sending events to the reducer, it belongs there. Awaiting `act` flushes every pending update, so a rendered test cannot see transient states a reducer test can.
- `renderHook` is for bridge hooks (rule 7): assert that a subscription dispatches what it hears and cleans up on unmount.
- Prefer `getByRole`, then accessible name and placeholder; `getByTestId` is the last resort. Prefer `userEvent` over `fireEvent`. The Jest matchers extend on import; no setup file is needed.
- Do not mock the port or the driver. `@/features/database/testing` opens a real temporary database. A screen test that needs the catalogue supplies it through the database provider — add that injection seam with the first such test, rather than mocking a provider.
- A reducer test replaces the component test for the same rule. Do not check one rule in both layers.

## The guard

Not built yet. When it is, it is `scripts/check-frontend-state.mjs` — a script beside `check-feature-boundaries.mjs`, not an ESLint rule, because it counts per file and cross-references a file's own setters. It scans `src/features/**` and `src/app/**`, skips `tests/`, runs in pre-commit and CI, and fails a file with:

| Guard               | Fails when a file has…                                                               | Why                                                                  |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `use-state`         | more than **4** `useState` calls                                                     | past a few independent toggles, they are one state machine in pieces |
| `effect-sets-state` | more than **1** `useEffect`/`useLayoutEffect` that references the file's own setters | a transition happening outside any reducer                           |

Calibrate the limits against this repo when it lands; the numbers above are the starting point, not gospel. An allowlist entry may only go down. Do not add entries.
