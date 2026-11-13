import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Where a design stands. The whole vocabulary exists from migration 1. */
export const DESIGN_STATUSES = [
  'concept',
  'in_development',
  'approved',
  'produced',
  'rejected',
  'archived',
] as const;

export type DesignStatus = (typeof DESIGN_STATUSES)[number];

/** The kinds of thing an append-only History entry can record. */
export const DESIGN_EVENT_KINDS = ['status_change', 'decision', 'edit', 'note'] as const;

export type DesignEventKind = (typeof DESIGN_EVENT_KINDS)[number];

const sqlList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(', '));

const timestamp = (name: string) => integer(name, { mode: 'number' });

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Set only on seeded rows, so a seed never undoes an owner's rename. */
  seedKey: text('seed_key'),
  createdAt: timestamp('created_at').notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  year: integer('year', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const designs = sqliteTable(
  'designs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id').references(() => categories.id),
    collectionId: text('collection_id').references(() => collections.id),
    status: text('status', { enum: DESIGN_STATUSES }).notNull(),
    /** Lowercased name, description, category and collection, rebuilt on every write. */
    searchText: text('search_text').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('designs_status_idx').on(table.status),
    index('designs_collection_id_idx').on(table.collectionId),
    check('designs_status_check', sql`${table.status} in (${sqlList(DESIGN_STATUSES)})`),
  ]
);

export const designEvents = sqliteTable(
  'design_events',
  {
    id: text('id').primaryKey(),
    designId: text('design_id')
      .notNull()
      .references(() => designs.id),
    kind: text('kind', { enum: DESIGN_EVENT_KINDS }).notNull(),
    reason: text('reason'),
    potentialImprovements: text('potential_improvements'),
    /** JSON: field name -> { from, to }. Null when the event is not an edit. */
    diff: text('diff'),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [index('design_events_design_id_created_at_idx').on(table.designId, table.createdAt)]
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
