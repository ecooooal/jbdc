import { act, fireEvent, screen, userEvent, within } from "@testing-library/react-native";
import { createMaterial } from "@/features/materials";
import { listMaterialUses } from "../lib/records";
import {
  addMaterialUse,
  database,
  live,
  newDesign,
  renderEdit,
  setupEditDesignFixtures,
} from "./edit-design-screen-fixtures";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

jest.mock("@/shared/components/ui/select", () => jest.requireActual("./taxonomy-select-mock"));

setupEditDesignFixtures();

/** The block's last row is the one way into the Add material sheet. */
async function openAddSheet() {
  await userEvent.press(screen.getByRole("button", { name: "Add material" }));
}

/** The Material trigger opens its own sheet above Add material; the option picks it. */
async function chooseMaterial(name: string) {
  await userEvent.press(addSheet().getByRole("button", { name: "Material" }));
  await userEvent.press(addSheet().getByRole("button", { name }));
}

function addSheet() {
  return within(screen.getByTestId("add-material-sheet"));
}

function editSheet() {
  return within(screen.getByTestId("edit-material-sheet"));
}

function newMaterialSheet() {
  return within(screen.getByTestId("new-material-sheet"));
}

/** Lets a Material use write land and reports it the way the app's listener does. */
async function settleUseWrites() {
  await act(async () => {
    live.notify("design_materials");
    live.notify("designs");
  });
}

/** A Design with one recorded Wool use. */
function designWithWoolUse() {
  const design = newDesign();
  const wool = createMaterial(database, { name: "Wool" });

  addMaterialUse(design.id, { materialId: wool.id, colour: "Charcoal", role: "main" });

  return { design, wool };
}

describe("the Add material sheet", () => {
  test("the block's last row opens it with Material, Colour, and Role", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    expect(screen.queryByTestId("add-material-sheet")).toBeNull();

    await openAddSheet();

    expect(addSheet().getByText("Add material")).toBeTruthy();
    expect(addSheet().getByTestId("sheet-body-scroll")).toBeTruthy();
    expect(addSheet().getByLabelText("Material")).toBeTruthy();
    expect(addSheet().getByLabelText("Colour")).toBeTruthy();
    expect(addSheet().getByLabelText("Role")).toBeTruthy();
    expect(addSheet().getByRole("button", { name: "Close add material" })).toBeTruthy();
    expect(addSheet().getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(addSheet().getByRole("button", { name: "Add to design" })).toBeTruthy();
  });

  test("Add to design stores the use and closes the sheet", async () => {
    const design = newDesign();

    createMaterial(database, { name: "Wool" });

    await renderEdit(design.id);
    await openAddSheet();
    await chooseMaterial("Wool");
    await fireEvent.changeText(addSheet().getByLabelText("Colour"), "Ivory");
    await userEvent.press(addSheet().getByRole("radio", { name: "Secondary" }));
    await userEvent.press(addSheet().getByRole("button", { name: "Add to design" }));
    await settleUseWrites();

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Wool", colour: "Ivory", role: "secondary" }),
    ]);
    expect(screen.queryByTestId("add-material-sheet")).toBeNull();
  });

  test("Cancel discards the unconfirmed use", async () => {
    const design = newDesign();

    createMaterial(database, { name: "Wool" });

    await renderEdit(design.id);
    await openAddSheet();
    await chooseMaterial("Wool");
    await fireEvent.changeText(addSheet().getByLabelText("Colour"), "Ivory");
    await userEvent.press(addSheet().getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("add-material-sheet")).toBeNull();
    expect(listMaterialUses(database, design.id)).toEqual([]);
  });
});

describe("the New material sheet", () => {
  test("opens above Add material and Return adds the Material to the list", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openAddSheet();
    await userEvent.press(addSheet().getByRole("button", { name: "New material" }));

    // Both sheets are open: the New material sheet sits above the Add material one.
    expect(screen.getByTestId("add-material-sheet")).toBeTruthy();
    expect(newMaterialSheet().getByTestId("sheet-body-scroll")).toBeTruthy();
    expect(newMaterialSheet().getByLabelText("New material name")).toBeTruthy();
    expect(newMaterialSheet().getByRole("button", { name: "Close new material" })).toBeTruthy();

    await fireEvent.changeText(
      newMaterialSheet().getByLabelText("New material name"),
      "Silk crêpe",
    );
    await fireEvent(newMaterialSheet().getByLabelText("New material name"), "submitEditing");
    await act(async () => live.notify("materials"));

    expect(screen.queryByTestId("new-material-sheet")).toBeNull();
    expect(addSheet().getByText("Silk crêpe")).toBeTruthy();

    // The created Material is selected at once, so confirming uses it.
    await fireEvent.changeText(addSheet().getByLabelText("Colour"), "Ivory");
    await userEvent.press(addSheet().getByRole("button", { name: "Add to design" }));
    await settleUseWrites();

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Silk crêpe", colour: "Ivory" }),
    ]);
  });

  test("Cancel returns to Add material with its choices intact", async () => {
    const design = newDesign();

    createMaterial(database, { name: "Wool" });

    await renderEdit(design.id);
    await openAddSheet();
    await chooseMaterial("Wool");
    await fireEvent.changeText(addSheet().getByLabelText("Colour"), "Ivory");
    await userEvent.press(addSheet().getByRole("radio", { name: "Secondary" }));
    await userEvent.press(addSheet().getByRole("button", { name: "New material" }));
    await userEvent.press(newMaterialSheet().getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("new-material-sheet")).toBeNull();
    expect(addSheet().getByLabelText("Colour")).toHaveDisplayValue("Ivory");

    await userEvent.press(addSheet().getByRole("button", { name: "Add to design" }));
    await settleUseWrites();

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Wool", colour: "Ivory", role: "secondary" }),
    ]);
  });
});

