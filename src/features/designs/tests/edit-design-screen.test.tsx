import { PortalHost } from "@rn-primitives/portal";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign, getDesign, listMaterialUses, writeDesign } from "@/features/designs";
import { EditDesignScreen } from "@/features/designs/react";
import { listDesignEvents } from "@/features/history";
import { createMaterial } from "@/features/materials";
import { createCategory, createCollection } from "@/features/taxonomy";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

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
});

afterEach(() => {
  dispose();
});

async function renderEdit(designId: string) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <EditDesignScreen designId={designId} />
        <PortalHost />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

function newDesign() {
  return createDesign(database, {
    name: "Silk slip dress",
    description: "Bias cut",
  });
}

/** Opens the read-first editor for a hero field or a section row. */
async function openRow(label: string) {
  await userEvent.press(screen.getByRole("button", { name: label }));
}

async function openTab(name: string) {
  await userEvent.press(screen.getByRole("tab", { name }));
}

describe("edit hero", () => {
  test("a name typed and left is stored with no Save action", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openRow("Design name");

    const name = screen.getByLabelText("Design name");

    await fireEvent.changeText(name, "Wool coat");
    await fireEvent(name, "blur");

    expect(getDesign(database, design.id)).toMatchObject({ name: "Wool coat" });
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });

  test("a blank name is refused and the previous name stays", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openRow("Design name");

    const name = screen.getByLabelText("Design name");

    await fireEvent.changeText(name, "   ");
    await fireEvent(name, "blur");

    expect(screen.getByText("A design needs a name.")).toBeTruthy();
    expect(screen.getByLabelText("Design name")).toHaveDisplayValue("Silk slip dress");
    expect(getDesign(database, design.id)).toMatchObject({ name: "Silk slip dress" });
  });

  test("a name typed but not left is written when the screen closes", async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await openRow("Design name");
    await fireEvent.changeText(screen.getByLabelText("Design name"), "Wool coat");
    await view.unmount();

    expect(getDesign(database, design.id)).toMatchObject({ name: "Wool coat" });
  });

  test("a description typed and left is stored", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openRow("Description");

    const description = screen.getByLabelText("Description");

    await fireEvent.changeText(description, "Heavy twill, wide lapels");
    await fireEvent(description, "blur");

    expect(getDesign(database, design.id)).toMatchObject({
      description: "Heavy twill, wide lapels",
    });
  });

  test("an empty description reads as not recorded and opens in place", async () => {
    const design = createDesign(database, { name: "Silk slip dress" });

    await renderEdit(design.id);

    expect(screen.getByText("No description")).toBeTruthy();

    await openRow("Description");
    expect(screen.getByPlaceholderText("What this piece is")).toBeTruthy();
  });

  test("the hero shows the Status, Category, and Collection", async () => {
    const category = createCategory(database, { name: "Dress" });
    const collection = createCollection(database, { name: "Spring 2027", year: 2027 });
    const design = createDesign(database, {
      name: "Silk slip dress",
      categoryId: category.id,
      collectionId: collection.id,
    });

    await renderEdit(design.id);

    expect(screen.getByText("Concept")).toBeTruthy();
    expect(screen.getByText("Dress · Spring 2027")).toBeTruthy();
  });

  test("the edit screen holds no image block", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    expect(screen.queryByLabelText("Design journey")).toBeNull();
  });

  test("tapping Category · Collection opens both pickers and Done closes them", async () => {
    const category = createCategory(database, { name: "Dress" });
    const design = createDesign(database, {
      name: "Silk slip dress",
      categoryId: category.id,
    });

    await renderEdit(design.id);
    await openRow("Category and collection");

    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByLabelText("Collection")).toBeTruthy();

    await userEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByLabelText("Category")).toBeNull();
  });
});

describe("Specification rows", () => {
  test("Edit shows the Specification tab with every row read-first", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    expect(screen.getByText("Specification")).toBeTruthy();
    for (const label of [
      "Silhouette",
      "Neckline",
      "Sleeve type",
      "Garment details",
      "Size range",
      "Measurements",
      "Construction notes",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getAllByText("Not set")).toHaveLength(7);
  });

  test("a Specification row typed and left is stored and collapses", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openRow("Silhouette");

    const silhouette = screen.getByLabelText("Silhouette");

    expect(screen.getByPlaceholderText("Overall clothing shape")).toBeTruthy();

    await fireEvent.changeText(silhouette, "Relaxed A-line");
    await fireEvent(silhouette, "blur");

    expect(getDesign(database, design.id)).toMatchObject({ silhouette: "Relaxed A-line" });
    expect(screen.getByRole("button", { name: "Silhouette" })).toBeTruthy();
    expect(screen.getByText("Relaxed A-line")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Overall clothing shape")).toBeNull();
  });

  test("only one row is open at a time", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    await openRow("Silhouette");
    expect(screen.getByPlaceholderText("Overall clothing shape")).toBeTruthy();

    await openRow("Neckline");

    expect(screen.queryByPlaceholderText("Overall clothing shape")).toBeNull();
    expect(screen.getByPlaceholderText("Neckline design")).toBeTruthy();
  });

  test("a measured row stays one multiline field", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openRow("Measurements");

    const measurements = screen.getByLabelText("Measurements");

    expect(measurements.props.multiline).toBe(true);
    expect(screen.getByPlaceholderText("Relevant clothing measurements")).toBeTruthy();
  });

  test("a Specification row typed but not left is written when the screen closes", async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await openRow("Size range");
    await fireEvent.changeText(screen.getByLabelText("Size range"), "UK 8–16");
    await view.unmount();

    expect(getDesign(database, design.id)).toMatchObject({ sizeRange: "UK 8–16" });
  });
});

