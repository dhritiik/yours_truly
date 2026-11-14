/**
 * Invite expiry. The end date is stored exactly as typed, "DD/MM/YYYY".
 *
 * endOfDay() turns it into the last millisecond of that day in the LOCAL
 * timezone of whoever publishes — never `new Date("YYYY-MM-DD")`, which is
 * parsed as UTC midnight and lands on the wrong day/time in Firestore.
 * Returns null for anything that isn't a real DD/MM/YYYY date.
 */
export function endOfDay(ddmmyyyy?: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmyyyy?.trim() ?? "");
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d, 23, 59, 59, 999);
  // new Date() rolls 31/02 over into March — reject instead of guessing.
  return date.getDate() === d && date.getMonth() === mo - 1 ? date : null;
}
