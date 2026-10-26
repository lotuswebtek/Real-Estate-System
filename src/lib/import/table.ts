import { MASTER_COLUMNS } from "@/lib/columns/aliases";
import { normalizeHeader } from "@/lib/columns/headers";
import { columnLetter } from "@/lib/import/names";
import { normalizePhoneKeys } from "@/lib/phone";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export type GridRow = {
  excelRow: number;
  cells: string[];
};

export type ParsedRow = {
  rowNumber: number;
  data: Record<string, string>;
  searchText: string;
  phoneKeys: string[];
  emailKeys: string[];
};

export type ParsedHeader = {
  raw: string;
  key: string;
};

export type ParsedGrid = {
  headerRowNumber: number;
  headers: ParsedHeader[];
  rows: ParsedRow[];
};

export function masterKeyForHeader(raw: string): string {
  const normalized = normalizeHeader(raw);
  for (const column of MASTER_COLUMNS) {
    if (column.aliases.some((alias) => normalizeHeader(alias) === normalized)) return column.normalizedKey;
  }
  const slug = normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug || "column";
}

export function isDataLikeCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  const compact = trimmed.replace(/\s/g, "");
  const digits = compact.replace(/\D/g, "");
  return digits.length >= 8 && digits.length / compact.length >= 0.6;
}

export function findHeaderIndex(rows: string[][]): number | null {
  for (let index = 0; index < rows.length; index += 1) {
    const cells = (rows[index] ?? []).map((cell) => cell.trim()).filter((cell) => cell.length > 0);
    if (cells.length < 2) continue;
    if (cells.some((cell) => isDataLikeCell(cell))) return null;
    return index;
  }
  return null;
}

export function labelHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((cell, index) => {
    const letter = columnLetter(index);
    const base = cell.trim() || `Column ${letter}`;
    const count = seen.get(base.toLowerCase()) ?? 0;
    seen.set(base.toLowerCase(), count + 1);
    return count === 0 ? base : `${base} (${letter})`;
  });
}

function emailKeysFrom(value: string): string[] {
  const found = value.match(EMAIL_PATTERN) ?? [];
  const keys: string[] = [];
  for (const email of found) {
    const key = email.toLowerCase();
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

function assign(data: Record<string, string>, key: string, value: string) {
  const current = data[key];
  if (!current) {
    data[key] = value;
    return;
  }
  if (current === value) return;
  if (key === "mobile" && !data.mobile_2) {
    data.mobile_2 = value;
    return;
  }
  data[key] = `${current} / ${value}`;
}

function inferKeys(sample: string[][]): string[] {
  const width = sample.reduce((max, row) => Math.max(max, row.length), 0);
  const keys = Array<string>(width).fill("");
  let phoneColumns = 0;
  for (let column = 0; column < width; column += 1) {
    const values = sample.map((row) => (row[column] ?? "").trim()).filter((value) => value.length > 0);
    if (values.length === 0) continue;
    const emails = values.filter((value) => value.includes("@")).length;
    const phones = values.filter((value) => isDataLikeCell(value) && !value.includes("@")).length;
    if (emails >= Math.ceil(values.length / 2)) keys[column] = "email";
    else if (phones >= Math.ceil(values.length / 2)) {
      phoneColumns += 1;
      keys[column] = phoneColumns === 1 ? "mobile" : "mobile_2";
    }
  }
  let named = false;
  let projected = false;
  for (let column = 0; column < width; column += 1) {
    if (keys[column]) continue;
    const values = sample.map((row) => (row[column] ?? "").trim()).filter((value) => value.length > 0);
    const types = values.filter((value) => /bedroom|apartment|villa|studio|townhouse|plot/i.test(value)).length;
    if (!named) {
      keys[column] = "name";
      named = true;
    } else if (values.length > 0 && types >= Math.ceil(values.length / 2)) {
      keys[column] = "property_type";
    } else if (!projected) {
      keys[column] = "project";
      projected = true;
    } else {
      keys[column] = `column_${columnLetter(column).toLowerCase()}`;
    }
  }
  return keys;
}

const DISPLAY: Record<string, string> = {
  name: "Name",
  mobile: "Mobile",
  mobile_2: "Mobile 2",
  email: "Email",
  project: "Project",
  property_type: "Property Type",
};

export function parsedRowFrom(excelRow: number, cells: string[], headers: ParsedHeader[]): ParsedRow | null {
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    const value = (cells[index] ?? "").trim();
    if (!value) return;
    assign(data, header.key, value);
  });
  const values = Object.values(data);
  if (values.length === 0) return null;
  const phoneKeys: string[] = [];
  const emailKeys: string[] = [];
  for (const value of values) {
    for (const key of normalizePhoneKeys(value)) {
      if (!phoneKeys.includes(key)) phoneKeys.push(key);
    }
    for (const key of emailKeysFrom(value)) {
      if (!emailKeys.includes(key)) emailKeys.push(key);
    }
  }
  return {
    rowNumber: excelRow,
    data,
    searchText: values.join(" ").toLowerCase(),
    phoneKeys,
    emailKeys,
  };
}

export type HeaderPlan = {
  headerRowNumber: number;
  headers: ParsedHeader[];
  data: GridRow[];
};

export function planHeaders(grid: GridRow[]): HeaderPlan {
  const matrix = grid.map((row) => row.cells);
  const headerIndex = findHeaderIndex(matrix);
  if (headerIndex === null) {
    const sample = matrix.filter((row) => row.some((cell) => cell.trim())).slice(0, 8);
    const keys = inferKeys(sample);
    const headers = keys.map((key, index) => ({
      raw: DISPLAY[key] ?? `Column ${columnLetter(index)}`,
      key,
    }));
    return { headerRowNumber: 0, headers, data: grid };
  }

  const headerRow = grid[headerIndex];
  let width = headerRow?.cells.length ?? 0;
  for (const row of grid) width = Math.max(width, row.cells.length);
  const raw = Array.from({ length: width }, (_, index) => headerRow?.cells[index] ?? "");
  const labels = labelHeaders(raw);
  const headers = labels.map((label) => ({ raw: label, key: masterKeyForHeader(label) }));
  return {
    headerRowNumber: headerRow?.excelRow ?? headerIndex + 1,
    headers,
    data: grid.slice(headerIndex + 1),
  };
}

export function planReady(pending: GridRow[]): HeaderPlan | null {
  for (const row of pending) {
    const cells = row.cells.map((cell) => cell.trim()).filter((cell) => cell.length > 0);
    if (cells.length < 2) continue;
    if (cells.some((cell) => isDataLikeCell(cell))) {
      const nonEmpty = pending.filter((item) => item.cells.some((cell) => cell.trim())).length;
      if (nonEmpty < 8) return null;
    }
    return planHeaders(pending);
  }
  return null;
}

export function extendHeaders(headers: ParsedHeader[], width: number): ParsedHeader[] {
  if (headers.length >= width) return headers;
  const next = headers.slice();
  while (next.length < width) {
    const raw = `Column ${columnLetter(next.length)}`;
    next.push({ raw, key: masterKeyForHeader(raw) });
  }
  return next;
}

export function parseGrid(grid: GridRow[]): ParsedGrid {
  const plan = planHeaders(grid);
  const rows = plan.data
    .map((row) => parsedRowFrom(row.excelRow, row.cells, plan.headers))
    .filter((row): row is ParsedRow => row !== null);
  return { headerRowNumber: plan.headerRowNumber, headers: plan.headers, rows };
}
