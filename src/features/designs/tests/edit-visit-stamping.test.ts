import { stampedEvent } from '../lib/edit-design-reducer';
import { DESIGN_ID, LATER, NOW, visit } from './edit-design-fixtures';

describe('the visit stamps the time on the gestures the screen sends', () => {
  test('a gesture that carries a time arrives with the one the visit saw', () => {
    expect(stampedEvent({ type: 'visit-closed' }, NOW)).toEqual({
      type: 'visit-closed',
      now: NOW,
    });
    expect(stampedEvent({ type: 'row-opened', row: 'name' }, NOW)).toEqual({
      type: 'row-opened',
      row: 'name',
      now: NOW,
    });
    expect(stampedEvent({ type: 'app-backgrounded' }, LATER)).toEqual({
      type: 'app-backgrounded',
      now: LATER,
    });
  });

  test('a gesture that never carried a time gains none', () => {
    expect(
      stampedEvent({ type: 'text-changed', field: 'description', value: 'Bias cut' }, NOW)
    ).toEqual({ type: 'text-changed', field: 'description', value: 'Bias cut' });
    expect(stampedEvent({ type: 'row-closed' }, NOW)).toEqual({ type: 'row-closed' });
  });

  test('a gesture the screen sends declares its write at the stamped time', () => {
    const tester = visit();

    tester.send({ type: 'text-changed', field: 'name', value: 'Wool coat' });
    tester.send(stampedEvent({ type: 'visit-closed' }, LATER));

    expect(tester.getEffects()).toEqual([
      {
        type: 'write-design',
        designId: DESIGN_ID,
        changes: { fields: { name: 'Wool coat' } },
        now: LATER,
      },
    ]);
  });
});
