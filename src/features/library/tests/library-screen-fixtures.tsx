import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, type createTempDatabase } from "@/features/database/testing";
import { changeStatus, createDesign } from "@/features/designs";
import { LibraryScreen } from "@/features/library/react";
import { ThemeChoiceProvider } from "@/features/settings/react";
import { createCollection } from "@/features/taxonomy";

/** The database one Library suite works against. */
export type LibraryDatabase = ReturnType<typeof createTempDatabase>["database"];

export const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The sync subscribe one suite hands the provider, so a write lands at once. */
export const live = createSyncSubscribe();

/** The Library screen inside the provider seams a real launch supplies. */
export async function renderLibraryScreen(database: LibraryDatabase) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <ThemeChoiceProvider>
          <LibraryScreen />
        </ThemeChoiceProvider>
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

/** Three designs with no Collection, freshest first as the default read orders them. */
export function seedStream(database: LibraryDatabase) {
  createDesign(database, { name: "Freshest dress" }, 3000);
  createDesign(database, { name: "Middle skirt" }, 2000);
  createDesign(database, { name: "Oldest coat" }, 1000);
}

/** Two Collections, four designs in Spring, one in none; Spring is freshest, then Autumn. */
export function seedCollections(database: LibraryDatabase) {
  const spring = createCollection(database, { name: "Spring" }, 1);
  const autumn = createCollection(database, { name: "Autumn" }, 2);

  createDesign(database, { name: "Autumn coat", collectionId: autumn.id }, 1000);
  createDesign(database, { name: "Spring scarf", collectionId: spring.id }, 500);
  createDesign(database, { name: "Spring skirt", collectionId: spring.id }, 2000);
  createDesign(database, { name: "No season dress" }, 3000);
  createDesign(database, { name: "Spring blouse", collectionId: spring.id }, 4000);
  createDesign(database, { name: "Spring dress", collectionId: spring.id }, 1500);
}

/** Rejects a design through the Status write, with its reason and timestamp. */
export function rejectDesign(
  database: LibraryDatabase,
  name: string,
  reason: string | null,
  now: number,
  collectionId?: string,
) {
  const design = createDesign(database, { name, collectionId }, now - 1);

  changeStatus(
    database,
    design.id,
    { status: "rejected", reason, potentialImprovements: null },
    now,
  );

  return design.id;
}
