const NOTE_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** One note's created date, in the same short shape as the Design header's dates. */
export function formatNoteDate(createdAt: number): string {
  return NOTE_DATE_FORMAT.format(createdAt);
}
