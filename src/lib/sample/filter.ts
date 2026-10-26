import { digitsOnly, formatPhone, isPhoneQuery, normalizePhoneKeys, phoneKeyFromDigits, splitPhoneValues } from "@/lib/phone";
import { SAMPLE_LEADS, type SampleLead } from "./leads";

export type MatchMode = "contains" | "exact" | "starts";

export type SearchColumn =
  | "all"
  | "name"
  | "mobile"
  | "email"
  | "nationality"
  | "project"
  | "unit"
  | "area";

export type SampleFilters = {
  query: string;
  mode: MatchMode;
  column: SearchColumn;
  areas: string[];
  folders: string[];
  nationalities: string[];
  propertyTypes: string[];
  files: string[];
  date: "all" | "7" | "30";
};

export const EMPTY_FILTERS: SampleFilters = {
  query: "",
  mode: "contains",
  column: "all",
  areas: [],
  folders: [],
  nationalities: [],
  propertyTypes: [],
  files: [],
  date: "all",
};

const COLUMN_LABELS: Record<SearchColumn, string> = {
  all: "All columns",
  name: "Name",
  mobile: "Mobile",
  email: "Email",
  nationality: "Nationality",
  project: "Project",
  unit: "Unit",
  area: "Area",
};

export function columnLabel(column: SearchColumn): string {
  return COLUMN_LABELS[column];
}

function fileKey(lead: SampleLead): string {
  return `${lead.folder}/${lead.fileName}`;
}

function mobileFieldValues(lead: SampleLead): string[] {
  const parts = splitPhoneValues(lead.mobileRaw);
  const values = [lead.mobileRaw, ...parts];
  for (const part of parts) {
    values.push(formatPhone(part), digitsOnly(part));
    const key = phoneKeyFromDigits(digitsOnly(part));
    if (key) values.push(key);
  }
  return values;
}

function fieldValues(lead: SampleLead, column: Exclude<SearchColumn, "all">): string[] {
  switch (column) {
    case "name":
      return [lead.name];
    case "mobile":
      return mobileFieldValues(lead);
    case "email":
      return [lead.email];
    case "nationality":
      return [lead.nationality];
    case "project":
      return [lead.project];
    case "unit":
      return [lead.unit];
    case "area":
      return [lead.area];
  }
}

function searchableValues(lead: SampleLead, column: SearchColumn): string[] {
  if (column === "all") {
    return [
      lead.name,
      lead.email,
      lead.nationality,
      lead.area,
      lead.project,
      lead.unit,
      lead.propertyType,
      lead.folder,
      lead.fileName,
      lead.sheet,
      lead.size,
      lead.price,
      ...mobileFieldValues(lead),
    ];
  }
  return fieldValues(lead, column);
}

function textMatches(values: string[], query: string, mode: MatchMode): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystacks = values.map((value) => value.toLowerCase());
  if (mode === "exact") return haystacks.some((value) => value === needle);
  if (mode === "starts") return haystacks.some((value) => value.startsWith(needle));
  const words = needle.split(/\s+/).filter(Boolean);
  return words.every((word) => haystacks.some((value) => value.includes(word)));
}

function phoneMatches(lead: SampleLead, query: string, mode: MatchMode): boolean {
  const queryKey = phoneKeyFromDigits(digitsOnly(query));
  if (!queryKey) return false;
  const keys = normalizePhoneKeys(lead.mobileRaw);
  if (mode === "exact") return keys.includes(queryKey);
  if (mode === "starts") return keys.some((key) => key.startsWith(queryKey)) || textMatches(mobileFieldValues(lead), query, "starts");
  return keys.includes(queryKey);
}

function matchesQuery(lead: SampleLead, filters: SampleFilters): boolean {
  const query = filters.query.trim();
  if (!query) return true;
  const phoneMode = isPhoneQuery(query) && (filters.column === "all" || filters.column === "mobile");
  if (phoneMode && filters.mode !== "starts") return phoneMatches(lead, query, filters.mode);
  return textMatches(searchableValues(lead, filters.column), query, filters.mode);
}

