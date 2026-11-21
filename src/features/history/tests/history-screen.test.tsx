import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign, type DesignFields } from "@/features/designs";
import { recordEdit } from "@/features/history";
import { HistoryScreen } from "@/features/history/react";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

/** The fields of a Design before an edit; overrides say what changed. */
function fields(overrides: Partial<DesignFields> = {}): DesignFields {
  return {
    name: "Silk slip dress",
    description: null,
    categoryId: null,
    collectionId: null,
    silhouette: null,
    neckline: null,
    sleeveType: null,
    garmentDetails: null,
    sizeRange: null,
    measurements: null,
    constructionNotes: null,
    concept: null,
    mood: null,
    inspiration: null,
    intendedFeeling: null,
    audience: null,
    styling: null,
    palette: null,
    ...overrides,
  };
}

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
});

afterEach(() => {
  dispose();
});

async function renderHistory(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <HistoryScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

test("renders a field-edit Event as a card with its sections and timestamp", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  recordEdit(
    database,
    design.id,
    {
      before: fields(),
      after: fields({ name: "Wool coat", silhouette: "Relaxed A-line" }),
    },
    Date.UTC(2025, 0, 2, 3, 4),
  );

  await renderHistory(design.id);

  expect(screen.getByText("History")).toBeTruthy();
  expect(screen.getByTestId("history-section-identity")).toBeTruthy();
  expect(screen.getByTestId("history-section-specification")).toBeTruthy();
  expect(screen.getByText(/2025/)).toBeTruthy();
});

test("a design with no Events says so plainly", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, 10);

  await renderHistory(design.id);

  expect(screen.getByText("Nothing has changed yet.")).toBeTruthy();
});
