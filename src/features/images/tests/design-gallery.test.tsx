import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import type { ImageKind } from "@/features/database";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { listDesignImages, writeImages, type ImageStore } from "@/features/images";
import { DesignGallery, ImagePickerProvider, ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import type { ImagePicker, ImagePickResult } from "../lib/image-picker";

const live = createSyncSubscribe();

let database: ReturnType<typeof createTempDatabase>["database"];
let dispose: () => void;
let sourceDirectory: string;
let store: ImageStore;
let disposeStore: () => void;

beforeEach(() => {
  ({ database, dispose } = createTempDatabase());
  sourceDirectory = mkdtempSync(join(tmpdir(), "jbdc-gallery-sources-"));
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

async function renderGallery(
  designId: string,
  picker: ImagePicker = { pick: async () => ({ kind: "cancelled" }) },
) {
  return render(
    <DatabaseProvider database={database} subscribe={live.subscribe}>
      <ImageStoreProvider store={store}>
        <ImagePickerProvider picker={picker}>
          <DesignGallery designId={designId} />
        </ImagePickerProvider>
      </ImageStoreProvider>
    </DatabaseProvider>,
  );
}

test("the journey rail shows one chip per kind, all four always", async () => {
  const design = createDesign(database, { name: "Early concept" });

  await renderGallery(design.id);

  for (const label of ["Inspiration", "Sketch", "Prototype", "Final"]) {
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  }
});

test("pressing a stage chip activates that stage", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);

  await renderGallery(design.id);

  await userEvent.press(screen.getByRole("button", { name: "Sketch" }));

  expect(screen.getByRole("button", { name: "Sketch" }).props.accessibilityState).toMatchObject({
    selected: true,
  });
});

test("the plus card attaches the picked files to the stage the owner chose", async () => {
  const design = createDesign(database, { name: "Wool coat" });
  const frontPath = join(sourceDirectory, "front.jpg");
  const backPath = join(sourceDirectory, "back.jpg");
  const picker: ImagePicker = {
    pick: jest.fn(async (): Promise<ImagePickResult> => ({
      kind: "picked",
      sourcePaths: [frontPath, backPath],
    })),
  };

  writeFileSync(frontPath, "front bytes");
  writeFileSync(backPath, "back bytes");
  await renderGallery(design.id, picker);

  await userEvent.press(screen.getByRole("button", { name: "Sketch" }));
  await userEvent.press(screen.getByRole("button", { name: "Add images to Sketch" }));

  // Let the picked files land, then report the write the way the app's change
  // listener does, so the live read re-runs without a manual refresh.
  await act(async () => {});
  await act(async () => live.notify("images"));

  expect(picker.pick).toHaveBeenCalledWith();
  expect(screen.getByRole("button", { name: "Sketch image 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Sketch image 2" })).toBeTruthy();
  expect(listDesignImages(database, design.id).map((image) => image.kind)).toEqual([
    "sketch",
    "sketch",
  ]);
});
