import { act, screen, userEvent, within } from "@testing-library/react-native";
import { formatNoteDate } from "../components/note-date";
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

test("a marker opens its note sheet with the note's text and created date", async () => {
  await galleryWithNotes(1);

  await userEvent.press(screen.getByRole("button", { name: "Note 1" }));

  const sheet = within(screen.getByTestId("note-sheet"));

  expect(sheet.getByText("First pass was fitted.")).toBeTruthy();
  expect(sheet.getByText(formatNoteDate(2000))).toBeTruthy();
  expect(sheet.queryByRole("button", { name: "Delete note 1" })).toBeNull();
  expect(screen.queryByLabelText("Image detail")).toBeNull();
});

test("the overflow marker opens see-all with every note, oldest first", async () => {
  await galleryWithNotes(6);

  await userEvent.press(screen.getByRole("button", { name: "Show 2 more notes" }));

  const sheet = within(screen.getByTestId("see-all-notes"));

  expect(sheet.getByText("Notes (6)")).toBeTruthy();
  for (const text of NOTE_TEXTS) {
    expect(sheet.getByText(text)).toBeTruthy();
  }
});

test("one press on see-all's trash control arms without deleting; a second deletes", async () => {
  const design = await galleryWithNotes(5);

  await userEvent.press(screen.getByRole("button", { name: "Show 1 more note" }));

  const sheet = within(screen.getByTestId("see-all-notes"));

  await userEvent.press(sheet.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  expect(sheet.getByText("Tap again to delete")).toBeTruthy();
  expect(listDesignImageNotes(database, design.id)).toHaveLength(5);

  await userEvent.press(sheet.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  expect(listDesignImageNotes(database, design.id)).toHaveLength(4);
  expect(sheet.queryByText("First pass was fitted.")).toBeNull();
});

test("deleting a note renumbers the remaining markers", async () => {
  const design = await galleryWithNotes(5);

  await userEvent.press(screen.getByRole("button", { name: "Show 1 more note" }));

  const sheet = within(screen.getByTestId("see-all-notes"));

  await userEvent.press(sheet.getByRole("button", { name: "Delete note 1" }));
  await userEvent.press(sheet.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  await userEvent.press(sheet.getByRole("button", { name: "Close all notes" }));

  expect(listDesignImageNotes(database, design.id)).toHaveLength(4);
  for (const number of [1, 2, 3, 4]) {
    expect(screen.getByRole("button", { name: `Note ${number}` })).toBeTruthy();
  }
  expect(screen.queryByRole("button", { name: /more note/ })).toBeNull();
});
