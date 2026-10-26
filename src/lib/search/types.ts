export type SearchMode = "contains" | "exact" | "starts";

export type SearchColumn =
  | "all"
  | "name"
  | "mobile"
  | "email"
  | "nationality"
  | "project"
  | "unit"
  | "area";

export type LeadFilters = {
  areas: string[];
  folders: string[];
  nationalities: string[];
  propertyTypes: string[];
  files: string[];
  importedWithinDays: number | null;
};

export type SearchRequest = {
  query: string;
  mode: SearchMode;
  column: SearchColumn;
  filters: LeadFilters;
  page: number;
  pageSize: number;
  sort: { field: string; direction: "asc" | "desc" } | null;
};

export type SearchHit = {
  id: string;
  fileId: string;
  fileName: string;
  area: string;
  folder: string;
  sheet: string;
  rowNumber: number;
  name: string;
  mobile: string;
  email: string;
  nationality: string;
  project: string;
  unit: string;
  propertyType: string;
  size: string;
  price: string;
  importedAt: string;
  seen: number;
  mobileRaw: string;
  extra: { label: string; value: string }[];
};

export type FacetCount = {
  value: string;
  count: number;
};

export type SearchResponse = {
  hits: SearchHit[];
  total: number;
  capped: boolean;
  tookMs: number;
  facets: Record<string, FacetCount[]>;
};
