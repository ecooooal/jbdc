const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** A date in the short form Detail and its block read it. */
export function formatShortDate(timestamp: number): string {
  return SHORT_DATE_FORMAT.format(timestamp);
}

/** A date whose own spaces never break, so a wrapping line never splits one. */
export function unbreakableDate(timestamp: number): string {
  return formatShortDate(timestamp).replaceAll(" ", "\u00A0");
}
