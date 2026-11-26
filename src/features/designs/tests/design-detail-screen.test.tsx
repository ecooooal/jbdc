import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { categories, materials } from "@/features/database";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign, writeDesign } from "@/features/designs";
import { DesignDetailScreen } from "@/features/designs/react";
import { createMaterial } from "@/features/materials";
import { createCategory, createCollection } from "@/features/taxonomy";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

// The native dropdown's portal waits for a trigger measurement Jest never
// fires. Render its rows inline, inside the real root and items, so the route
// tests press each row the way the native Select path is tested.
jest.mock("@/shared/components/ui/dropdown-menu", () => {
  const actual = jest.requireActual("@/shared/components/ui/dropdown-menu");
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ...actual,
    DropdownMenuContent: ({ children }: { children?: ReactNode }) =>
      React.createElement(View, null, children),
  };
});

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

/** The fixed header, outside the scrolling content. */
function headerRegion() {
  return within(screen.getByTestId("detail-header"));
}

/** The body's identity block, above the image block. */
function identityRegion() {
  return within(screen.getByTestId("detail-identity"));
}

test("the header carries one kebab trigger and no text actions", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  const header = headerRegion();

  expect(header.getAllByRole("button", { name: "Design actions" })).toHaveLength(1);
  expect(header.queryByRole("button", { name: "History" })).toBeNull();
  expect(header.queryByRole("button", { name: "Edit design" })).toBeNull();
});

test("the kebab holds History and Edit as menu rows", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  const header = headerRegion();

  expect(header.getAllByRole("menuitem")).toHaveLength(2);
  expect(header.getByRole("menuitem", { name: "History" })).toBeTruthy();
  expect(header.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
});

test("choosing History in the header pushes the History route", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  await userEvent.press(headerRegion().getByRole("menuitem", { name: "History" }));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/designs/[id]/history",
    params: { id: design.id },
  });
});

test("choosing Edit in the header pushes the Edit route", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  await userEvent.press(headerRegion().getByRole("menuitem", { name: "Edit" }));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/designs/[id]/edit",
    params: { id: design.id },
  });
});

test("renaming the Design's Category re-reads the header", async () => {
  const category = createCategory(database, { name: "Dress" });
  const design = createDesign(database, {
    name: "Silk slip dress",
    categoryId: category.id,
  });

  await renderDetail(design.id);

  expect(headerRegion().getByText("Dress")).toBeTruthy();

  database.db
    .update(categories)
    .set({ name: "Knitwear" })
    .where(eq(categories.id, category.id))
    .run();

  await act(async () => live.notify("categories"));

  expect(headerRegion().getByText("Knitwear")).toBeTruthy();
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

test("the fixed header carries the back control and the Design's place", async () => {
  const category = createCategory(database, { name: "Dress" });
  const collection = createCollection(database, { name: "Spring" });
  const design = createDesign(
    database,
    {
      name: "Silk slip dress",
      categoryId: category.id,
      collectionId: collection.id,
    },
    Date.UTC(2026, 0, 5, 12),
  );
  writeDesign(
    database,
    design.id,
    { fields: { description: "Bias cut, cowl neck." } },
    Date.UTC(2026, 1, 12, 12),
  );

  await renderDetail(design.id);

  expect(headerRegion().getByRole("button", { name: "Back to Library" })).toBeTruthy();
  expect(headerRegion().getByText("Spring")).toBeTruthy();
  expect(headerRegion().getByText("Dress")).toBeTruthy();
  expect(headerRegion().queryByText("Created Jan 5, 2026")).toBeNull();
  expect(headerRegion().queryByText("Updated Feb 12, 2026")).toBeNull();
});

test("the body opens on the identity block: name, Status pill, dates, and description", async () => {
  const design = createDesign(
    database,
    { name: "Silk slip dress", description: "Bias cut, cowl neck." },
    Date.UTC(2026, 0, 5, 12),
  );

  await renderDetail(design.id);

  expect(identityRegion().getByText("Silk slip dress")).toBeTruthy();
  expect(identityRegion().getByText("Concept")).toBeTruthy();
  expect(identityRegion().getByText("Created Jan 5, 2026")).toBeTruthy();
  expect(identityRegion().getByText("Updated Jan 5, 2026")).toBeTruthy();
  expect(identityRegion().getByText("Bias cut, cowl neck.")).toBeTruthy();
});

test("the dates appear once each", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, Date.UTC(2026, 0, 5, 12));
  writeDesign(
    database,
    design.id,
    { fields: { description: "Bias cut, cowl neck." } },
    Date.UTC(2026, 1, 12, 12),
  );

  await renderDetail(design.id);

  expect(screen.getAllByText("Created Jan 5, 2026")).toHaveLength(1);
  expect(screen.getAllByText("Updated Feb 12, 2026")).toHaveLength(1);
});

