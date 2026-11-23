import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react-native";
import type { ImageKind } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { writeImages, type ImageStore } from "@/features/images";
import { ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import { listLibraryDesigns } from "@/features/library";
import { createCategory, createCollection } from "@/features/taxonomy";
import type { LibraryDesign } from "../lib/query";
import { LibraryCard } from "../components/library-card";
import type { PressHighlightHandlers } from "../components/press-highlight";

/** A card no finger is on, whose tap the test does not read. */
const IDLE_PRESS: PressHighlightHandlers = {
  pressed: false,
  onPressIn: () => {},
  onPressOut: () => {},
  onPress: () => {},
};

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-cover-sources-"));
  ({ store, dispose: disposeStore } = createTempImageStore());
});

afterEach(() => {
  dispose();
  disposeStore();
  rmSync(sourceDirectory, { recursive: true, force: true });
});

async function attach(designId: string, kind: ImageKind, bytes: string, now: number) {
  const sourcePath = join(sourceDirectory, `${kind}-${now}.jpg`);

  writeFileSync(sourcePath, bytes);
  await writeImages(
    database,
    store,
    designId,
    { kind: "attach", images: [{ sourcePath, kind }] },
    now,
  );
}

function libraryDesign(name: string): LibraryDesign {
  const design = listLibraryDesigns(database).find((row) => row.name === name);

  if (!design) throw new Error(`No Library design named ${name}`);

  return design;
}

async function renderCard(
  design: LibraryDesign,
  { omitCollection = false }: { omitCollection?: boolean } = {},
) {
  return render(
    <ImageStoreProvider store={store}>
      <LibraryCard design={design} omitCollection={omitCollection} press={IDLE_PRESS} />
    </ImageStoreProvider>,
  );
}

test("the card renders the Cover from the store", async () => {
  const designId = createDesign(database, { name: "Wool coat" }, 500).id;

  await attach(designId, "sketch", "sketch bytes", 1000);
  await attach(designId, "final", "final bytes", 2000);

  const design = libraryDesign("Wool coat");

  await renderCard(design);

  const cover = screen.getByLabelText("Cover of Wool coat");

  // expo-image normalizes a source to its list form.
  expect(cover.props.source).toEqual([{ uri: store.uri(design.cover!) }]);
  expect(screen.queryByTestId("empty-cover")).toBeNull();
});

test("an image-less design keeps the plate in place of a Cover", async () => {
  createDesign(database, { name: "Early concept" }, 500);

  const design = libraryDesign("Early concept");

  await renderCard(design);

  expect(design.cover).toBeNull();
  expect(screen.getByTestId("empty-cover")).toBeTruthy();
  expect(screen.getByTestId("empty-cover-frame")).toBeTruthy();
  expect(screen.getByText("No cover")).toBeTruthy();
  expect(screen.queryByLabelText(/^Cover of /)).toBeNull();
});

test("the tile names the Design in the card body, not twice in the plate", async () => {
  createDesign(database, { name: "Early concept" }, 500);

  const design = libraryDesign("Early concept");

  await renderCard(design);

  expect(screen.getAllByText("Early concept")).toHaveLength(1);
  expect(within(screen.getByTestId("empty-cover")).queryByText("Early concept")).toBeNull();
  expect(screen.getAllByRole("heading")).toHaveLength(1);
});

test("the tile prints one taxonomy line in the mono face", async () => {
  const category = createCategory(database, { name: "Blouse" }, 1);
  const collection = createCollection(database, { name: "Summer", year: 2026 }, 2);

  createDesign(
    database,
    { name: "Wool coat", categoryId: category.id, collectionId: collection.id },
    500,
  );

  await renderCard(libraryDesign("Wool coat"));

  expect(screen.getByText("Blouse · Summer (2026)")).toBeTruthy();
});

test("a Collection section leaves the repeated Collection out of the tile", async () => {
  const category = createCategory(database, { name: "Blouse" }, 1);
  const collection = createCollection(database, { name: "Summer", year: 2026 }, 2);

  createDesign(
    database,
    { name: "Wool coat", categoryId: category.id, collectionId: collection.id },
    500,
  );

  await renderCard(libraryDesign("Wool coat"), { omitCollection: true });

  expect(screen.getByText("Blouse")).toBeTruthy();
  expect(screen.queryByText("Blouse · Summer (2026)")).toBeNull();
});

test("an unfiled Design gets no placeholder taxonomy", async () => {
  createDesign(database, { name: "Early concept" }, 500);

  await renderCard(libraryDesign("Early concept"));

  expect(screen.queryByText("No category")).toBeNull();
  expect(screen.queryByText("No collection")).toBeNull();
});

test("the tile keeps Status in its pill", async () => {
  createDesign(database, { name: "Early concept" }, 500);

  await renderCard(libraryDesign("Early concept"));

  expect(screen.getByText("Concept")).toBeTruthy();
});
