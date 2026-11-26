/**
 * Fixtures shared by the gallery's rendered suites. Call
 * `setupDesignGalleryFixtures()` at the top of a suite to give every test a
 * fresh migrated database, a real temp Image store, and a scratch directory
 * holding the source files a pick would hand the plus card. `database`, `store`
 * and `live` are the values for the test that is running; the rest build what a
 * gallery needs.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render, fireEvent } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ImageKind } from "@/features/database";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { writeImages } from "@/features/images";
import { DesignGallery, ImagePickerProvider, ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import type { ImagePicker } from "../lib/image-picker";
import type { ImageStore } from "../lib/image-store";
import { listDesignImages } from "../lib/records";

/** The sync subscribe the provider uses; a test notifies it after a write. */
export const live = createSyncSubscribe();

/** The database this test's gallery reads and writes. */
export let database: ReturnType<typeof createTempDatabase>["database"];
/** The Image store this test's gallery copies into. */
export let store: ImageStore;

let dispose: () => void;
let disposeStore: () => void;
let sourceDirectory: string;

/** Registers the per-test setup both gallery suites need. */
export function setupDesignGalleryFixtures(): void {
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
}

/** A Design the gallery shows. */
export function galleryDesign(name: string) {
  return createDesign(database, { name });
}

/** One stored image, its file copied by the real store. */
export async function attach(designId: string, kind: ImageKind, bytes: string, now: number) {
  const sourcePath = sourceFile(`${kind}-${now}.jpg`, bytes);

  await writeImages(
    database,
    store,
    designId,
    { kind: "attach", images: [{ sourcePath, kind }] },
    now,
  );
}

/** A source file on disk, the way a picked image arrives. */
export function sourceFile(name: string, bytes: string): string {
  const path = join(sourceDirectory, name);

  writeFileSync(path, bytes);

  return path;
}

/** One note on the Design's first image, as the write path stores it. */
export async function addNote(designId: string, text: string, now: number) {
  const [image] = listDesignImages(database, designId);

  await writeImages(database, store, designId, { kind: "add-note", imageId: image.id, text }, now);
}

/** The gallery inside the providers a rendered surface reads through. */
export async function renderGallery(
  designId: string,
  picker: ImagePicker = { pick: async () => ({ kind: "cancelled" }) },
  imageStore: ImageStore = store,
) {
  const view = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <DatabaseProvider database={database} subscribe={live.subscribe}>
        <ImageStoreProvider store={imageStore}>
          <ImagePickerProvider picker={picker}>
            <DesignGallery designId={designId} />
          </ImagePickerProvider>
        </ImageStoreProvider>
      </DatabaseProvider>
    </SafeAreaProvider>,
  );

  // The pager sizes its pages from the plate it was given, so a rendered
  // suite has to hand the plate the width a device layout would.
  await fireEvent.layout(view.getByTestId("gallery-plate"), {
    width: Dimensions.get("window").width,
    height: 0,
    x: 0,
    y: 0,
  });

  return view;
}