describe("Creative direction rows", () => {
  const LABELS = [
    "Concept",
    "Mood",
    "Inspiration",
    "Intended feeling",
    "Audience",
    "Styling",
    "Palette",
  ];

  test("Edit shows both tabs and every Creative direction row read-first", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    expect(screen.getByRole("tab", { name: "Specification" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Creative direction" })).toBeTruthy();

    await openTab("Creative direction");

    for (const label of LABELS) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getAllByText("Not set")).toHaveLength(7);
  });

  test("Concept asks what the piece is trying to do", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openTab("Creative direction");
    await openRow("Concept");

    expect(screen.getByPlaceholderText("What this piece is trying to do")).toBeTruthy();
  });

  test("a Creative direction row typed and left is stored and collapses", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openTab("Creative direction");
    await openRow("Mood");

    const mood = screen.getByLabelText("Mood");

    expect(screen.getByPlaceholderText("Intended atmosphere or emotion")).toBeTruthy();

    await fireEvent.changeText(mood, "Romantic, relaxed");
    await fireEvent(mood, "blur");

    expect(getDesign(database, design.id)).toMatchObject({ mood: "Romantic, relaxed" });
    expect(screen.getByRole("button", { name: "Mood" })).toBeTruthy();
    expect(screen.getByText("Romantic, relaxed")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Intended atmosphere or emotion")).toBeNull();
  });
});

describe("Materials", () => {
  test("Edit shows the Materials table and Add material on the Specification tab", async () => {
    const design = newDesign();

    await renderEdit(design.id);

    for (const heading of ["Material", "Colour", "Role"]) {
      expect(screen.getByText(heading)).toBeTruthy();
    }
    expect(screen.getByText("No materials yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add material" })).toBeTruthy();
  });

  test("a Material created inline is used to add a Material use", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Add material" }));
    await userEvent.press(screen.getByRole("button", { name: "New material" }));
    await userEvent.type(screen.getByLabelText("New material name"), "Silk crêpe");
    await userEvent.press(screen.getByRole("button", { name: "Add to list" }));

    await act(async () => live.notify("materials"));

    expect(screen.getByText("Silk crêpe")).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Colour"), "Ivory");
    await userEvent.press(screen.getByRole("button", { name: "Add material use" }));

    await act(async () => {
      live.notify("design_materials");
      live.notify("designs");
    });

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Silk crêpe", colour: "Ivory", role: "main" }),
    ]);
    expect(screen.getAllByText("Silk crêpe").length).toBeGreaterThan(0);
    expect(screen.getByText("Ivory")).toBeTruthy();
    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add material" })).toBeTruthy();
  });

  test("tapping a use opens its editor with the current Material, colour, and role", async () => {
    const design = newDesign();
    const wool = createMaterial(database, { name: "Wool" });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: "Charcoal",
      role: "main",
    });

    await renderEdit(design.id);

    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));

    expect(screen.getByLabelText("Material")).toBeTruthy();
    expect(screen.getByLabelText("Colour")).toHaveDisplayValue("Charcoal");
    expect(screen.getByLabelText("Role")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove material use" })).toBeTruthy();
  });

  test("a colour typed and left writes the use with no Save action", async () => {
    const design = newDesign();
    const wool = createMaterial(database, { name: "Wool" });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: "Charcoal",
      role: "main",
    });

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));

    const colour = screen.getByLabelText("Colour");

    await fireEvent.changeText(colour, "Black");
    await fireEvent(colour, "blur");

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Wool", colour: "Black", role: "main" }),
    ]);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });

  test("a colour typed and finished with Done is written as the editor closes", async () => {
    const design = newDesign();
    const wool = createMaterial(database, { name: "Wool" });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: "Charcoal",
      role: "main",
    });

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));
    await fireEvent.changeText(screen.getByLabelText("Colour"), "Black");
    await userEvent.press(screen.getByRole("button", { name: "Done" }));

    expect(listMaterialUses(database, design.id)).toEqual([
      expect.objectContaining({ materialName: "Wool", colour: "Black", role: "main" }),
    ]);
    expect(screen.getByRole("button", { name: "Add material" })).toBeTruthy();
  });

  test("a use can be removed", async () => {
    const design = newDesign();
    const wool = createMaterial(database, { name: "Wool" });

    addMaterialUse(database, design.id, {
      materialId: wool.id,
      colour: "Charcoal",
      role: "main",
    });

    await renderEdit(design.id);
    await userEvent.press(screen.getByRole("button", { name: "Edit Wool (Charcoal)" }));
    await userEvent.press(screen.getByRole("button", { name: "Remove material use" }));

    await act(async () => {
      live.notify("design_materials");
      live.notify("designs");
    });

    expect(listMaterialUses(database, design.id)).toEqual([]);
    expect(screen.getByText("No materials yet")).toBeTruthy();
  });
});

