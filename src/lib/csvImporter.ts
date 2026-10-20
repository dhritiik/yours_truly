/**
 * csvImporter.ts
 * Parses a guest CSV into Guest records.
 *
 * Every wedding has a different set of events, and every spreadsheet has a
 * different set of columns, so NOTHING about the layout is assumed here:
 *
 *   - The guest-name column can be any column, not just the first one.
 *   - Event columns are matched to this wedding's events by name, and any
 *     column the user disagrees with can be re-pointed or skipped.
 *   - Extra columns (serial numbers, phone, notes, side-of-family, …) can be
 *     skipped without breaking the import.
 *
 * The parser produces a *suggested* mapping; the UI lets the user correct it
 * before importing. `buildGuestsFromCsv` then uses whatever mapping it is given.
 *
 * Interpretation of a seat cell:
 *   "Family" (case-insensitive)  → familySeatCount (default 4)
 *   "2", "3", …                  → exact seat count
 *   "Y" / "Yes" / "x" / "✓"      → 1 seat
 *   "N" / "No" / "-" / ""        → NOT invited (0)
 */

import { Guest, WeddingEvent } from "./types";

export const DEFAULT_FAMILY_SEAT_COUNT = 4;

/** Sentinel mapping values. Any other value is a real event_id. */
export const SKIP_COLUMN = "__skip__";
export const NAME_COLUMN = "__name__";

/** header -> event_id | NAME_COLUMN | SKIP_COLUMN */
export type ColumnMapping = Record<string, string>;

export interface CsvRow {
  /** Raw, unparsed cell values keyed by column header. */
  cells: Record<string, string>;
}

export interface CsvImportResult {
  /** Every column header found in the file, in original order. */
  headers: string[];
  rows: CsvRow[];
  /** Best-guess mapping. The user may edit this before importing. */
  mapping: ColumnMapping;
}

// ---- cell parsing -----------------------------------------------------------

const YES_VALUES = new Set(["y", "yes", "x", "✓", "true"]);
const NO_VALUES = new Set(["", "-", "–", "—", "n", "no", "false", "0"]);

