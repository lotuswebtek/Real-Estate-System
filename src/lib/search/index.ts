import type { SearchGroup, SearchHit, SearchRequest, SearchResponse } from "./types";
import { hitById, relatedHits, search as searchRows, searchGroups } from "./postgres";

export type { SearchRequest, SearchResponse, SearchHit, SearchGroup, SearchGroupProperty, LeadFilters, SearchMode, SearchColumn, SearchClause, FacetCount } from "./types";
export { SEARCH_COLUMNS } from "./types";

export async function search(request: SearchRequest): Promise<SearchResponse> {
  return searchRows(request);
}

export async function relatedTo(id: string): Promise<Pick<SearchHit, "id" | "area" | "folder" | "fileName" | "rowNumber" | "project" | "unit" | "plot">[]> {
  return relatedHits(id);
}

export async function leadById(id: string): Promise<SearchHit | null> {
  return hitById(id);
}

export async function groupedSearch(request: SearchRequest, by: "name" | "mobile"): Promise<SearchGroup[]> {
  return searchGroups(request, by);
}
