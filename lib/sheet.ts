const DEFAULT_SHEET_ID = "1AkQ-vfBzFHeGWorLeM0rwBXwwmmlqbMNTdtmUyLGjVY";

export interface CalendarEvent {
  month: string;
  rawDate: string;
  occasion: string;
  type: string;
  contentAngle: string;
  textUsed: string;
  parsedDate: Date | null;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export async function fetchCalendar(sheetId: string = DEFAULT_SHEET_ID): Promise<CalendarEvent[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch calendar sheet: ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();
  return parseCalendar(csv);
}

export function parseCalendar(csv: string): CalendarEvent[] {
  const rows = parseCsv(csv);
  const events: CalendarEvent[] = [];
  // Locate the header row (the row that starts with "Months")
  const headerIdx = rows.findIndex(r => (r[0] || "").trim().toLowerCase() === "months");
  if (headerIdx === -1) return events;

  const year = new Date().getUTCFullYear();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const month = (row[0] || "").trim();
    const rawDate = (row[1] || "").trim();
    const occasion = (row[2] || "").trim();

    // Stop at the empty separator row before "Weekly Planner"
    if (!month && !rawDate && !occasion) break;
    if (!occasion) continue;

    const parsedDate = parseEventDate(rawDate, year);
    events.push({
      month,
      rawDate,
      occasion,
      type: (row[3] || "").trim(),
      contentAngle: (row[4] || "").trim(),
      textUsed: (row[5] || "").trim(),
      parsedDate,
    });
  }
  return events;
}

// Parses date strings like "Jan-01", "Feb-14", "Jan (varies)", "Entire Month", "Mar (seasonal)"
// Returns null when the date is not a single concrete day.
export function parseEventDate(raw: string, year: number): Date | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^([A-Za-z]{3,})[-\s]?(\d{1,2})$/);
  if (!match) return null;
  const monthKey = match[1].slice(0, 3).toLowerCase();
  const day = parseInt(match[2], 10);
  const month = MONTH_INDEX[monthKey];
  if (month === undefined || isNaN(day) || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month, day));
}

// Minimal RFC-4180 style CSV parser that handles quoted fields with commas and escaped quotes.
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n") {
        row.push(field); field = "";
        rows.push(row); row = [];
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
  }
  // Flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Returns events whose parsedDate equals the target (UTC day match).
export function eventsOnDate(events: CalendarEvent[], target: Date): CalendarEvent[] {
  const t = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return events.filter(e => {
    if (!e.parsedDate) return false;
    const d = Date.UTC(e.parsedDate.getUTCFullYear(), e.parsedDate.getUTCMonth(), e.parsedDate.getUTCDate());
    return d === t;
  });
}
