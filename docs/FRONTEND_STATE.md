# Frontend state

Every decision a UI surface makes lives in a **pure reducer**. The component renders state and dispatches events. A thin runner performs any I/O the reducer asks for and dispatches the outcome back as another event. Tests drive the reducer with a sequence of events and assert on the state and the declared effects. They do not render.

A rule in a reducer takes one fast test with no React, no mocks and no timers — the same shape every test in this repo already has. The same rule inside a `useState` + `useEffect` tangle can only be reached by rendering the surface and waiting for effects. A renderer is kept for wiring and presentation only; [Testing](#testing) says which layer gets what.

This is the elaboration of **"State lives in reducers"** in `CODING_STANDARDS.md`. ADR [0004](adr/0004-design-history-holds-no-session-state.md) is the first application: the Edit screen holds its own snapshot rather than a module keeping one.

## Where a reducer lives

`src/features/<feature>/lib/<surface>-reducer.ts`, with no React import and no database access. Its tests live in `src/features/<feature>/tests/`; a surface with several concerns splits them into sibling files that share one fixtures module. The fixtures live in `tests/<surface>-fixtures.ts`; jest's `testMatch` (`*.test.ts(x)`) leaves it out of the suite. Both stay private to the feature; a component reaches the reducer through the feature's own tree, not through `index.ts`/`react.ts` unless a screen genuinely needs it.

One file per **surface**, not per feature: two screens that do not share a state machine get two reducers. A surface may delegate a slice to a private reducer in the same folder — Edit's add-Material-use editor is one — but the surface still exports one state, event, and effect type. The slice is not a second surface.

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

Start with `useReducer` from React. Most surfaces here need no effect runner at all: `expo-sqlite` writes are synchronous and `useLiveRead` already pushes read results in. Declare effects as data only when a surface has async work whose order or outcome is a decision.

Do not take a dependency for it. There is no maintained effect-reducer package for React 19: one shared runner at `src/shared/hooks/use-reducer-runner.ts` runs the visit, the gallery and the image detail, each keeping only a perform body. It carries its own test.

The rules:

1. **One reducer per surface**, exporting `<Surface>State`, `<Surface>Event`, `<Surface>Effect` and `createInitial<Surface>State()`. No React import.
2. **Events are facts, not commands.** An event says what happened outside the reducer; it never says what state to set. A gesture is named after the gesture (`press-delete`, `edit-opened`), something the world reports is past tense (`design-saved`, `save-failed`, `app-backgrounded`). Names are kebab-case. A setter event such as `set-saving`, `set-modal-open` or `UPDATE_PROGRESS` is not allowed, because the caller would already have decided what changes. A fact is never forged to borrow a neighbouring rule: when a caller needs a slice's rule for its own field, the slice exports the rule as a pure helper (`clearInlineRefusal` is the shape), not a fact to re-dispatch.
3. **Effects are commands, and they are data.** Name them with an imperative verb (`commit-edit`, `archive-designs`) and put everything the handler needs on the effect object. A handler never reaches into props or closures for its input. That is what makes the effect worth asserting on.
4. **The runner is thin.** Each handler makes one call and dispatches the outcome as an event. It contains no `if` about what to do next: that is the reducer's decision, made when it handles the outcome. The shared runner calls `perform` and discards what it returns without awaiting it, so a perform body may be async for its own I/O; the only result the runner acts on is the events that body dispatches.
5. **The reducer never reads the clock, randomness, dimensions or device state.** Put the value on the event, e.g. `{ type: "edit-closed", now: Date.now() }`. That is how coalescing and timing become deterministic.
6. **Derived rules are selectors**, pure functions of state. Do not copy them into state and do not duplicate them in a component. Presentation-only formatting may stay in render.
7. **A `useEffect` in a component only bridges to the outside world.** It subscribes and dispatches what it hears; it does not set local state and it does not decide anything. `DatabaseProvider` closing the handle on unmount is the shape.

Three situations come up often enough to have a fixed answer:

- **One I/O must finish before the next starts.** Either chain them with an outcome event, or declare one effect and put the order on it as data.
- **A late outcome.** Name what it was for (`designId`) and have the reducer ignore one for a surface that has since moved on.
- **A caller that awaits.** There is no request id and no promise to settle: `dispatch` returns nothing and the runner discards a performer's return without awaiting it, so `await send(…)` awaits nothing at all. Work finishes by the outcome events its perform body dispatches when its answer is a decision — the gallery awaits the picker and the write path inside one perform body and folds each answer back as an event — and the surface reads the state those events produced on a later render. Not every answer is a decision: the image detail's reclassify and the visit's record dispatch nothing. The reducer still decides what the outcome means.

## React Native exceptions

The reducer owns decisions, not everything that changes on screen.

- **Reanimated shared values and worklets are not reducer state.** They run off the JS thread; a reducer cannot read or write them. Dispatch an event when a gesture or animation ends and a rule must run.
- **Mid-gesture state is not reducer state.** `react-native-gesture-handler` decides during the gesture; dispatch at the end.
- **Route state belongs to expo-router.** Read it at the edge and pass what a rule needs (`{ type: "edit-opened", designId }`).
- **Live data belongs to `useLiveRead`.** Do not copy catalog rows into reducer state. A selection is an id; derive the selected row and its label from the live list. An entry created inline is selected by id immediately, and its label appears when the live read observes the insert. A read declares every table it watches, joins included (ADR-0005). The reducer holds the surface's decisions — the draft, the step, the error — not the catalog.
- **A visit keeps the row its own writes stored.** Edit's record is not a catalog copy: it is seeded once, advanced only by the visit's own write outcomes, and answers what a refused write restores, what a blank name falls back to, and what the one Event that visit records has as its after-state.
- **One panel, one field.** Editors that cannot both be open are one piece of state in the surface reducer: `panel: { kind: "add"; editor: AddState } | { kind: "edit"; stored: StoredRow; ...draft } | null`. A component boolean beside a reducer-owned editor is a split; move both into the union.

## When plain `useState` is fine

A **flush exit** is any way a draft can leave the screen: blur, Done/close, a tab change, app backgrounding, or unmount. A draft whose only flush exit is blur can stay local; a draft that must survive any other exit belongs to the surface reducer, because that exit has to declare the write.

A component may keep `useState` when **all** of these are true:

- The state is the component's own presentation: a text draft, a hover, a popover that is open.
- No other state is updated in step with it, and no rule decides how it changes beyond "set it to what the user just typed or clicked".
- No effect writes to it.
- Its only flush exit is blur.

A single text draft and its refusal are fine this way: one field, no effect. `NewDesignForm` crossed that line when its Category and Collection pickers arrived — name, two optional selections, and an inline draft now change together — so its decisions live in `new-design-form-reducer.ts`. A third coupled field turns a `useState` form into a reducer.

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
- `renderHook` is for bridge hooks (rule 7) and the shared runner: assert that a subscription dispatches what it hears and cleans up on unmount, and that the runner performs declared effects against the state the previous event produced — the effect loop exists only in React, so it is tested by rendering.
- Prefer `getByRole`, then accessible name and placeholder; `getByTestId` is the last resort. Prefer `userEvent` over `fireEvent`. The Jest matchers extend on import; no setup file is needed.
- Do not mock the port or the driver. `@/features/database/testing` opens a real temporary database and supplies `createSyncSubscribe()`, whose `notify(table)` fires the listeners watching that table. A screen test that needs the catalogue passes a temp `database` and that adapter's `subscribe` to `DatabaseProvider` — the seam is the provider, not a mock of it. `src/features/designs/tests/new-design-form.test.tsx` is the first such test.
- A native `Select` does not open in Jest. `@rn-primitives/select` positions its portal from the trigger's `measure` callback, which RNTL never fires. Test the picker's rule at the records/reducer seam; to cover trigger wiring, fire the `onValueChange` handler directly.
- A reducer test replaces the component test for the same rule. Do not check one rule in both layers.

## The guard

`scripts/check-frontend-state.mjs`, beside
`check-feature-boundaries.mjs`, scans `src/features/**` and `src/app/**`, skips
`tests/`, and runs in pre-commit and CI. It fails a file with:

| Guard               | Fails when a file has…                                                               | Why                                                                  |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `use-state`         | more than **4** `useState` calls                                                     | past a few independent toggles, they are one state machine in pieces |
| `effect-sets-state` | more than **1** `useEffect`/`useLayoutEffect` that references the file's own setters | a transition happening outside any reducer                           |
| `reducer-purity`    | a `*-reducer.ts` that imports React, a driver, or any module reaching `src/features/database` | the reducer must not smuggle in the catalog                          |

The limits are calibrated against this repo. There is no allowlist: a file
that trips `use-state` or `effect-sets-state` is split into a reducer, and a
reducer that trips `reducer-purity` drops the dependency.

`scripts/check-test-size.mjs` caps a `*.test.ts(x)` file at **600** lines. A
test file is the unit an agent opens to work one concern, so a file that
outgrows the cap is split by concern into siblings sharing one fixtures module.
The largest test file now is 580 lines, so the cap holds without an allowlist.
It runs in `pnpm check`, pre-commit, and CI.
