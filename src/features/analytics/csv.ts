// Pure CSV serialization — every report's "Export CSV" button builds its
// rows into a plain 2D array and hands them here rather than pulling in an
// external CSV library for what's a genuinely small amount of escaping
// logic (RFC 4180: quote a field if it contains a comma, quote, or
// newline; a literal quote inside becomes two quotes).

function escapeCsvField(value: string | number): string {
  const str = String(value);
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
