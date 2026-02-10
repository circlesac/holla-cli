import type { OutputFormat } from "../types/index.ts";

export function formatOutput(
  data: unknown,
  format: OutputFormat,
  columns?: { key: string; label: string; width?: number }[],
): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "plain":
      return formatPlain(data, columns);
    case "table":
    default:
      return formatTable(data, columns);
  }
}

export function printOutput(
  data: unknown,
  format: OutputFormat,
  columns?: { key: string; label: string; width?: number }[],
): void {
  console.log(formatOutput(data, format, columns));
}

function formatPlain(
  data: unknown,
  columns?: { key: string; label: string }[],
): string {
  if (!Array.isArray(data)) {
    if (typeof data === "object" && data !== null) {
      return Object.entries(data as Record<string, unknown>)
        .map(([k, v]) => `${k}\t${v}`)
        .join("\n");
    }
    return String(data);
  }

  const rows = data as Record<string, unknown>[];
  if (rows.length === 0) return "";

  const keys = columns?.map((c) => c.key) ?? Object.keys(rows[0]!);
  return rows.map((row) => keys.map((k) => row[k] ?? "").join("\t")).join("\n");
}

function formatTable(
  data: unknown,
  columns?: { key: string; label: string; width?: number }[],
): string {
  if (!Array.isArray(data)) {
    if (typeof data === "object" && data !== null) {
      const entries = Object.entries(data as Record<string, unknown>);
      const maxKey = Math.max(...entries.map(([k]) => k.length));
      return entries
        .map(([k, v]) => `\x1b[1m${k.padEnd(maxKey)}\x1b[0m  ${v}`)
        .join("\n");
    }
    return String(data);
  }

  const rows = data as Record<string, unknown>[];
  if (rows.length === 0) return "No results.";

  const cols = columns ?? Object.keys(rows[0]!).map((k) => ({ key: k, label: k }));

  const widths = cols.map((col) => {
    const values = rows.map((r) => String(r[col.key] ?? "").length);
    return Math.max(col.label.length, ...values);
  });

  const header = cols
    .map((col, i) => `\x1b[1m${col.label.padEnd(widths[i]!)}\x1b[0m`)
    .join("  ");

  const divider = widths.map((w) => "─".repeat(w)).join("──");

  const body = rows
    .map((row) =>
      cols
        .map((col, i) => String(row[col.key] ?? "").padEnd(widths[i]!))
        .join("  "),
    )
    .join("\n");

  return `${header}\n${divider}\n${body}`;
}

export function getOutputFormat(args: { json?: boolean; plain?: boolean }): OutputFormat {
  if (args.json) return "json";
  if (args.plain) return "plain";
  return "table";
}

export function printPaging(
  label: string,
  paging: { page?: number; pages?: number; total?: number } | undefined,
): void {
  if (paging?.page && paging?.pages) {
    const totalStr =
      paging.total != null ? ` (${paging.total} total results)` : "";
    console.error(`${label}Page ${paging.page}/${paging.pages}${totalStr}`);
  }
}
