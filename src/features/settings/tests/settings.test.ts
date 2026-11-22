import { settings as settingsTable } from "@/features/database";
import { createTempDatabase, openTestDatabase } from "@/features/database/testing";
import { CARD_DENSITIES, cardDensityFrom } from "@/features/settings";
import { createSettings, DEFAULT_CARD_DENSITY } from "../lib/settings";

describe("settings", () => {
  let database: ReturnType<typeof createTempDatabase>["database"];
  let dispose: () => void;

  beforeEach(() => {
    ({ database, dispose } = createTempDatabase());
  });

  afterEach(() => {
    dispose();
  });

  test("opens at density 2 when the owner has not chosen", () => {
    expect(DEFAULT_CARD_DENSITY).toBe(2);
    expect(createSettings(database).cardDensity()).toBe(2);
  });

  test("a new Settings instance reads the chosen density", () => {
    createSettings(database).setCardDensity(4);

    expect(createSettings(database).cardDensity()).toBe(4);
  });

  test("changing the choice replaces the previous one", () => {
    const settings = createSettings(database);

    settings.setCardDensity(4);
    settings.setCardDensity(1);

    expect(createSettings(database).cardDensity()).toBe(1);
  });

  test("keeps the choice in one settings row", () => {
    const settings = createSettings(database);

    settings.setCardDensity(4);
    settings.setCardDensity(1);

    expect(database.db.select().from(settingsTable).all()).toHaveLength(1);
  });

  test("a value that names no density is not a choice", () => {
    expect(cardDensityFrom(undefined)).toBeNull();
    expect(cardDensityFrom("3")).toBeNull();

    for (const density of CARD_DENSITIES) {
      expect(cardDensityFrom(String(density))).toBe(density);
    }
  });

  test.each(CARD_DENSITIES)("remembers density %i across launches", (density) => {
    const { database: first, path, dispose: disposeFirst } = createTempDatabase();

    try {
      createSettings(first).setCardDensity(density);
      first.close();

      const reopened = openTestDatabase(path);

      try {
        expect(createSettings(reopened).cardDensity()).toBe(density);
      } finally {
        reopened.close();
      }
    } finally {
      disposeFirst();
    }
  });
});