export function parseSeatCell(
  value: string,
  familySeatCount: number = DEFAULT_FAMILY_SEAT_COUNT
): number {
  const v = value.trim().toLowerCase();
  if (NO_VALUES.has(v)) return 0;
  if (v === "family") return familySeatCount;
  if (YES_VALUES.has(v)) return 1;
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

// ---- low-level CSV parsing --------------------------------------------------

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Splits one CSV line, honouring quoted fields and escaped `""` quotes. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"'; // escaped quote inside a quoted field
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

/**
 * Makes headers unique and non-empty so they can safely be used as object keys.
 * Blank columns become "Column 3", duplicates become "Marriage (2)".
 */
function normalizeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = h.trim() || `Column ${i + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

// ---- mapping suggestion -----------------------------------------------------

const NAME_HEADER_HINTS = [
  "name",
  "guest",
  "guestname",
  "fullname",
  "guestfullname",
  "invitee",
  "inviteename",
];

/** Picks the column most likely to hold the guest's name. */
function suggestNameHeader(headers: string[]): string | null {
  // Prefer an exact hint match ("Name", "Guest Name", …).
  const exact = headers.find((h) => NAME_HEADER_HINTS.includes(normalize(h)));
  if (exact) return exact;
  // Otherwise any header that merely contains "name".
  return headers.find((h) => normalize(h).includes("name")) ?? null;
}

/**
 * Matches a CSV column header to one of this wedding's events.
 * Exact (normalized) matches win; containment is only allowed for headers of
 * 3+ characters so that short junk columns don't latch onto an event.
 */
function matchEvent(header: string, events: WeddingEvent[]): WeddingEvent | null {
  const h = normalize(header);
  if (!h) return null;

  const exact = events.find(
    (e) => normalize(e.event_name) === h || normalize(e.event_group ?? "") === h
  );
  if (exact) return exact;

  if (h.length < 3) return null;

  return (
    events.find((e) => {
      const name = normalize(e.event_name);
      const group = normalize(e.event_group ?? "");
      return (
        (name.length >= 3 && (name.includes(h) || h.includes(name))) ||
        (group.length >= 3 && (group.includes(h) || h.includes(group)))
      );
    }) ?? null
  );
}

/**
 * Builds a suggested mapping: one NAME column, event columns matched by name,
 * everything else skipped. Each event is claimed by at most one column.
 */
export function suggestMapping(
  headers: string[],
  events: WeddingEvent[]
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const nameHeader = suggestNameHeader(headers);
  const claimed = new Set<string>();

  for (const header of headers) {
    if (header === nameHeader) {
      mapping[header] = NAME_COLUMN;
      continue;
    }
    const event = matchEvent(header, events);
    if (event && !claimed.has(event.event_id)) {
      claimed.add(event.event_id);
      mapping[header] = event.event_id;
    } else {
      mapping[header] = SKIP_COLUMN;
    }
  }

  return mapping;
}

// ---- main parser ------------------------------------------------------------

export function parseGuestCsv(
  csvText: string,
  events: WeddingEvent[]
): CsvImportResult {
  const lines = csvText
    .replace(/^\uFEFF/, "") // strip the UTF-8 BOM Excel/Sheets like to add
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) {
    return { headers: [], rows: [], mapping: {} };
  }

  const [headerLine, ...dataLines] = lines;
  const headers = normalizeHeaders(parseLine(headerLine));

  const rows: CsvRow[] = dataLines.map((line) => {
    const cols = parseLine(line);
    const cells: Record<string, string> = {};
    headers.forEach((h, i) => {
      cells[h] = cols[i] ?? "";
    });
    return { cells };
  });

  return { headers, rows, mapping: suggestMapping(headers, events) };
}

// ---- mapping helpers (shared by the UI and the importer) --------------------

export function getNameHeader(mapping: ColumnMapping): string | null {
  return Object.keys(mapping).find((h) => mapping[h] === NAME_COLUMN) ?? null;
}

/** Column headers that are mapped to a real event, in column order. */
export function getEventHeaders(
  headers: string[],
  mapping: ColumnMapping
): string[] {
  return headers.filter(
    (h) => mapping[h] !== NAME_COLUMN && mapping[h] !== SKIP_COLUMN
  );
}

/** Events assigned to more than one column — ambiguous, so the UI must flag it. */
export function getDuplicateEventIds(mapping: ColumnMapping): string[] {
  const counts = new Map<string, number>();
  for (const value of Object.values(mapping)) {
    if (value === NAME_COLUMN || value === SKIP_COLUMN) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

/** How many rows actually have a name — the rest are dropped on import. */
export function countNamedRows(
  rows: CsvRow[],
  nameHeader: string | null
): number {
  if (!nameHeader) return 0;
  return rows.filter((r) => (r.cells[nameHeader] ?? "").trim() !== "").length;
}

// ---- guest construction -----------------------------------------------------

/**
 * Converts parsed rows into Guest objects ready for Firestore, using the
 * (possibly user-corrected) mapping. Returns records WITHOUT guest_id — the
 * caller assigns UUIDs and slugs.
 */
export function buildGuestsFromCsv(
  rows: CsvRow[],
  mapping: ColumnMapping,
  weddingId: string,
  familySeatCount: number = DEFAULT_FAMILY_SEAT_COUNT
): Omit<Guest, "guest_id">[] {
  const nameHeader = getNameHeader(mapping);
  if (!nameHeader) return [];

  const eventColumns = Object.entries(mapping).filter(
    ([, value]) => value !== NAME_COLUMN && value !== SKIP_COLUMN
  );

  return rows
    .filter((row) => (row.cells[nameHeader] ?? "").trim() !== "")
    .map((row) => {
      const event_seats: Record<string, number> = {};
      for (const [header, eventId] of eventColumns) {
        event_seats[eventId] = parseSeatCell(
          row.cells[header] ?? "",
          familySeatCount
        );
      }

      return {
        wedding_id: weddingId,
        name: row.cells[nameHeader].trim(),
        guest_token: crypto.randomUUID(),
        event_seats,
        // invited_events intentionally omitted — deprecated, always derivable
        // from event_seats.
        rsvp_status: "Pending" as const,
        created_at: new Date().toISOString(),
        imported_via: "csv" as const,
      };
    });
}
