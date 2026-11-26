import { act, screen, userEvent, within } from "@testing-library/react-native";
import { getDesign } from "@/features/designs";
import { createMaterial } from "@/features/materials";
import { createCategory } from "@/features/taxonomy";
import {
  addMaterialUse,
  database,
  newDesign,
  openRow,
  openTab,
  renderEdit,
  setupEditDesignFixtures,
} from "./edit-design-screen-fixtures";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

jest.mock("@/shared/components/ui/select", () => jest.requireActual("./taxonomy-select-mock"));

setupEditDesignFixtures();

const SPECIFICATION_LABELS = [
  "Silhouette",
  "Neckline",
  "Sleeve type",
  "Garment details",
  "Size range",
  "Measurements",
  "Construction notes",
];

const CREATIVE_DIRECTION_LABELS = [
  "Concept",
  "Mood",
  "Inspiration",
  "Intended feeling",
  "Audience",
  "Styling",
  "Palette",
];

/** The read row for an identity field or a section field. */
function row(label: string) {
  return screen.getByRole("button", { name: label });
}

describe("the row grammar", () => {
  test("the name, taxonomy, and description rows each trail one pencil", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    for (const label of ["Design name", "Category and collection", "Description"]) {
      expect(
        within(row(label)).getAllByTestId("row-pencil", { includeHiddenElements: true }),
      ).toHaveLength(1);
    }
  });

  test("every Specification row trails one pencil", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    for (const label of SPECIFICATION_LABELS) {
      expect(
        within(row(label)).getAllByTestId("row-pencil", { includeHiddenElements: true }),
      ).toHaveLength(1);
    }
  });

  test("every Creative direction row trails one pencil", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openTab("Creative direction");

    for (const label of CREATIVE_DIRECTION_LABELS) {
      expect(
        within(row(label)).getAllByTestId("row-pencil", { includeHiddenElements: true }),
      ).toHaveLength(1);
    }
  });

  test("every Material use row trails one pencil", async () => {
    const design = newDesign();
    const wool = createMaterial(database, { name: "Wool" });

    addMaterialUse(design.id, { materialId: wool.id, colour: "Charcoal", role: "main" });

    await renderEdit(design.id);

    const use = screen.getByRole("button", { name: "Edit Wool (Charcoal)" });

    expect(within(use).getAllByTestId("row-pencil", { includeHiddenElements: true })).toHaveLength(
      1,
    );
  });

  test("the Status pill has no button role and no pencil", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    const status = within(screen.getByTestId("design-status"));

    expect(status.getByText("Concept")).toBeTruthy();
    expect(status.queryByRole("button")).toBeNull();
    expect(status.queryByTestId("row-pencil", { includeHiddenElements: true })).toBeNull();
  });
});

describe("the taxonomy sheet", () => {
  test("a Category choice is stored while the sheet stays open", async () => {
    const category = createCategory(database, { name: "Bridal" });
    const design = newDesign();

    await renderEdit(design.id);
    await act(async () => {});
    await openRow("Category and collection");
    await userEvent.press(screen.getByRole("button", { name: "Bridal" }));

    expect(getDesign(database, design.id)).toMatchObject({ categoryId: category.id });
    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByLabelText("Collection")).toBeTruthy();
  });
});
