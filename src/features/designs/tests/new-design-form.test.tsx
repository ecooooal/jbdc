import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { listDesigns } from "../lib/records";
import { NewDesignForm } from "@/features/designs/react";
import { listCategories, readTaxonomyNames } from "@/features/taxonomy";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const live = createSyncSubscribe();

function renderForm(database: ReturnType<typeof createTempDatabase>["database"]) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <NewDesignForm />
      </DatabaseProvider>
    </SafeAreaProvider>,
  );
}

/** Opens the one taxonomy sheet from the form's Category and collection block. */
async function openTaxonomy() {
  await userEvent.press(screen.getByRole("button", { name: "Category and collection" }));
}

test("a category created from its sheet is selected and saved with the design", async () => {
  const { database, dispose } = createTempDatabase();
  const user = userEvent.setup();

  try {
    await renderForm(database);

    await user.type(screen.getByLabelText("Design name"), "Silk slip dress");
    await openTaxonomy();
    await user.press(screen.getByRole("button", { name: "New category" }));
    await user.type(screen.getByLabelText("New category name"), "Knitwear");
    await user.press(screen.getByRole("button", { name: "Add to list" }));
    await act(async () => live.notify("categories"));

    const taxonomySheet = within(screen.getByTestId("taxonomy-sheet"));

    expect(taxonomySheet.getByText("Knitwear")).toBeTruthy();

    await user.press(taxonomySheet.getByRole("button", { name: "Close category and collection" }));
    await user.press(screen.getByRole("button", { name: "Create design" }));

    const category = listCategories(database).find((entry) => entry.name === "Knitwear");

    expect(listDesigns(database)).toEqual([
      expect.objectContaining({ name: "Silk slip dress", categoryId: category?.id }),
    ]);
    expect(router.back).toHaveBeenCalled();
  } finally {
    dispose();
  }
});

test("a collection created from its sheet keeps the optional year", async () => {
  const { database, dispose } = createTempDatabase();
  const user = userEvent.setup();

  try {
    await renderForm(database);

    await user.type(screen.getByLabelText("Design name"), "Silk slip dress");
    await openTaxonomy();
    await user.press(screen.getByRole("button", { name: "New collection" }));
    await user.type(screen.getByLabelText("New collection name"), "Spring 2027");
    await user.type(screen.getByLabelText("New collection year"), "2027");
    await user.press(screen.getByRole("button", { name: "Add to list" }));
    await act(async () => live.notify("collections"));

    const taxonomySheet = within(screen.getByTestId("taxonomy-sheet"));

    expect(taxonomySheet.getByText("Spring 2027 (2027)")).toBeTruthy();

    await user.press(taxonomySheet.getByRole("button", { name: "Close category and collection" }));
    await user.press(screen.getByRole("button", { name: "Create design" }));

    const collection = listDesigns(database)[0]?.collectionId;

    expect(
      collection === null || collection === undefined
        ? null
        : readTaxonomyNames(database).collections.get(collection),
    ).toMatchObject({ name: "Spring 2027", year: 2027 });
    expect(listDesigns(database)).toEqual([
      expect.objectContaining({ name: "Silk slip dress", collectionId: collection }),
    ]);
  } finally {
    dispose();
  }
});

test("the block reads the picked pair and a refusal stays in the new-entry sheet", async () => {
  const { database, dispose } = createTempDatabase();
  const user = userEvent.setup();

  try {
    await renderForm(database);

    expect(screen.getByText("No category or collection")).toBeTruthy();

    await openTaxonomy();

    const taxonomySheet = within(screen.getByTestId("taxonomy-sheet"));

    await user.press(taxonomySheet.getByRole("button", { name: "New collection" }));
    await user.type(screen.getByLabelText("New collection name"), "   ");
    await user.press(screen.getByRole("button", { name: "Add to list" }));

    expect(screen.getByText("A collection needs a name.")).toBeTruthy();

    await user.press(
      within(screen.getByTestId("new-collection-sheet")).getByRole("button", { name: "Cancel" }),
    );

    expect(screen.queryByTestId("new-collection-sheet")).toBeNull();
    expect(screen.getByTestId("taxonomy-sheet")).toBeTruthy();
  } finally {
    dispose();
  }
});
