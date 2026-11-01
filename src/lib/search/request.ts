import { activeClauses } from "@/lib/search/clauses";
import type { SearchColumn, SearchMode, SearchRequest } from "@/lib/search/types";
import { SEARCH_COLUMNS } from "@/lib/search/types";

const MODES = new Set<SearchMode>(["contains", "exact", "starts", "ends"]);
const COLUMNS = new Set<string>(SEARCH_COLUMNS);

function list(url: URL, key: string): string[] {
  return (url.searchParams.get(key) ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function searchRequestFromUrl(url: URL, pageSize = 200): SearchRequest {
  const modeValue = url.searchParams.get("mode") ?? "contains";
  const columnValue = url.searchParams.get("col") ?? "all";
  const mode = MODES.has(modeValue as SearchMode) ? (modeValue as SearchMode) : "contains";
  const column = COLUMNS.has(columnValue as SearchColumn) ? (columnValue as SearchColumn) : "all";
  const date = url.searchParams.get("date");
  const sort = url.searchParams.get("sort") ?? "";
  const direction = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) ? Math.min(Math.max(Math.floor(pageRaw), 1), 200) : 1;
  return {
    query: url.searchParams.get("q") ?? "",
    mode,
    column,
    clauses: activeClauses(url.searchParams.get("rules") ?? ""),
    filters: {
      areas: list(url, "area"),
      folders: list(url, "folder"),
      nationalities: list(url, "nationality"),
      propertyTypes: list(url, "type"),
      files: list(url, "file"),
      importedWithinDays: date === "7" ? 7 : date === "30" ? 30 : null,
    },
    page,
    pageSize,
    sort: sort ? { field: sort, direction } : null,
  };
}
