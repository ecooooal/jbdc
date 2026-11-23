import { settings as settingsTable } from "@/features/database";
import { createTempDatabase, openTestDatabase } from "@/features/database/testing";
import { CARD_DENSITIES, cardDensityFrom } from "@/features/settings";
import {
  createSettings,
  DEFAULT_CARD_DENSITY,
  DEFAULT_GROUPING,
  DEFAULT_THEME_CHOICE,
  GROUPINGS,
  groupingFrom,
  resolveThemeScheme,
  THEME_CHOICES,
  themeChoiceFrom,
} from "../lib/settings";

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
    createSettings(database).setCardDensity(1);

    expect(createSettings(database).cardDensity()).toBe(1);
  });

  test("changing the choice replaces the previous one", () => {
    const settings = createSettings(database);

    settings.setCardDensity(1);
    settings.setCardDensity(2);

    expect(createSettings(database).cardDensity()).toBe(2);
  });

  test("keeps the choice in one settings row", () => {
    const settings = createSettings(database);

    settings.setCardDensity(1);
    settings.setCardDensity(2);

    expect(database.db.select().from(settingsTable).all()).toHaveLength(1);
  });

  test("a value that names no density is not a choice", () => {
    expect(cardDensityFrom(undefined)).toBeNull();
    expect(cardDensityFrom("3")).toBeNull();
    expect(cardDensityFrom("4")).toBeNull();

    for (const density of CARD_DENSITIES) {
      expect(cardDensityFrom(String(density))).toBe(density);
    }
  });

  test("a stored four-up density falls back to two", () => {
    createSettings(database).setCardDensity(2);

    database.db.update(settingsTable).set({ value: "4" }).run();

    expect(createSettings(database).cardDensity()).toBe(2);
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

  test("opens at Per design when the owner has not chosen a grouping", () => {
    expect(DEFAULT_GROUPING).toBe("per-design");
    expect(createSettings(database).grouping()).toBe("per-design");
  });

  test("a new Settings instance reads the chosen grouping", () => {
    createSettings(database).setGrouping("per-collection");

    expect(createSettings(database).grouping()).toBe("per-collection");
  });

  test("changing the grouping replaces the previous one", () => {
    const settings = createSettings(database);

    settings.setGrouping("per-collection");
    settings.setGrouping("per-design");

    expect(createSettings(database).grouping()).toBe("per-design");
  });

  test("a value that names no grouping is not a choice", () => {
    expect(groupingFrom(undefined)).toBeNull();
    expect(groupingFrom("by-colour")).toBeNull();

    for (const grouping of GROUPINGS) {
      expect(groupingFrom(grouping)).toBe(grouping);
    }
  });

  test("the default grouping stands when the stored value names none", () => {
    createSettings(database).setGrouping("per-collection");

    database.db.update(settingsTable).set({ value: "by-colour" }).run();

    expect(createSettings(database).grouping()).toBe("per-design");
  });

  test.each(GROUPINGS)("remembers grouping %s across launches", (grouping) => {
    const { database: first, path, dispose: disposeFirst } = createTempDatabase();

    try {
      createSettings(first).setGrouping(grouping);
      first.close();

      const reopened = openTestDatabase(path);

      try {
        expect(createSettings(reopened).grouping()).toBe(grouping);
      } finally {
        reopened.close();
      }
    } finally {
      disposeFirst();
    }
  });

  test("opens following the system when the owner has not chosen a theme", () => {
    expect(DEFAULT_THEME_CHOICE).toBe("follow-system");
    expect(createSettings(database).theme()).toBe("follow-system");
  });

  test("a new Settings instance reads the chosen theme", () => {
    createSettings(database).setTheme("dark");

    expect(createSettings(database).theme()).toBe("dark");
  });

  test("changing the theme replaces the previous one", () => {
    const settings = createSettings(database);

    settings.setTheme("light");
    settings.setTheme("dark");

    expect(createSettings(database).theme()).toBe("dark");
  });

  test("a value that names no theme is not a choice", () => {
    expect(themeChoiceFrom(undefined)).toBeNull();
    expect(themeChoiceFrom("sepia")).toBeNull();

    for (const theme of THEME_CHOICES) {
      expect(themeChoiceFrom(theme)).toBe(theme);
    }
  });

  test("the default theme stands when the stored value names none", () => {
    createSettings(database).setTheme("dark");

    database.db.update(settingsTable).set({ value: "sepia" }).run();

    expect(createSettings(database).theme()).toBe("follow-system");
  });

  test("follow-system resolves to the system's scheme and a choice stands", () => {
    expect(resolveThemeScheme("follow-system", "dark")).toBe("dark");
    expect(resolveThemeScheme("follow-system", "light")).toBe("light");
    expect(resolveThemeScheme("follow-system", null)).toBe("light");
    expect(resolveThemeScheme("light", "dark")).toBe("light");
    expect(resolveThemeScheme("dark", "light")).toBe("dark");
  });

  test("grouping and theme keep their own values", () => {
    const settings = createSettings(database);

    settings.setGrouping("per-collection");
    settings.setTheme("light");

    const reopened = createSettings(database);

    expect(reopened.grouping()).toBe("per-collection");
    expect(reopened.theme()).toBe("light");
  });

  test.each(THEME_CHOICES)("remembers theme %s across launches", (theme) => {
    const { database: first, path, dispose: disposeFirst } = createTempDatabase();

    try {
      createSettings(first).setTheme(theme);
      first.close();

      const reopened = openTestDatabase(path);

      try {
        expect(createSettings(reopened).theme()).toBe(theme);
      } finally {
        reopened.close();
      }
    } finally {
      disposeFirst();
    }
  });
});
