import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { categories, DESIGN_STATUSES, designs } from '@/features/database';
import { createTempDatabase, openTestDatabase } from '@/features/database/testing';

describe('database migrations', () => {
  let database: ReturnType<typeof createTempDatabase>['database'];
  let dispose: () => void;

  beforeAll(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterAll(() => {
    dispose();
  });

  test('creates all five tables and the three indexes', () => {
    const objects = database.db.all<{ type: string; name: string }>(
      sql`select type, name from sqlite_master
          where type in ('table', 'index')
            and name not like 'sqlite_%'
            and name not like '__drizzle%'`
    );

    expect(objects.filter((object) => object.type === 'table').map((object) => object.name)).toEqual(
      expect.arrayContaining([
        'categories',
        'collections',
        'design_events',
        'designs',
        'settings',
      ])
    );
    expect(objects.filter((object) => object.type === 'index').map((object) => object.name)).toEqual(
      expect.arrayContaining([
        'design_events_design_id_created_at_idx',
        'designs_collection_id_idx',
        'designs_status_idx',
      ])
    );
  });

  test('accepts the full status vocabulary and rejects anything else', () => {
    for (const [index, status] of DESIGN_STATUSES.entries()) {
      expect(() =>
        database.db
          .insert(designs)
          .values({
            id: `status-${status}`,
            name: `A ${status} design`,
            status,
            searchText: status,
            createdAt: index,
            updatedAt: index,
          })
          .run()
      ).not.toThrow();
    }

    expect(() =>
      database.db
        .insert(designs)
        .values({
          id: 'status-prototype',
          name: 'A prototype design',
          // `prototype` is an image kind, never a status.
          status: 'prototype' as never,
          searchText: 'prototype',
          createdAt: 0,
          updatedAt: 0,
        })
        .run()
    ).toThrow();
  });

  test('runs work in transactions and rolls back on failure', () => {
    const countDesigns = () =>
      database.db.get<{ count: number }>(sql`select count(*) as count from designs`)?.count ?? 0;
    const before = countDesigns();

    database.transaction((tx) => {
      tx.insert(designs)
        .values({
          id: 'tx-commit',
          name: 'Committed',
          status: 'concept',
          searchText: 'committed',
          createdAt: 0,
          updatedAt: 0,
        })
        .run();
    });

    expect(countDesigns()).toBe(before + 1);

    expect(() =>
      database.transaction((tx) => {
        tx.insert(designs)
          .values({
            id: 'tx-rollback',
            name: 'Rolled back',
            status: 'concept',
            searchText: 'rolled back',
            createdAt: 0,
            updatedAt: 0,
          })
          .run();
        throw new Error('abandon this edit');
      })
    ).toThrow('abandon this edit');

    expect(countDesigns()).toBe(before + 1);
  });

  test('running the seed twice leaves one copy of each category and keeps a rename', () => {
    const directory = mkdtempSync(join(tmpdir(), 'jbdc-relaunch-'));
    const file = join(directory, 'jbdc.db');

    try {
      const first = openTestDatabase(file);
      expect(first.db.select().from(categories).all()).toHaveLength(7);

      first.db
        .update(categories)
        .set({ name: 'Dresses' })
        .where(eq(categories.seedKey, 'dress'))
        .run();
      first.close();

      // A relaunch: migrations and the seed run again on the same file.
      const second = openTestDatabase(file);
      const seeded = second.db.select().from(categories).all();
      second.close();

      expect(seeded).toHaveLength(7);
      expect(seeded.find((category) => category.seedKey === 'dress')?.name).toBe('Dresses');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
