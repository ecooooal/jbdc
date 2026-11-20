import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, screen } from "@testing-library/react-native";
import type { ImageKind } from "@/features/database";
import { createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { writeImages, type ImageStore } from "@/features/images";
import { ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import { listLibraryDesigns, type LibraryDesign } from "@/features/library";
import { LibraryCard } from "@/features/library/react";
import type { CardDensity } from "@/features/settings";

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

function attach(designId: string, kind: ImageKind, bytes: string, now: number) {
  const sourcePath = join(sourceDirectory, `${kind}-${now}.jpg`);

  writeFileSync(sourcePath, bytes);
  writeImages(database, store, designId, { kind: "attach", images: [{ sourcePath, kind }] }, now);
}

function libraryDesign(name: string): LibraryDesign {
  const design = listLibraryDesigns(database).find((row) => row.name === name);

  if (!design) throw new Error(`No Library design named ${name}`);

  return design;
}

async function renderCard(design: LibraryDesign, density: CardDensity) {
  return render(
    <ImageStoreProvider store={store}>
      <LibraryCard design={design} density={density} onPress={() => {}} />
    </ImageStoreProvider>,
  );
}

test("the card renders the Cover from the store", async () => {
  const designId = createDesign(database, { name: "Wool coat" }, 500).id;

  attach(designId, "sketch", "sketch bytes", 1000);
  attach(designId, "final", "final bytes", 2000);

  const design = libraryDesign("Wool coat");

  await renderCard(design, 2);

  const cover = screen.getByLabelText("Cover of Wool coat");

  // expo-image normalizes a source to its list form.
  expect(cover.props.source).toEqual([{ uri: store.uri(design.cover!) }]);
  expect(screen.queryByTestId("cover-placeholder")).toBeNull();
});

test("the card shows the Cover at every density", async () => {
  const designId = createDesign(database, { name: "Wool coat" }, 500).id;

  attach(designId, "prototype", "prototype bytes", 1000);

  const design = libraryDesign("Wool coat");

  for (const density of [1, 2, 4] as const) {
    const view = await renderCard(design, density);

    expect(screen.getByLabelText("Cover of Wool coat")).toBeTruthy();

    await view.unmount();
  }
});

test("an image-less design keeps the quiet placeholder in the grid", async () => {
  createDesign(database, { name: "Early concept" }, 500);

  const design = libraryDesign("Early concept");

  await renderCard(design, 2);

  expect(design.cover).toBeNull();
  expect(screen.getByTestId("cover-placeholder")).toBeTruthy();
  expect(screen.queryByLabelText(/^Cover of /)).toBeNull();
});
