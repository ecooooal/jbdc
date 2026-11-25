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

test("a marker opens its note sheet with the note's text and created date", async () => {
  await galleryWithNotes(1);

  await userEvent.press(screen.getByRole("button", { name: "Note 1" }));

  const sheet = within(screen.getByTestId("note-sheet"));

  expect(sheet.getByText("First pass was fitted.")).toBeTruthy();
  expect(sheet.getByText("Jan 1, 1970")).toBeTruthy();
  expect(sheet.queryByRole("button", { name: "Delete note 1" })).toBeNull();
  expect(screen.queryByLabelText("Image detail")).toBeNull();
});

test("the notes button carries the current image's note count", async () => {
  await galleryWithNotes(3);

  expect(screen.getByRole("button", { name: "Notes (3)" })).toBeTruthy();
});

test("the menu offers Add note and See all notes, and Add note opens the composer", async () => {
  await galleryWithNotes(2);

  await userEvent.press(screen.getByRole("button", { name: "Notes (2)" }));

  expect(screen.getByRole("button", { name: "Add note" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "See all notes (2)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /hide/i })).toBeNull();

  await userEvent.press(screen.getByRole("button", { name: "Add note" }));

  expect(screen.getByLabelText("New note")).toBeTruthy();
});

test("See all notes opens the sheet with every note", async () => {
  await galleryWithNotes(2);

  await userEvent.press(screen.getByRole("button", { name: "Notes (2)" }));
  await userEvent.press(screen.getByRole("button", { name: "See all notes (2)" }));

  const sheet = within(screen.getByTestId("see-all-notes"));

  expect(sheet.getByText("Notes (2)")).toBeTruthy();
  expect(sheet.getByText("First pass was fitted.")).toBeTruthy();
  expect(sheet.getByText("Widened the shoulder.")).toBeTruthy();
  expect(sheet.getAllByText("Jan 1, 1970")).toHaveLength(2);
});

test("opening the image detail closes the notes menu", async () => {
  await galleryWithNotes(1);

  await userEvent.press(screen.getByRole("button", { name: "Notes (1)" }));
  expect(screen.getByRole("button", { name: "See all notes (1)" })).toBeTruthy();

  await userEvent.press(screen.getByRole("button", { name: "Open Sketch image 1 of 1" }));

  expect(screen.getByLabelText("Image detail")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "See all notes (1)" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Add note" })).toBeNull();
});

/** Opens the image detail on the gallery's only image, with the detail as the scope. */
async function openImageDetailNotes() {
  await userEvent.press(screen.getByRole("button", { name: "Open Sketch image 1 of 1" }));

  return within(screen.getByLabelText("Image detail"));
}

test("the image detail lists the image's notes read-only, with their created dates", async () => {
  await galleryWithNotes(2);

  const detail = await openImageDetailNotes();

  expect(detail.getByText("First pass was fitted.")).toBeTruthy();
  expect(detail.getByText("Widened the shoulder.")).toBeTruthy();
  expect(detail.getAllByText("Jan 1, 1970")).toHaveLength(2);
  expect(detail.getByRole("button", { name: "Delete note 1" })).toBeTruthy();
});

test("one press on the image detail's trash control arms; a second deletes", async () => {
  const design = await galleryWithNotes(2);

  const detail = await openImageDetailNotes();

  await userEvent.press(detail.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  expect(detail.getByText("Tap again to delete")).toBeTruthy();
  expect(listDesignImageNotes(database, design.id)).toHaveLength(2);

  await userEvent.press(detail.getByRole("button", { name: "Delete note 1" }));
  await settleNotes();

  expect(listDesignImageNotes(database, design.id)).toHaveLength(1);
  expect(detail.queryByText("First pass was fitted.")).toBeNull();
  expect(detail.getByText("Widened the shoulder.")).toBeTruthy();
});

test("closing and reopening the image detail disarms the trash, so the next press only arms", async () => {
  const design = await galleryWithNotes(2);

  let detail = await openImageDetailNotes();

  await userEvent.press(detail.getByRole("button", { name: "Delete note 1" }));
  expect(detail.getByText("Tap again to delete")).toBeTruthy();

  await userEvent.press(detail.getByRole("button", { name: "Close image detail" }));

  expect(screen.queryByLabelText("Image detail")).toBeNull();

  detail = await openImageDetailNotes();

  expect(detail.queryByText("Tap again to delete")).toBeNull();

  await userEvent.press(detail.getByRole("button", { name: "Delete note 1" }));

  expect(listDesignImageNotes(database, design.id)).toHaveLength(2);
  expect(detail.getByText("Tap again to delete")).toBeTruthy();
});

test("the image detail has no Add note control", async () => {
  await galleryWithNotes(1);

  const detail = await openImageDetailNotes();

  expect(detail.queryByRole("button", { name: "Add note" })).toBeNull();
  expect(detail.queryByLabelText("New note")).toBeNull();
});

test("the retired inline note controls are absent", async () => {
  await galleryWithNotes(3);

  expect(screen.queryByText("No notes yet. Add what you decided here, and why.")).toBeNull();
  expect(screen.queryByRole("button", { name: /^Show all \d+ notes$/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Show fewer notes" })).toBeNull();
  expect(screen.queryByText("First pass was fitted.")).toBeNull();
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
