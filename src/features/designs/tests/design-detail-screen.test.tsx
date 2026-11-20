import { act, render, screen, userEvent } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { categories, materials } from "@/features/database";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign, writeDesign } from "@/features/designs";
import { DesignDetailScreen } from "@/features/designs/react";
import { createMaterial } from "@/features/materials";
import { createCategory } from "@/features/taxonomy";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

/** Seeds a recorded use through the visit's one write path. */
function addMaterialUse(
  database: ReturnType<typeof createTempDatabase>["database"],
  designId: string,
  input: { materialId: string; colour: string; role: "main" | "secondary" | "other" },
  now?: number,
) {
  writeDesign(database, designId, { uses: [{ kind: "add", input }] }, now);
}

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  jest.clearAllMocks();
});

afterEach(() => {
  dispose();
});

async function renderDetail(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <DesignDetailScreen designId={designId} />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

test("Detail opens that Design's History", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  await userEvent.press(screen.getByRole("button", { name: "History" }));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/designs/[id]/history",
    params: { id: design.id },
  });
});

test("renaming the Design's Category re-reads Detail", async () => {
  const category = createCategory(database, { name: "Dress" });
  const design = createDesign(database, {
    name: "Silk slip dress",
    categoryId: category.id,
  });

  await renderDetail(design.id);

  expect(screen.getByText("Dress · No collection")).toBeTruthy();

  database.db
    .update(categories)
    .set({ name: "Knitwear" })
    .where(eq(categories.id, category.id))
    .run();

  await act(async () => live.notify("categories"));

  expect(screen.getByText("Knitwear · No collection")).toBeTruthy();
});

test("renaming a Material re-reads Detail", async () => {
  const design = createDesign(database, { name: "Wool coat" });
  const wool = createMaterial(database, { name: "Wool" });

  addMaterialUse(database, design.id, {
    materialId: wool.id,
    colour: "Charcoal",
    role: "main",
  });

  await renderDetail(design.id);

  expect(screen.getByText("Wool")).toBeTruthy();

  database.db.update(materials).set({ name: "Merino" }).where(eq(materials.id, wool.id)).run();

  await act(async () => live.notify("materials"));

  expect(screen.getByText("Merino")).toBeTruthy();
});

test("Detail renders the hero and the recorded Specification read-only", async () => {
  const design = createDesign(database, {
    name: "Silk slip dress",
    description: "Bias cut, cowl neck.",
    silhouette: "Relaxed A-line",
    measurements: "Bust 96 / waist 104",
  });

  await renderDetail(design.id);

  expect(screen.getByText("Silk slip dress")).toBeTruthy();
  expect(screen.getByText("No category · No collection")).toBeTruthy();
  expect(screen.getByText("Bias cut, cowl neck.")).toBeTruthy();
  expect(screen.getByText("Specification")).toBeTruthy();
  expect(screen.getByText("Relaxed A-line")).toBeTruthy();
  expect(screen.getByText("Bust 96 / waist 104")).toBeTruthy();
});

test("Detail shows Created and Updated as date badges instead of the bottom timestamp box", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, Date.UTC(2026, 0, 5, 12));
  writeDesign(
    database,
    design.id,
    { fields: { description: "Bias cut, cowl neck." } },
    Date.UTC(2026, 1, 12, 12),
  );

  await renderDetail(design.id);

  expect(screen.getByText("Created Jan 5, 2026")).toBeTruthy();
  expect(screen.getByText("Updated Feb 12, 2026")).toBeTruthy();
  expect(screen.queryByText("Created")).toBeNull();
  expect(screen.queryByText("Updated")).toBeNull();
});

test("Detail hides Specification rows the owner has not recorded", async () => {
  const design = createDesign(database, { name: "Silk slip dress", neckline: "Boat neck" });

  await renderDetail(design.id);

  expect(screen.getByText("Neckline")).toBeTruthy();
  expect(screen.queryByText("Silhouette")).toBeNull();
  expect(screen.queryByText("Measurements")).toBeNull();
  expect(screen.queryByText("Not set")).toBeNull();
});

test("Detail renders recorded Creative direction rows read-only", async () => {
  const design = createDesign(database, {
    name: "Sunday Afternoon",
    concept: "A slow summer day",
    mood: "Romantic",
  });

  await renderDetail(design.id);

  expect(screen.getByText("Creative direction")).toBeTruthy();
  expect(screen.getByText("A slow summer day")).toBeTruthy();
  expect(screen.getByText("Romantic")).toBeTruthy();
  expect(screen.queryByText("Not set")).toBeNull();
});

test("Detail hides Creative direction rows the owner has not recorded", async () => {
  const design = createDesign(database, {
    name: "Sunday Afternoon",
    silhouette: "Relaxed A-line",
    mood: "Romantic",
  });

  await renderDetail(design.id);

  await userEvent.press(screen.getByRole("tab", { name: "Creative direction" }));

  expect(screen.getByText("Mood")).toBeTruthy();
  expect(screen.queryByText("Inspiration")).toBeNull();
  expect(screen.queryByText("Palette")).toBeNull();
});

test("an empty section waits with Nothing recorded yet", async () => {
  const design = createDesign(database, {
    name: "Sunday Afternoon",
    silhouette: "Relaxed A-line",
  });

  await renderDetail(design.id);

  await userEvent.press(screen.getByRole("tab", { name: "Creative direction" }));

  expect(screen.getByText("Nothing recorded yet")).toBeTruthy();
});

test("a design that has recorded nothing shows no tab content", async () => {
  const design = createDesign(database, { name: "Unfinished idea" });

  await renderDetail(design.id);

  expect(screen.getByText("Nothing recorded yet")).toBeTruthy();
  expect(screen.queryByText("Specification")).toBeNull();
});

test("Detail renders recorded Material uses read-only", async () => {
  const design = createDesign(database, { name: "Wool coat", silhouette: "Straight" });
  const wool = createMaterial(database, { name: "Wool" });
  const lining = createMaterial(database, { name: "Cupro lining" });

  addMaterialUse(database, design.id, {
    materialId: lining.id,
    colour: "Taupe",
    role: "secondary",
  });
  addMaterialUse(database, design.id, { materialId: wool.id, colour: "Charcoal", role: "main" });

  await renderDetail(design.id);

  expect(screen.getByText("Material")).toBeTruthy();
  expect(screen.getByText("Wool")).toBeTruthy();
  expect(screen.getByText("Charcoal")).toBeTruthy();
  expect(screen.getByText("Main")).toBeTruthy();
  expect(screen.getByText("Cupro lining")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add material" })).toBeNull();
});

test("a design with only Material uses opens on Specification", async () => {
  const design = createDesign(database, { name: "Wool coat" });
  const wool = createMaterial(database, { name: "Wool" });

  addMaterialUse(database, design.id, { materialId: wool.id, colour: "Charcoal", role: "main" });

  await renderDetail(design.id);

  expect(screen.getByRole("tab", { name: "Specification" })).toBeTruthy();
  expect(screen.getByText("Wool")).toBeTruthy();
  expect(screen.getByText("Charcoal")).toBeTruthy();
  expect(screen.queryByText("Nothing recorded yet")).toBeNull();
});
