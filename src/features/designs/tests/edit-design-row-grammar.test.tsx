import { act, screen, userEvent, within } from "@testing-library/react-native";
import { Keyboard } from "react-native";
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

describe("the read rows", () => {
  test("every read row announces the value it shows", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    expect(screen.getByRole("button", { name: "Design name" })).toHaveAccessibilityValue({
      text: "Silk slip dress",
    });
    expect(
      screen.getByRole("button", { name: "Category and collection" }),
    ).toHaveAccessibilityValue({ text: "No category or collection" });
    expect(screen.getByRole("button", { name: "Description" })).toHaveAccessibilityValue({
      text: "Bias cut",
    });
    expect(screen.getByRole("button", { name: "Silhouette" })).toHaveAccessibilityValue({
      text: "Not set",
    });
  });

  test("the screen names itself in its header", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    expect(screen.getByRole("heading", { name: "Edit design" })).toBeTruthy();
  });

  test("the identity blocks are named on screen", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    for (const label of ["Design name", "Category and collection", "Description"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});

describe("the taxonomy sheet", () => {
  test("a Category choice is stored while the sheet stays open", async () => {
    const category = createCategory(database, { name: "Bridal" });
    const design = newDesign();

    await renderEdit(design.id);
    await act(async () => {});
    await openRow("Category and collection");

    // The picker stacks above the taxonomy sheet: both choices stay mounted,
    // and its list arrives only once the field is pressed.
    const dismissKeyboard = jest.spyOn(Keyboard, "dismiss");
    expect(screen.queryByRole("button", { name: "Bridal" })).toBeNull();
    await userEvent.press(screen.getByRole("button", { name: "Category" }));
    expect(dismissKeyboard).toHaveBeenCalled();
    expect(screen.getByLabelText("Collection")).toBeTruthy();
    await userEvent.press(screen.getByRole("button", { name: "Bridal" }));
    dismissKeyboard.mockRestore();

    expect(getDesign(database, design.id)).toMatchObject({ categoryId: category.id });
    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByLabelText("Collection")).toBeTruthy();
  });
});
