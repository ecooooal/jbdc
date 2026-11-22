import { eq } from "drizzle-orm";
import type { Database } from "@/features/database";
import { settings } from "@/features/database";

/** The Library's three card densities: one list row, two tiles, or four tiles. */
export const CARD_DENSITIES = [1, 2, 4] as const;

export type CardDensity = (typeof CARD_DENSITIES)[number];

/** Two per row until the owner chooses otherwise. */
export const DEFAULT_CARD_DENSITY: CardDensity = 2;

/** The one `settings` key card density occupies. */
const CARD_DENSITY_KEY = "library.cardDensity";

export type Settings = {
  /** The owner's chosen Library density, or the default when none is stored. */
  cardDensity(): CardDensity;
  /** Stores the choice, replacing any previous one. */
  setCardDensity(density: CardDensity): void;
};

/**
 * The density a stored or control value names, or null when it names none.
 * Settings falls back to the default; the control simply ignores it.
 */
export function cardDensityFrom(value: string | undefined): CardDensity | null {
  const density = Number(value);

  return CARD_DENSITIES.find((candidate) => candidate === density) ?? null;
}

/**
 * Device-local preferences, stored one row per preference in `settings`.
 * A new instance reads the row, so a choice made in an earlier launch is
 * already in effect when the Library opens.
 */
export function createSettings(database: Database): Settings {
  return {
    cardDensity() {
      const row = database.db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, CARD_DENSITY_KEY))
        .get();

      return cardDensityFrom(row?.value) ?? DEFAULT_CARD_DENSITY;
    },

    setCardDensity(density) {
      const value = String(density);

      database.db
        .insert(settings)
        .values({ key: CARD_DENSITY_KEY, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
    },
  };
}
