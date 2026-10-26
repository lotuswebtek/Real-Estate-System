import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import type { SearchColumn, SearchMode } from "@/lib/search";

const MODES = new Set<SearchMode>(["contains", "exact", "starts"]);
const COLUMNS = new Set<SearchColumn>(["all", "name", "mobile", "email", "nationality", "project", "unit", "area"]);

function list(url: URL, key: string): string[] {
  return (url.searchParams.get(key) ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modeValue = url.searchParams.get("mode") ?? "contains";
  const columnValue = url.searchParams.get("col") ?? "all";
  const mode = MODES.has(modeValue as SearchMode) ? (modeValue as SearchMode) : "contains";
  const column = COLUMNS.has(columnValue as SearchColumn) ? (columnValue as SearchColumn) : "all";
  const date = url.searchParams.get("date");
  const sort = url.searchParams.get("sort") ?? "";
  const direction = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const result = await search({
    query: url.searchParams.get("q") ?? "",
    mode,
    column,
    filters: {
      areas: list(url, "area"),
      folders: list(url, "folder"),
      nationalities: list(url, "nationality"),
      propertyTypes: list(url, "type"),
      files: list(url, "file"),
      importedWithinDays: date === "7" ? 7 : date === "30" ? 30 : null,
    },
    page: 1,
    pageSize: 200,
    sort: sort ? { field: sort, direction } : null,
  });
  return NextResponse.json(result);
}
