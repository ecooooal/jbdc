import { act, screen, userEvent, within } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { categories, materials, type Database } from "@/features/database";
import { createDesign, writeDesign } from "@/features/designs";
import { createMaterial } from "@/features/materials";
import { createCategory, createCollection } from "@/features/taxonomy";
import { database, live, renderDetail, setupDesignDetailFixtures } from "./design-detail-fixtures";

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

setupDesignDetailFixtures();

/** Seeds a recorded use through the visit's one write path. */
function addMaterialUse(
  database: Database,
  designId: string,
  input: { materialId: string; colour: string; role: "main" | "secondary" | "other" },
  now?: number,
) {
  writeDesign(database, designId, { uses: [{ kind: "add", input }] }, now);
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

test("the kebab holds History, Edit, and Change status as menu rows", async () => {
  const design = createDesign(database, { name: "Silk slip dress" });

  await renderDetail(design.id);

  const header = headerRegion();

  expect(header.getAllByRole("menuitem")).toHaveLength(3);
  expect(header.getByRole("menuitem", { name: "History" })).toBeTruthy();
  expect(header.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
  expect(header.getByRole("menuitem", { name: "Change status" })).toBeTruthy();
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
  expect(headerRegion().queryByText(/Jan\s5,\s2026/)).toBeNull();
  expect(headerRegion().queryByText(/Feb\s12,\s2026/)).toBeNull();
});

test("the body opens on the identity block: name, Status pill, one date, and description", async () => {
  const design = createDesign(
    database,
    { name: "Silk slip dress", description: "Bias cut, cowl neck." },
    Date.UTC(2026, 0, 5, 12),
  );

  await renderDetail(design.id);

  expect(identityRegion().getByText("Silk slip dress")).toBeTruthy();
  expect(identityRegion().getByText("Concept")).toBeTruthy();
  expect(identityRegion().getByText(/Jan\s5,\s2026/)).toBeTruthy();
  expect(identityRegion().getByLabelText("Created Jan 5, 2026")).toBeTruthy();
  expect(identityRegion().queryByLabelText(/Updated/)).toBeNull();
  expect(identityRegion().getByText("Bias cut, cowl neck.")).toBeTruthy();
});

test("an edited Design shows both record dates once", async () => {
  const design = createDesign(database, { name: "Silk slip dress" }, Date.UTC(2026, 0, 5, 12));
  writeDesign(
    database,
    design.id,
    { fields: { description: "Bias cut, cowl neck." } },
    Date.UTC(2026, 1, 12, 12),
  );

  await renderDetail(design.id);

  expect(screen.getByLabelText("Created Jan 5, 2026, updated Feb 12, 2026")).toBeTruthy();
  expect(screen.getAllByText(/Jan\s5,\s2026/)).toHaveLength(1);
  expect(screen.getAllByText(/Feb\s12,\s2026/)).toHaveLength(1);
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

test("Detail keeps every Specification row, marking unrecorded ones", async () => {
  const design = createDesign(database, { name: "Silk slip dress", neckline: "Boat neck" });

  await renderDetail(design.id);

  const section = within(screen.getByTestId("detail-section-specification"));

  for (const label of [
    "Silhouette",
    "Neckline",
    "Sleeve type",
    "Garment details",
    "Size range",
    "Measurements",
    "Construction notes",
  ]) {
    expect(section.getByText(label)).toBeTruthy();
  }

  expect(section.getByText("Boat neck")).toBeTruthy();
  expect(section.getAllByText("Not set")).toHaveLength(6);
});

test("Detail renders recorded Creative direction rows and keeps the rest", async () => {
  const design = createDesign(database, {
    name: "Sunday Afternoon",
    concept: "A slow summer day",
    mood: "Romantic",
  });

  await renderDetail(design.id);
  await userEvent.press(screen.getByRole("tab", { name: "Creative direction" }));

  // Scope to the section: the Status pill also reads Concept.
  const section = within(screen.getByTestId("detail-section-creativeDirection"));

  expect(screen.getByText("Creative direction")).toBeTruthy();
  expect(section.getByText("Concept")).toBeTruthy();
  expect(section.getByText("A slow summer day")).toBeTruthy();
  expect(section.getByText("Mood")).toBeTruthy();
  expect(section.getByText("Romantic")).toBeTruthy();
  expect(section.getByText("Palette")).toBeTruthy();
  expect(section.getAllByText("Not set")).toHaveLength(5);
});

test("switching to a section with nothing recorded keeps both tabs and every row", async () => {
  const design = createDesign(database, {
    name: "Sunday Afternoon",
    silhouette: "Relaxed A-line",
  });

  await renderDetail(design.id);

  await userEvent.press(screen.getByRole("tab", { name: "Creative direction" }));

  expect(screen.getByRole("tab", { name: "Specification" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Creative direction" })).toBeTruthy();

  const section = within(screen.getByTestId("detail-section-creativeDirection"));

  expect(section.getByText("Inspiration")).toBeTruthy();
  expect(section.getByText("Palette")).toBeTruthy();
  expect(section.getAllByText("Not set")).toHaveLength(7);
});

test("a design that has recorded nothing still shows both sections in full", async () => {
  const design = createDesign(database, { name: "Unfinished idea" });

  await renderDetail(design.id);

  expect(screen.getByRole("tab", { name: "Specification" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Creative direction" })).toBeTruthy();

  const section = within(screen.getByTestId("detail-section-specification"));

  expect(section.getAllByText("Not set")).toHaveLength(7);
  expect(section.getByText("No materials added")).toBeTruthy();
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
});

test("Detail composes the gallery from the images module", async () => {
  const design = createDesign(database, { name: "Early concept" });

  await renderDetail(design.id);

  expect(screen.getByLabelText("Design journey")).toBeTruthy();
});
