// Pure CSV serialization — every report's "Export CSV" button builds its
// rows into a plain 2D array and hands them here rather than pulling in an
// external CSV library for what's a genuinely small amount of escaping
// logic (RFC 4180: quote a field if it contains a comma, quote, or
// newline; a literal quote inside becomes two quotes).

// A leading =, +, -, or @ makes Excel/Sheets read the field as a formula on
// open (CSV/formula injection, CWE-1236) — a real risk here since some
// exported fields (a showroom's business name, a vehicle's admin notes) are
// user-entered and not otherwise restricted. Prefixing with a plain quote
// forces text interpretation in every spreadsheet app without changing the
// visible value.
function neutralizeFormulaPrefix(str: string): string {
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
}

function escapeCsvField(value: string | number): string {
  const str = neutralizeFormulaPrefix(String(value));
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  // CRLF per RFC 4180 — also what Excel expects to reliably show each row
  // on its own line rather than occasionally collapsing on LF-only input.
  return lines.join("\r\n");
}
