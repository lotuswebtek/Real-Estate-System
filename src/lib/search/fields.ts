import type { SearchColumn } from "@/lib/search/types";

type FieldDef = {
  label: string;
  hints: string[];
  keys: readonly string[];
};

export const FIELD_CATALOG: Record<SearchColumn, FieldDef> = {
  all: {
    label: "All columns",
    hints: ["all", "everything", "any column"],
    keys: [],
  },
  name: {
    label: "Owner Name",
    hints: ["name", "owner", "owner name", "full name", "customer name", "client name", "buyer name", "landlord", "tenant", "seller"],
    keys: ["name", "owner_name", "full_name", "customer_name", "client_name", "buyer_name", "landlord_name", "tenant_name", "seller_name", "name_en"],
  },
  mobile: {
    label: "Mobile",
    hints: ["mobile", "phone", "phone number", "contact", "whatsapp"],
    keys: ["mobile"],
  },
  mobile2: {
    label: "Mobile 2",
    hints: ["mobile 2", "phone 2", "secondary mobile", "alternate number"],
    keys: ["mobile_2"],
  },
  email: {
    label: "Email",
    hints: ["email", "e-mail", "mail"],
    keys: ["email"],
  },
  nationality: {
    label: "Nationality",
    hints: ["nationality", "country"],
    keys: ["nationality"],
  },
  project: {
    label: "Building Name",
    hints: ["building", "building name", "project", "project name", "tower"],
    keys: ["project", "project_name", "building", "building_name", "tower", "master_project"],
  },
  unit: {
    label: "Unit Number",
    hints: ["unit", "unit number", "flat", "apartment", "villa"],
    keys: ["unit", "unit_no", "unit_number", "flat", "flat_no", "apartment", "villa_number", "villa_no"],
  },
  plot: {
    label: "Plot Number",
    hints: ["plot", "plot number", "plot no", "parcel", "land number"],
    keys: ["plot", "plot_no", "plot_number", "plot_ref", "parcel", "parcel_id", "land_no", "land_number"],
  },
  area: {
    label: "Community",
    hints: ["community", "area", "location", "district"],
    keys: ["area", "community", "location", "district", "sub_community", "area_name", "master_location"],
  },
  propertyType: {
    label: "Property Type",
    hints: ["property type", "type", "unit type"],
    keys: ["property_type"],
  },
  bedrooms: {
    label: "Bedrooms",
    hints: ["bedrooms", "beds", "rooms"],
    keys: ["bedrooms"],
  },
  role: {
    label: "Role",
    hints: ["role", "owner type", "customer type", "contact type"],
    keys: ["role"],
  },
  emirate: {
    label: "Emirate",
    hints: ["emirate", "emirates"],
    keys: ["emirate"],
  },
  size: {
    label: "Size",
    hints: ["size", "sqft", "area sqft"],
    keys: ["size"],
  },
  price: {
    label: "Price",
    hints: ["price", "amount", "value"],
    keys: ["price"],
  },
  date: {
    label: "Date",
    hints: ["date", "registration date"],
    keys: ["date"],
  },
  idPassport: {
    label: "ID / Passport",
    hints: ["id", "passport", "emirates id"],
    keys: ["id_passport"],
  },
};

export function fieldLabel(column: SearchColumn): string {
  return FIELD_CATALOG[column].label;
}

export function fieldMatches(column: SearchColumn, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const field = FIELD_CATALOG[column];
  return [field.label, ...field.hints].some((hint) => hint.toLowerCase().includes(needle));
}

export function storedKeys(column: Exclude<SearchColumn, "all">): readonly string[] {
  return FIELD_CATALOG[column].keys;
}

export function plotTextVariants(value: string): string[] {
  const trimmed = value.trim();
  const compact = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const hyphenated = compact.replace(/^([a-z]+)(\d.*)$/i, "$1-$2");
  const spaced = compact.replace(/^([a-z]+)(\d.*)$/i, "$1 $2");
  const variants = [trimmed, compact, hyphenated, spaced];
  return variants.filter((item, index) => item.length > 0 && variants.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
}
