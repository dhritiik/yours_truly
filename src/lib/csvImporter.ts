/**
 * csvImporter.ts
 * Parses the guest CSV format used by YoursTruly into Guest records.
 *
 * CSV format expected:
 *   Name, EventA, EventB, EventC, ...
 *   "Guest Name", "Family" | number | "-" | "", ...
 *
 * Interpretation of cell values:
 *   "Family" (case-insensitive)  → FAMILY_SEAT_COUNT (default 4)
 *   "1", "2", "3", ...           → exact seat count
 *   "-"                          → NOT invited (seat count 0)
 *   "" (empty)                   → NOT invited (seat count 0)
 */

import { Guest, WeddingEvent } from "./types";

const FAMILY_SEAT_COUNT = 4;

export interface CsvGuestRow {
  name: string;
  /** Map from the raw CSV column header to parsed seat count */
  columnSeats: Record<string, number>;
}

export interface CsvImportResult {
  rows: CsvGuestRow[];
  csvHeaders: string[];         // all column headers found (excluding "Name")
  unmatchedHeaders: string[];   // headers that couldn't be matched to any event
  matchedMap: Record<string, string>; // CSV header → event_id
}

// ---- helpers ----------------------------------------------------------------

function parseSeatCell(value: string): number {
  const v = value.trim().toLowerCase();
  if (v === "" || v === "-") return 0;
  if (v === "family") return FAMILY_SEAT_COUNT;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Fuzzy-match a CSV column header to an event name.
 * Strips punctuation & spaces, compares lower-case prefixes.
 */
function fuzzyMatch(header: string, events: WeddingEvent[]): WeddingEvent | null {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const h = norm(header);
  // exact match first
  const exact = events.find((e) => norm(e.event_name) === h || norm(e.event_group ?? "") === h);
  if (exact) return exact;
  // prefix / contains match
  const partial = events.find(
    (e) => norm(e.event_name).includes(h) || h.includes(norm(e.event_name).slice(0, 4))
  );
  return partial ?? null;
}

// ---- main parser ------------------------------------------------------------

export function parseGuestCsv(
  csvText: string,
  events: WeddingEvent[]
): CsvImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], csvHeaders: [], unmatchedHeaders: [], matchedMap: {} };
  }

  // Parse CSV respecting quoted fields
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let inQuote = false;
    let current = "";
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const [headerLine, ...dataLines] = lines;
  const headers = parseRow(headerLine);
  const [, ...eventHeaders] = headers; // first col = "Name"

  // Build match map
  const matchedMap: Record<string, string> = {};
  const unmatchedHeaders: string[] = [];

  for (const h of eventHeaders) {
    const matched = fuzzyMatch(h, events);
    if (matched) {
      matchedMap[h] = matched.event_id;
    } else {
      unmatchedHeaders.push(h);
    }
  }

  const rows: CsvGuestRow[] = [];
  for (const line of dataLines) {
    const cols = parseRow(line);
    const name = cols[0];
    if (!name) continue;

    const columnSeats: Record<string, number> = {};
    for (let i = 0; i < eventHeaders.length; i++) {
      const header = eventHeaders[i];
      const raw = cols[i + 1] ?? "";
      columnSeats[header] = parseSeatCell(raw);
    }

    rows.push({ name, columnSeats });
  }

  return { rows, csvHeaders: eventHeaders, unmatchedHeaders, matchedMap };
}

/**
 * Convert parsed CSV rows into Guest objects ready for Firestore.
 * Returns guest records WITHOUT guest_id (caller assigns UUIDs).
 */
export function buildGuestsFromCsvRows(
  rows: CsvGuestRow[],
  matchedMap: Record<string, string>, // csvHeader → event_id
  weddingId: string
): Omit<Guest, "guest_id">[] {
  return rows.map((row) => {
    const event_seats: Record<string, number> = {};
    for (const [header, eventId] of Object.entries(matchedMap)) {
      event_seats[eventId] = row.columnSeats[header] ?? 0;
    }
    const invited_events = Object.entries(event_seats)
      .filter(([, seats]) => seats > 0)
      .map(([eid]) => eid);

    return {
      wedding_id: weddingId,
      name: row.name,
      guest_token: crypto.randomUUID(),
      event_seats,
      invited_events,
      rsvp_status: "Pending" as const,
      created_at: new Date().toISOString(),
      imported_via: "csv" as const,
    };
  });
}
