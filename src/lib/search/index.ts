import type { SearchHit, SearchRequest, SearchResponse } from "./types";
import { relatedHits, search as searchRows } from "./postgres";

export type { SearchRequest, SearchResponse, SearchHit, LeadFilters, SearchMode, SearchColumn, FacetCount } from "./types";

export async function search(request: SearchRequest): Promise<SearchResponse> {
  return searchRows(request);
}

export async function relatedTo(id: string): Promise<Pick<SearchHit, "id" | "area" | "folder" | "fileName" | "rowNumber">[]> {
  return relatedHits(id);
}