function withinDate(lead: SampleLead, date: SampleFilters["date"]): boolean {
  if (date === "all") return true;
  const days = date === "7" ? 7 : 30;
  const imported = new Date(`${lead.importedAt}T00:00:00.000Z`);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days);
  return imported >= start;
}

function matchesFacets(lead: SampleLead, filters: SampleFilters, skip?: keyof SampleFilters): boolean {
  if (skip !== "areas" && filters.areas.length > 0 && !filters.areas.includes(lead.area)) return false;
  if (skip !== "folders" && filters.folders.length > 0 && !filters.folders.includes(lead.folder)) return false;
  if (skip !== "nationalities" && filters.nationalities.length > 0 && !filters.nationalities.includes(lead.nationality)) {
    return false;
  }
  if (skip !== "propertyTypes" && filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(lead.propertyType)) {
    return false;
  }
  if (skip !== "files" && filters.files.length > 0 && !filters.files.includes(lead.fileName)) return false;
  if (skip !== "date" && !withinDate(lead, filters.date)) return false;
  return true;
}

export function filterLeads(leads: SampleLead[], filters: SampleFilters): { rows: SampleLead[]; tookMs: number } {
  const started = performance.now();
  const rows = leads.filter((lead) => matchesQuery(lead, filters) && matchesFacets(lead, filters));
  return { rows, tookMs: Math.max(0, Math.round(performance.now() - started)) };
}

export function facetOptions(
  leads: SampleLead[],
  filters: SampleFilters,
  facet: "areas" | "folders" | "nationalities" | "propertyTypes" | "files",
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (!matchesQuery(lead, filters) || !matchesFacets(lead, filters, facet)) continue;
    const value =
      facet === "areas"
        ? lead.area
        : facet === "folders"
          ? lead.folder
          : facet === "nationalities"
            ? lead.nationality
            : facet === "propertyTypes"
              ? lead.propertyType
              : lead.fileName;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function filesSeenCount(leads: SampleLead[]): Map<string, number> {
  const byPhone = new Map<string, SampleLead[]>();
  const byEmail = new Map<string, SampleLead[]>();
  for (const lead of leads) {
    for (const key of normalizePhoneKeys(lead.mobileRaw)) {
      const list = byPhone.get(key) ?? [];
      list.push(lead);
      byPhone.set(key, list);
    }
    const email = lead.email.trim().toLowerCase();
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(lead);
    byEmail.set(email, list);
  }

  const counts = new Map<string, number>();
  for (const lead of leads) {
    const related = new Set<SampleLead>();
    for (const key of normalizePhoneKeys(lead.mobileRaw)) {
      for (const other of byPhone.get(key) ?? []) related.add(other);
    }
    const email = lead.email.trim().toLowerCase();
    if (email) {
      for (const other of byEmail.get(email) ?? []) related.add(other);
    }
    const files = new Set([...related].map((item) => fileKey(item)));
    counts.set(lead.id, files.size);
  }
  return counts;
}

export function relatedLeads(leads: SampleLead[], lead: SampleLead): SampleLead[] {
  const phones = new Set(normalizePhoneKeys(lead.mobileRaw));
  const email = lead.email.trim().toLowerCase();
  return leads.filter((other) => {
    if (other.id === lead.id) return false;
    if (email && other.email.trim().toLowerCase() === email) return true;
    return normalizePhoneKeys(other.mobileRaw).some((key) => phones.has(key));
  });
}

export function uniqueAreas(): string[] {
  return [...new Set(SAMPLE_LEADS.map((lead) => lead.area))].sort((a, b) => a.localeCompare(b));
}

export function uniqueFiles(): string[] {
  return [...new Set(SAMPLE_LEADS.map((lead) => lead.fileName))].sort((a, b) => a.localeCompare(b));
}