describe("tab change wiring", () => {
  test("pressing the Creative direction tab shows its rows and collapses the one it leaves", async () => {
    const design = newDesign();

    await renderEdit(design.id);
    await openRow("Silhouette");
    await fireEvent.changeText(screen.getByLabelText("Silhouette"), "Relaxed A-line");
    await openTab("Creative direction");

    expect(screen.getByRole("button", { name: "Concept" })).toBeTruthy();
    expect(screen.queryByPlaceholderText("Overall clothing shape")).toBeNull();

    await openTab("Specification");

    expect(screen.getByRole("button", { name: "Silhouette" })).toBeTruthy();
    expect(screen.getByText("Relaxed A-line")).toBeTruthy();
  });
});

describe("edit visit history", () => {
  test("two fields changed in one visit are one Event with both old and new values", async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await openRow("Design name");
    await fireEvent.changeText(screen.getByLabelText("Design name"), "Wool coat");
    await openRow("Description");
    await fireEvent.changeText(screen.getByLabelText("Description"), "Heavy twill");
    await view.unmount();

    const events = listDesignEvents(database, design.id);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "edit",
      diff: {
        name: { from: "Silk slip dress", to: "Wool coat" },
        description: { from: "Bias cut", to: "Heavy twill" },
      },
    });
  });

  test("a Specification write and a hero write are one Event", async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await openRow("Design name");
    await fireEvent.changeText(screen.getByLabelText("Design name"), "Wool coat");
    await openRow("Silhouette");
    await fireEvent.changeText(screen.getByLabelText("Silhouette"), "Relaxed A-line");
    await view.unmount();

    const events = listDesignEvents(database, design.id);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      diff: {
        name: { from: "Silk slip dress", to: "Wool coat" },
        silhouette: { from: null, to: "Relaxed A-line" },
      },
    });
  });

  test("a visit that changes nothing writes no Event", async () => {
    const design = newDesign();
    const view = await renderEdit(design.id);

    await view.unmount();

    expect(listDesignEvents(database, design.id)).toEqual([]);
  });

  test("two separate visits write two Events", async () => {
    const design = newDesign();

    const first = await renderEdit(design.id);
    await openRow("Design name");
    await fireEvent.changeText(screen.getByLabelText("Design name"), "Wool coat");
    await first.unmount();

    const second = await renderEdit(design.id);
    await openRow("Description");
    await fireEvent.changeText(screen.getByLabelText("Description"), "Heavy twill");
    await second.unmount();

    expect(listDesignEvents(database, design.id).map((event) => event.diff)).toEqual([
      { description: { from: "Bias cut", to: "Heavy twill" } },
      { name: { from: "Silk slip dress", to: "Wool coat" } },
    ]);
  });

  test("leaving the app keeps the draft and records nothing; closing writes one Event", async () => {
    const design = newDesign();
    const listeners: ((status: string) => void)[] = [];
    const addEventListener = jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _type: string,
      handler: (status: string) => void,
    ) => {
      listeners.push(handler);

      return { remove: jest.fn() };
    }) as never);

    const view = await renderEdit(design.id);
    await openRow("Design name");
    await fireEvent.changeText(screen.getByLabelText("Design name"), "Wool coat");

    // Opening Control Centre or the app switcher only makes the app inactive.
    await act(async () => listeners[0]("inactive"));
    expect(getDesign(database, design.id)).toMatchObject({ name: "Wool coat" });
    expect(listDesignEvents(database, design.id)).toEqual([]);

    // Leaving the app flushes a draft, but the visit is still open.
    await act(async () => listeners[0]("background"));
    expect(listDesignEvents(database, design.id)).toEqual([]);

    await view.unmount();
    addEventListener.mockRestore();

    const events = listDesignEvents(database, design.id);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      diff: { name: { from: "Silk slip dress", to: "Wool coat" } },
    });
  });
});
