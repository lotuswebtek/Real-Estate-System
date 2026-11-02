export type SearchMode = "contains" | "exact" | "starts" | "ends";

export const SEARCH_COLUMNS = [
  "all",
  "name",
  "mobile",
  "mobile2",
  "email",
  "nationality",
  "project",
  "unit",
  "plot",
  "area",
  "propertyType",
  "bedrooms",
  "role",
  "emirate",
  "size",
  "price",
  "date",
  "purchaseDate",
  "subCommunity",
  "plotArea",
  "gfa",
  "source",
  "idPassport",
] as const;

export type SearchColumn = (typeof SEARCH_COLUMNS)[number];

export type SearchClause = {
  column: SearchColumn;
  mode: SearchMode;
  query: string;
  join: "and" | "or";
  exclude: boolean;
};

export type LeadFilters = {
  areas: string[];
  folders: string[];
  nationalities: string[];
  propertyTypes: string[];
  kinds: string[];
  files: string[];
  importedWithinDays: number | null;
};

export type SearchRequest = {
  query: string;
  mode: SearchMode;
  column: SearchColumn;
  clauses: SearchClause[];
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
  plot: string;
  propertyType: string;
  size: string;
  price: string;
  importedAt: string;
  seen: number;
  flags: string[];
  mobileRaw: string;
  extra: { label: string; value: string }[];
};

export type FacetCount = {
  value: string;
  count: number;
};

export type SearchGroupProperty = {
  id: string;
  area: string;
  project: string;
  unit: string;
  plot: string;
  folder: string;
  fileName: string;
  rowNumber: number;
};

export type SearchGroup = {
  key: string;
  label: string;
  records: number;
  files: number;
  areas: number;
  buildings: number;
  properties: SearchGroupProperty[];
};

export type SearchResponse = {
  hits: SearchHit[];
  total: number;
  capped: boolean;
  tookMs: number;
  page: number;
  pageSize: number;
  facets: Record<string, FacetCount[]>;
};
