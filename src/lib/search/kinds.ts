export const PROPERTY_KINDS = [
  { id: "apartment", label: "Apartment", patterns: ["apartment", "flat", "studio"] },
  { id: "villa", label: "Villa", patterns: ["villa"] },
  { id: "plot", label: "Plot", patterns: ["plot", "land"] },
  { id: "townhouse", label: "Townhouse", patterns: ["townhouse"] },
  { id: "unit", label: "Unit", patterns: ["unit"] },
  { id: "office", label: "Office", patterns: ["office"] },
  { id: "shop", label: "Shop", patterns: ["shop", "showroom", "show room"] },
  { id: "warehouse", label: "Warehouse", patterns: ["warehouse"] },
  { id: "hotel", label: "Hotel", patterns: ["hotel"], avoid: ["apartment"] },
  { id: "commercial", label: "Commercial", patterns: ["commercial"] },
  { id: "building", label: "Building", patterns: ["building"] },
] as const;

export type PropertyKindId = (typeof PROPERTY_KINDS)[number]["id"];

const KIND_IDS = new Set<string>(PROPERTY_KINDS.map((kind) => kind.id));

export function knownKinds(ids: string[]): PropertyKindId[] {
  return ids.filter((id): id is PropertyKindId => KIND_IDS.has(id));
}

export function kindWordPattern(pattern: string): string {
  const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `(^|[^a-z0-9])${escaped}s?([^a-z0-9]|$)`;
}

function includesKindWord(value: string, pattern: string): boolean {
  return new RegExp(kindWordPattern(pattern), "i").test(value);
}

export function propertyKindMatch(value: string, kindId: string): boolean {
  const kind = PROPERTY_KINDS.find((item) => item.id === kindId);
  if (!kind) return false;
  if ("avoid" in kind && kind.avoid.some((word) => includesKindWord(value, word))) return false;
  return kind.patterns.some((pattern) => includesKindWord(value, pattern));
}
