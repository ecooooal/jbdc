import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { Dimensions } from "react-native";
import { act, fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { designs, type ImageKind } from "@/features/database";
import { DatabaseProvider } from "@/features/database/react";
import { createSyncSubscribe, createTempDatabase } from "@/features/database/testing";
import { createDesign } from "@/features/designs";
import { writeImages } from "@/features/images";
import { DesignGallery, ImagePickerProvider, ImageStoreProvider } from "@/features/images/react";
import { createTempImageStore } from "@/features/images/testing";
import type { ImageStore } from "../lib/image-store";
import { listDesignImageNotes, listDesignImages } from "../lib/records";
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
  imageStore: ImageStore = store,
) {
  return render(
    <DatabaseProvider database={database} subscribe={live.subscribe}>
      <ImageStoreProvider store={imageStore}>
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

test("the journey counter names the stage and the position across the journey", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);
  await renderGallery(design.id);

  expect(screen.getByLabelText("Final · 2 / 2")).toBeTruthy();
});

test("the filmstrip shows every image in journey order", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "inspiration", "inspiration bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);
  await renderGallery(design.id);

  const filmstrip = within(screen.getByTestId("gallery-filmstrip"));

  expect(filmstrip.getByRole("button", { name: "Inspiration image 1 of 2" })).toBeTruthy();
  expect(filmstrip.getByRole("button", { name: "Final image 2 of 2" })).toBeTruthy();
});

test("the active filmstrip thumb is selected and names its stage", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "inspiration", "inspiration bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);
  await renderGallery(design.id);

  const active = within(screen.getByTestId("gallery-filmstrip")).getByRole("button", {
    name: "Final image 2 of 2",
  });

  expect(active.props.accessibilityState).toMatchObject({ selected: true });
  expect(within(active).getByText("Final")).toBeTruthy();
});

test("pressing a filmstrip thumb moves the pager to that image", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "inspiration", "inspiration bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);
  await renderGallery(design.id);

  expect(screen.getByLabelText("Final · 2 / 2")).toBeTruthy();

  await userEvent.press(screen.getByRole("button", { name: "Inspiration image 1 of 2" }));

  expect(screen.getByLabelText("Inspiration · 1 / 2")).toBeTruthy();
});

test("a pager settle selects the page it landed on", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "inspiration", "inspiration bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);
  await renderGallery(design.id);

  expect(screen.getByLabelText("Final · 2 / 2")).toBeTruthy();

  const pageWidth = Dimensions.get("window").width;

  await fireEvent(screen.getByTestId("gallery-pager"), "momentumScrollEnd", {
    nativeEvent: { contentOffset: { x: 0 }, layoutMeasurement: { width: pageWidth } },
  });

  expect(screen.getByLabelText("Inspiration · 1 / 2")).toBeTruthy();
});

test("a design with no images keeps the dashed frame and no chrome", async () => {
  const design = createDesign(database, { name: "Early concept" });

  await renderGallery(design.id);

  expect(screen.getByTestId("gallery-pager-placeholder")).toBeTruthy();
  expect(screen.queryByTestId("gallery-journey-counter")).toBeNull();
  expect(screen.queryByTestId("gallery-filmstrip")).toBeNull();
});

test("an empty stage on a design with images keeps the filmstrip and drops the counter", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await attach(design.id, "final", "final bytes", 2000);
  await renderGallery(design.id);

  await userEvent.press(screen.getByRole("button", { name: "Prototype" }));

  expect(screen.getByTestId("gallery-pager-placeholder")).toBeTruthy();
  expect(screen.getByTestId("gallery-filmstrip")).toBeTruthy();
  expect(screen.queryByTestId("gallery-journey-counter")).toBeNull();
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

test("a copy that fails leaves the stage unchanged and says so", async () => {
  const design = createDesign(database, { name: "Wool coat" });
  const sourcePath = join(sourceDirectory, "front.jpg");
  const failing: ImageStore = {
    ...store,
    async copy() {
      throw new Error("unreadable picked file");
    },
  };
  const picker: ImagePicker = {
    pick: async () => ({ kind: "picked", sourcePaths: [sourcePath] }),
  };

  writeFileSync(sourcePath, "front bytes");
  await renderGallery(design.id, picker, failing);

  await userEvent.press(screen.getByRole("button", { name: "Add images to Final" }));
  await act(async () => {});

  expect(screen.getByText("The images could not be added.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Final image 1" })).toBeNull();
  expect(listDesignImages(database, design.id)).toEqual([]);
});

async function addNote(designId: string, text: string, now: number) {
  const [image] = listDesignImages(database, designId);

  await writeImages(database, store, designId, { kind: "add-note", imageId: image.id, text }, now);
}

test("Add note opens the composer", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await renderGallery(design.id);

  expect(screen.queryByLabelText("New note")).toBeNull();
  await userEvent.press(screen.getByRole("button", { name: "Add note" }));

  expect(screen.getByLabelText("New note")).toBeTruthy();
});

test("Cancel closes the composer without writing a note", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await renderGallery(design.id);

  await userEvent.press(screen.getByRole("button", { name: "Add note" }));
  await userEvent.type(screen.getByLabelText("New note"), "Widened the shoulder.");
  await userEvent.press(screen.getByRole("button", { name: "Cancel note" }));

  expect(screen.queryByLabelText("New note")).toBeNull();
  expect(listDesignImageNotes(database, design.id)).toEqual([]);
});