test("a Design with no Collection names it instead of leaving the line blank", async () => {
  const category = createCategory(database, { name: "Dress" });
  const design = createDesign(database, { name: "Silk slip dress", categoryId: category.id });

  await renderDetail(design.id);

  expect(headerRegion().getByText("No collection")).toBeTruthy();
  expect(headerRegion().getByText("Dress")).toBeTruthy();
});

test("a Design with no Category names it instead of leaving the line blank", async () => {
  const collection = createCollection(database, { name: "Spring" });
  const design = createDesign(database, {
    name: "Silk slip dress",
    collectionId: collection.id,
  });

  await renderDetail(design.id);

  expect(headerRegion().getByText("Spring")).toBeTruthy();
  expect(headerRegion().getByText("No category")).toBeTruthy();
});

test("a Design with neither Collection nor Category names both", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  expect(headerRegion().getByText("No collection")).toBeTruthy();
  expect(headerRegion().getByText("No category")).toBeTruthy();
});

test("the body carries no joined Category and Collection line", async () => {
  const category = createCategory(database, { name: "Dress" });
  const collection = createCollection(database, { name: "Spring" });
  const design = createDesign(database, {
    name: "Silk slip dress",
    categoryId: category.id,
    collectionId: collection.id,
  });

  await renderDetail(design.id);

  expect(screen.queryByText("Dress · Spring")).toBeNull();
  expect(identityRegion().queryByText("Dress")).toBeNull();
  expect(identityRegion().queryByText("Spring")).toBeNull();
});

test("Detail renders the identity block and the recorded Specification read-only", async () => {
  const design = createDesign(database, {
    name: "Silk slip dress",
    description: "Bias cut, cowl neck.",
    silhouette: "Relaxed A-line",
    measurements: "Bust 96 / waist 104",
  });

  await renderDetail(design.id);

  expect(identityRegion().getByText("Silk slip dress")).toBeTruthy();
  expect(identityRegion().getByText("Bias cut, cowl neck.")).toBeTruthy();
  expect(identityRegion().queryByText(/No category/)).toBeNull();
  expect(screen.getByText("Specification")).toBeTruthy();
  expect(screen.getByText("Silhouette")).toBeTruthy();
  expect(screen.getByText("Relaxed A-line")).toBeTruthy();
  expect(screen.getByText("Measurements")).toBeTruthy();
  expect(screen.getByText("Bust 96 / waist 104")).toBeTruthy();
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

  // Scope to the section: the Status pill also reads Concept.
  const section = within(screen.getByTestId("detail-section-creativeDirection"));

  expect(screen.getByText("Creative direction")).toBeTruthy();
  expect(section.getByText("Concept")).toBeTruthy();
  expect(section.getByText("A slow summer day")).toBeTruthy();
  expect(section.getByText("Mood")).toBeTruthy();
  expect(section.getByText("Romantic")).toBeTruthy();
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

  // The journey rail names its own Inspiration stage, so the only one on
  // screen is that chip: the unrecorded Inspiration row did not render.
  expect(screen.getAllByText("Inspiration")).toHaveLength(1);
  expect(screen.getByText("Mood")).toBeTruthy();
  expect(screen.queryByText("Palette")).toBeNull();
});

test("an empty section names the section it has nothing for", async () => {
  const design = createDesign(database, {
    name: "Sunday Afternoon",
    silhouette: "Relaxed A-line",
  });

  await renderDetail(design.id);

  await userEvent.press(screen.getByRole("tab", { name: "Creative direction" }));

  expect(screen.getByText("No Creative direction recorded yet")).toBeTruthy();
});

test("a design that has recorded nothing shows no tab content", async () => {
  const design = createDesign(database, { name: "Unfinished idea" });

  await renderDetail(design.id);

  expect(screen.getByText("No Specification or Creative direction recorded yet")).toBeTruthy();
  expect(screen.getByText("Open Edit to record them")).toBeTruthy();
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
  expect(screen.queryByText("No Specification or Creative direction recorded yet")).toBeNull();
});

test("Detail composes the gallery from the images module", async () => {
  const design = createDesign(database, { name: "Early concept" });

  await renderDetail(design.id);

  expect(screen.getByLabelText("Design journey")).toBeTruthy();
});
