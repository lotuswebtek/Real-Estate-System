import { SEARCH_COLUMNS, type SearchClause, type SearchColumn, type SearchMode } from "@/lib/search/types";

const MODES = new Set<SearchMode>(["contains", "exact", "starts", "ends"]);
const COLUMNS = new Set<string>(SEARCH_COLUMNS);

function asClause(value: unknown, allowEmpty: boolean): SearchClause | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.column !== "string" || !COLUMNS.has(row.column)) return null;
  if (typeof row.mode !== "string" || !MODES.has(row.mode as SearchMode)) return null;
  if (typeof row.query !== "string") return null;
  const query = row.query.trim().slice(0, 200);
  if (!query && !allowEmpty) return null;
  return {
    column: row.column as SearchColumn,
    mode: row.mode as SearchMode,
    query,
    join: row.join === "or" ? "or" : "and",
    exclude: row.exclude === true,
  };
}

export function readClauses(raw: string): SearchClause[] {
  if (!raw || raw.length > 4000) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const clause = asClause(item, true);
      return clause ? [clause] : [];
    }).slice(0, 6);
  } catch {
    return [];
  }
}

export function activeClauses(raw: string): SearchClause[] {
  return readClauses(raw).filter((clause) => clause.query.length > 0);
}