test("a note written in the composer is stored beside the current image", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await renderGallery(design.id);

  await userEvent.press(screen.getByRole("button", { name: "Add note" }));
  await userEvent.type(screen.getByLabelText("New note"), "Widened the shoulder.");
  await userEvent.press(screen.getByRole("button", { name: "Save note" }));

  await act(async () => {});
  await act(async () => live.notify("image_notes"));

  expect(listDesignImageNotes(database, design.id)).toEqual([
    expect.objectContaining({ text: "Widened the shoulder." }),
  ]);
  expect(screen.getByText("Widened the shoulder.")).toBeTruthy();
  expect(screen.queryByLabelText("New note")).toBeNull();
});

test("a note is removed in one press, with no confirmation", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await addNote(design.id, "First pass was fitted.", 2000);
  await renderGallery(design.id);

  await userEvent.press(screen.getByRole("button", { name: "Delete note 1" }));

  await act(async () => {});
  await act(async () => live.notify("image_notes"));

  expect(listDesignImageNotes(database, design.id)).toEqual([]);
  expect(screen.queryByText("First pass was fitted.")).toBeNull();
});

test("more notes than the block shows are one press away", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await addNote(design.id, "First pass was fitted.", 2000);
  await addNote(design.id, "Widened the shoulder.", 2100);
  await addNote(design.id, "Kept the collar high.", 2200);
  await renderGallery(design.id);

  await userEvent.press(screen.getByRole("button", { name: "Show all 3 notes" }));

  expect(screen.getByRole("button", { name: "Show fewer notes" })).toBeTruthy();
});

/** Opens the image detail on the pager's current image. */
async function openImageDetail(name: string) {
  await userEvent.press(screen.getByRole("button", { name }));
}

test("tapping the pager's image opens the image detail", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await renderGallery(design.id);
  await openImageDetail("Open Sketch image 1 of 1");

  expect(screen.getByLabelText("Image detail")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Close image detail" })).toBeTruthy();
});

test("the image detail offers one pill per kind", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await renderGallery(design.id);
  await openImageDetail("Open Sketch image 1 of 1");

  for (const label of ["Inspiration", "Sketch", "Prototype", "Final"]) {
    expect(screen.getByRole("button", { name: `Classify as ${label}` })).toBeTruthy();
  }
});

test("reclassifying a non-Cover image in the image detail changes the Cover on return", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await attach(design.id, "prototype", "prototype bytes", 2000);
  await renderGallery(design.id);

  // The newer image of the higher kind is the Cover, so the sketch is the one
  // the owner has to reach for.
  expect(screen.getByRole("button", { name: "Open Prototype image 2 of 2" })).toBeTruthy();

  await userEvent.press(screen.getByRole("button", { name: "Sketch" }));
  await openImageDetail("Open Sketch image 1 of 2");
  await userEvent.press(screen.getByRole("button", { name: "Classify as Final" }));
  await act(async () => {});
  await act(async () => live.notify("images"));
  await userEvent.press(screen.getByRole("button", { name: "Close image detail" }));

  expect(listDesignImages(database, design.id).map((image) => image.kind)).toEqual([
    "final",
    "prototype",
  ]);
  expect(screen.getByRole("button", { name: "Open Final image 2 of 2" })).toBeTruthy();
});

test("Remove asks once before deleting the image and its notes", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await addNote(design.id, "First pass was fitted.", 2000);
  await renderGallery(design.id);
  await openImageDetail("Open Sketch image 1 of 1");

  await userEvent.press(screen.getByRole("button", { name: "Remove image" }));

  expect(screen.getByText("Remove this image and its notes?")).toBeTruthy();

  await userEvent.press(screen.getByRole("button", { name: "Remove image and notes" }));
  await act(async () => {});
  await act(async () => live.notify("images"));
  await act(async () => live.notify("image_notes"));

  expect(listDesignImages(database, design.id)).toEqual([]);
  expect(listDesignImageNotes(database, design.id)).toEqual([]);
  expect(screen.queryByText("Remove this image and its notes?")).toBeNull();
});

test("a removal that does not land keeps the image open and says so", async () => {
  const design = createDesign(database, { name: "Wool coat" });

  await attach(design.id, "sketch", "sketch bytes", 1000);
  await renderGallery(design.id);
  await openImageDetail("Open Sketch image 1 of 1");

  // The Design leaves the catalog while the image detail is open, so the removal
  // answers design-missing; the live read has not run, so the gallery still
  // shows the image the owner is trying to remove.
  database.db.update(designs).set({ deletedAt: 2000 }).where(eq(designs.id, design.id)).run();

  await userEvent.press(screen.getByRole("button", { name: "Remove image" }));
  await userEvent.press(screen.getByRole("button", { name: "Remove image and notes" }));
  await act(async () => {});

  expect(screen.getByLabelText("Image detail")).toBeTruthy();
  expect(screen.getByText("The image could not be removed.")).toBeTruthy();
  expect(listDesignImages(database, design.id)).toHaveLength(1);
});
