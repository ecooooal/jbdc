import { act, screen, userEvent, within } from "@testing-library/react-native";
import { listDesignImageNotes } from "../lib/records";
import {
  addNote,
  attach,
  database,
  galleryDesign,
  live,
  renderGallery,
  setupDesignGalleryFixtures,
} from "./design-gallery-fixtures";

setupDesignGalleryFixtures();

const NOTE_TEXTS = [
  "First pass was fitted.",
  "Widened the shoulder.",
  "Kept the collar high.",
  "Shortened the sleeve.",
  "Moved the pocket.",
  "Lowered the hem.",
];

/** A Design whose current image carries the given number of notes, oldest first. */
async function galleryWithNotes(count: number) {
  const design = galleryDesign("Wool coat");

  await attach(design.id, "sketch", "sketch bytes", 1000);
  for (let index = 0; index < count; index += 1) {
    await addNote(design.id, NOTE_TEXTS[index], 2000 + index);
  }
  await renderGallery(design.id);

  return design;
}

/** Lets a declared write land and reports it the way the app's listener does. */
async function settleNotes() {
  await act(async () => {});
  await act(async () => live.notify("image_notes"));
}

/** The notes sheet the pill opens. */
async function openNotesSheet(count: number) {
  await userEvent.press(screen.getByRole("button", { name: `Notes (${count})` }));

  return within(screen.getByTestId("notes-sheet"));
}

test("the notes button carries the current image's note count", async () => {
  await galleryWithNotes(3);

  expect(screen.getByRole("button", { name: "Notes (3)" })).toBeTruthy();
});

test("the notes button opens one sheet with every note and its date", async () => {
  await galleryWithNotes(2);

  const sheet = await openNotesSheet(2);

  expect(sheet.getByText("Notes (2)")).toBeTruthy();
  expect(sheet.getByText("First pass was fitted.")).toBeTruthy();
  expect(sheet.getByText("Widened the shoulder.")).toBeTruthy();
  expect(sheet.getAllByText("Jan 1, 1970")).toHaveLength(2);
});

test("the Add note row expands the inline composer", async () => {
  await galleryWithNotes(1);

  const sheet = await openNotesSheet(1);

  expect(sheet.getByRole("button", { name: "Add note" })).toBeTruthy();
  expect(sheet.queryByLabelText("New note")).toBeNull();

  await userEvent.press(sheet.getByRole("button", { name: "Add note" }));

  expect(sheet.getByLabelText("New note")).toBeTruthy();
});

test("Save note is disabled while the draft is empty", async () => {
  await galleryWithNotes(1);

  const sheet = await openNotesSheet(1);

  await userEvent.press(sheet.getByRole("button", { name: "Add note" }));

  expect(sheet.getByRole("button", { name: "Save note" })).toBeDisabled();

  await userEvent.type(sheet.getByLabelText("New note"), "   ");

  expect(sheet.getByRole("button", { name: "Save note" })).toBeDisabled();

  await userEvent.type(sheet.getByLabelText("New note"), "Widened the shoulder.");

  expect(sheet.getByRole("button", { name: "Save note" })).toBeEnabled();
});

test("Save stores the note and leaves the sheet open with the note listed", async () => {
  const design = await galleryWithNotes(0);

  const sheet = await openNotesSheet(0);

  await userEvent.press(sheet.getByRole("button", { name: "Add note" }));
  await userEvent.type(sheet.getByLabelText("New note"), "Widened the shoulder.");
  await userEvent.press(sheet.getByRole("button", { name: "Save note" }));
  await settleNotes();

  expect(listDesignImageNotes(database, design.id)).toEqual([
    expect.objectContaining({ text: "Widened the shoulder." }),
  ]);

  const stillOpen = within(screen.getByTestId("notes-sheet"));

  expect(stillOpen.getByText("Notes (1)")).toBeTruthy();
  expect(stillOpen.getByText("Widened the shoulder.")).toBeTruthy();
  expect(stillOpen.queryByLabelText("New note")).toBeNull();
  expect(screen.getByRole("button", { name: "Notes (1)" })).toBeTruthy();
});

test("Cancel collapses the composer without writing a note", async () => {
  const design = await galleryWithNotes(0);

  const sheet = await openNotesSheet(0);

  await userEvent.press(sheet.getByRole("button", { name: "Add note" }));
  await userEvent.type(sheet.getByLabelText("New note"), "Widened the shoulder.");
  await userEvent.press(sheet.getByRole("button", { name: "Cancel note" }));

  expect(sheet.queryByLabelText("New note")).toBeNull();
  expect(sheet.getByRole("button", { name: "Add note" })).toBeTruthy();
  expect(listDesignImageNotes(database, design.id)).toEqual([]);
});

test("one press on a note's trash control arms it; a second deletes it", async () => {
  const design = await galleryWithNotes(2);

  const sheet = await openNotesSheet(2);

  await userEvent.press(sheet.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  expect(sheet.getByText("Tap again to delete")).toBeTruthy();
  expect(listDesignImageNotes(database, design.id)).toHaveLength(2);

  await userEvent.press(sheet.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  expect(listDesignImageNotes(database, design.id)).toHaveLength(1);
  expect(sheet.queryByText("First pass was fitted.")).toBeNull();
  expect(sheet.getByText("Widened the shoulder.")).toBeTruthy();
});

test("the photograph carries no numbered markers and no notes menu", async () => {
  await galleryWithNotes(3);

  expect(screen.queryByRole("button", { name: "Note 1" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Note 2" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Show 2 more notes" })).toBeNull();
  expect(screen.queryByRole("button", { name: "See all notes (3)" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Add note" })).toBeNull();
  expect(screen.queryByText("First pass was fitted.")).toBeNull();
});

/** Opens the image detail on the gallery's only image, with the detail as the scope. */
async function openImageDetail() {
  await userEvent.press(screen.getByRole("button", { name: "Open Sketch image 1 of 1" }));

  return within(screen.getByLabelText("Image detail"));
}

test("the image detail keeps the image's notes and has no Add note", async () => {
  await galleryWithNotes(2);

  const detail = await openImageDetail();

  expect(detail.getByText("First pass was fitted.")).toBeTruthy();
  expect(detail.getByText("Widened the shoulder.")).toBeTruthy();
  expect(detail.getAllByText("Jan 1, 1970")).toHaveLength(2);
  expect(detail.getByRole("button", { name: "Delete note 1" })).toBeTruthy();
  expect(detail.queryByRole("button", { name: "Add note" })).toBeNull();
  expect(detail.queryByLabelText("New note")).toBeNull();
});
