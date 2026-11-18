import { createReducerTester, type EffectfulReducer } from './reducer-tester';

type State = { count: number };
type Event = { type: 'tick' };
type Effect = { type: 'logged'; count: number };

const reducer: EffectfulReducer<State, Event, Effect> = (state) => ({
  state: { count: state.count + 1 },
  effects: [{ type: 'logged', count: state.count + 1 }],
});

test('an earlier getEffects list does not grow with later events', () => {
  const tester = createReducerTester(reducer, { count: 0 });

  tester.send({ type: 'tick' });
  const first = tester.getEffects();
  tester.send({ type: 'tick' });

  expect(first).toEqual([{ type: 'logged', count: 1 }]);
  expect(tester.getEffects()).toEqual([
    { type: 'logged', count: 1 },
    { type: 'logged', count: 2 },
  ]);
});

test('mutating the returned list leaves the tester untouched', () => {
  const tester = createReducerTester(reducer, { count: 0 });

  tester.send({ type: 'tick' });
  tester.getEffects().push({ type: 'logged', count: 99 });

  expect(tester.getEffects()).toEqual([{ type: 'logged', count: 1 }]);
});
