import { eq } from 'drizzle-orm';
import type { DatabaseHandle } from './port';
import { categories } from '../schema';

export type SeedCategory = {
  /** Stable id, so the same seeded row is reused on every install. */
  id: string;
  seedKey: string;
  name: string;
};

/**
 * The common garment types the owner starts with. `seed_key` is what the seed
 * guards on, so renaming a category in the app does not bring the old name back.
 */
export const SEED_CATEGORIES: readonly SeedCategory[] = [
  { id: 'b513ae60-d452-40ad-9e42-12121f5dfc2a', seedKey: 'dress', name: 'Dress' },
  { id: '2e967224-d1d1-4107-8d8a-b5448d2bb354', seedKey: 'blouse', name: 'Blouse' },
  { id: 'c5560071-6e17-449d-a9de-0e0217591cdf', seedKey: 'skirt', name: 'Skirt' },
  { id: 'c8d8825a-6970-4070-a614-3a82116aa475', seedKey: 'pants', name: 'Pants' },
  { id: '089827c6-a809-4cf9-9432-a4b46cef2276', seedKey: 'outerwear', name: 'Outerwear' },
  { id: '6ebd24a6-8e14-4ae1-b6a7-237233bce93a', seedKey: 'two-piece-set', name: 'Two-piece set' },
  { id: '2f338714-ff01-476d-b6ae-331e9bca0593', seedKey: 'other', name: 'Other' },
];

/**
 * Inserts the default categories if they are missing. Safe to run on every
 * launch: a category whose `seed_key` already exists is left alone, so an
 * owner's rename survives.
 */
export function applySeed(db: DatabaseHandle, now: number = Date.now()): void {
  db.transaction((tx) => {
    for (const seed of SEED_CATEGORIES) {
      const existing = tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.seedKey, seed.seedKey))
        .get();

      if (existing) continue;

      tx.insert(categories)
        .values({
          id: seed.id,
          name: seed.name,
          seedKey: seed.seedKey,
          createdAt: now,
        })
        .run();
    }
  });
}