describe("the Edit material sheet", () => {
  test("a Material use row opens it with the stored Material, colour, and role", async () => {
    const { design } = designWithWoolUse();

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));

    expect(editSheet().getByText("Edit material")).toBeTruthy();
    expect(editSheet().getByTestId("sheet-body-scroll")).toBeTruthy();
    expect(editSheet().getByLabelText("Colour")).toHaveDisplayValue("Charcoal");
    expect(editSheet().getByRole("radio", { name: "Main" })).toBeChecked();
    expect(editSheet().getByRole("button", { name: "Remove from design" })).toBeTruthy();
    expect(editSheet().getByRole("button", { name: "Close material" })).toBeTruthy();
    expect(editSheet().getByRole("button", { name: "Done" })).toBeTruthy();
  });

  test("the Material trigger stacks its choice sheet and picks another Material", async () => {
    const { design } = designWithWoolUse();

    createMaterial(database, { name: "Linen" });

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));

    // The choice sheet sits above Edit material: the sheet stays mounted.
    await userEvent.press(editSheet().getByRole("button", { name: "Material" }));
    expect(screen.getByTestId("edit-material-sheet")).toBeTruthy();
    await userEvent.press(editSheet().getByRole("button", { name: "Linen" }));
    await settleUseWrites();

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Linen", colour: "Charcoal", role: "main" }),
    ]);
  });

  test("Done writes the typed colour and returns to the screen", async () => {
    const { design } = designWithWoolUse();

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));
    await fireEvent.changeText(editSheet().getByLabelText("Colour"), "Black");
    await userEvent.press(editSheet().getByRole("button", { name: "Done" }));
    await settleUseWrites();

    expect(screen.queryByTestId("edit-material-sheet")).toBeNull();
    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Wool", colour: "Black", role: "main" }),
    ]);
  });

  test("the header's X writes the typed colour too", async () => {
    const { design } = designWithWoolUse();

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));
    await fireEvent.changeText(editSheet().getByLabelText("Colour"), "Black");
    await userEvent.press(editSheet().getByRole("button", { name: "Close material" }));
    await settleUseWrites();

    expect(screen.queryByTestId("edit-material-sheet")).toBeNull();
    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Wool", colour: "Black", role: "main" }),
    ]);
  });

  test("Remove from design arms on the first press and removes on the second", async () => {
    const { design } = designWithWoolUse();

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));
    await userEvent.press(editSheet().getByRole("button", { name: "Remove from design" }));
    await settleUseWrites();

    // The first press only arms: the cue shows and the use is still recorded.
    expect(editSheet().getByText("Tap again to remove")).toBeTruthy();
    expect(listMaterialUses(database, design.id)).toHaveLength(1);

    await userEvent.press(editSheet().getByRole("button", { name: "Remove from design" }));
    await settleUseWrites();

    expect(listMaterialUses(database, design.id)).toEqual([]);
    expect(screen.queryByTestId("edit-material-sheet")).toBeNull();
    expect(screen.getByText("No materials added")).toBeTruthy();
  });
});

describe("the retired inline editors", () => {
  test("the Specification tab holds no Material editor outside a sheet", async () => {
    const { design } = designWithWoolUse();

    await renderEdit(design.id);

    expect(screen.queryByTestId("add-material-sheet")).toBeNull();
    expect(screen.queryByTestId("edit-material-sheet")).toBeNull();
    expect(screen.queryByLabelText("Colour")).toBeNull();

    // The editor only exists once the sheet is open, and is gone when it closes.
    await openAddSheet();
    expect(addSheet().getByLabelText("Colour")).toBeTruthy();

    await userEvent.press(addSheet().getByRole("button", { name: "Close add material" }));

    expect(screen.queryByLabelText("Colour")).toBeNull();
  });
});
