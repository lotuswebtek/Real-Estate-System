import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { digitsOnly, isPhoneQuery, phoneKeyFromDigits } from "@/lib/phone";
import { FIELD_CATALOG, plotTextVariants, storedKeys } from "@/lib/search/fields";
import type { SearchClause, SearchColumn, SearchHit, SearchMode, SearchRequest, SearchResponse } from "@/lib/search/types";

const PAGE_LIMIT = 200;

const KNOWN_KEYS = new Set(Object.values(FIELD_CATALOG).flatMap((field) => field.keys));

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function compactAlnum(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isPlotLike(value: string): boolean {
  const compact = compactAlnum(value);
  return compact.length >= 3 && /[a-z]/.test(compact) && /\d/.test(compact);
}

function targetExpr(column: SearchColumn): Prisma.Sql {
  return column === "all" ? Prisma.sql`r.search_text` : columnExpr(column);
}

function likeClause(column: SearchColumn, pattern: string, raw: string, mode: "contains" | "starts" | "ends"): Prisma.Sql {
  const target = targetExpr(column);
  const text = Prisma.sql`immutable_unaccent(${target}) ILIKE immutable_unaccent(${pattern}) ESCAPE '\\'`;
  if (column !== "plot" && column !== "all") return text;
  const extra = plotTextVariants(raw)
    .filter((value) => value.toLowerCase() !== raw.trim().toLowerCase())
    .map((value) => {
      const variantPattern = mode === "starts" ? `${escapeLike(value)}%` : mode === "ends" ? `%${escapeLike(value)}` : `%${escapeLike(value)}%`;
      return Prisma.sql`immutable_unaccent(${target}) ILIKE immutable_unaccent(${variantPattern}) ESCAPE '\\'`;
    });
  if (extra.length === 0 || !isPlotLike(raw)) return text;
  return Prisma.sql`(${text} OR ${Prisma.join(extra, " OR ")})`;
}

function columnExpr(column: Exclude<SearchColumn, "all">): Prisma.Sql {
  const parts = storedKeys(column).map((key) => Prisma.sql`NULLIF(r.data->>${key}, '')`);
  if (column === "area") return Prisma.sql`COALESCE(${Prisma.join(parts, ", ")}, NULLIF(f.area, ''), '')`;
  return Prisma.sql`COALESCE(${Prisma.join(parts, ", ")}, '')`;
}

function phoneFilter(trimmed: string, column: SearchColumn): Prisma.Sql | null {
  if (column !== "all" && column !== "mobile" && column !== "mobile2") return null;
  const pieces = trimmed.split(/[\s,;|/]+/).map((part) => part.trim()).filter((part) => part.length > 0);
  if (pieces.length === 0) return null;
  const keys: string[] = [];
  for (const piece of pieces) {
    if (!isPhoneQuery(piece)) return null;
    const key = phoneKeyFromDigits(digitsOnly(piece));
    if (!key) return null;
    keys.push(key);
  }
  if (keys.length === 0) return null;
  const overlap = Prisma.sql`r.phone_keys && ${keys}::text[]`;
  if (column === "all") return overlap;
  const dataKey = column === "mobile" ? "mobile" : "mobile_2";
  const digits = Prisma.sql`regexp_replace(COALESCE(r.data->>${dataKey}, ''), '\\D', '', 'g')`;
  const inField = Prisma.sql`(${Prisma.join(
    keys.map((key) => Prisma.sql`${digits} LIKE ${`%${key}`}`),
    " OR ",
  )})`;
  return Prisma.sql`(${overlap} AND ${inField})`;
}

function textFilter(query: string, mode: SearchMode, column: SearchColumn): Prisma.Sql | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const phones = phoneFilter(trimmed, column);
  if (phones) return phones;
  let direct: Prisma.Sql;
  if (mode === "exact") {
    if (column === "all") {
      direct = Prisma.sql`EXISTS (SELECT 1 FROM jsonb_each_text(r.data) field WHERE lower(immutable_unaccent(field.value)) = lower(immutable_unaccent(${trimmed})))`;
    } else if (column === "plot") {
      direct = Prisma.sql`(${Prisma.join(
        plotTextVariants(trimmed).map((variant) => Prisma.sql`lower(immutable_unaccent(${columnExpr(column)})) = lower(immutable_unaccent(${variant}))`),
        " OR ",
      )})`;
    } else {
      direct = Prisma.sql`lower(immutable_unaccent(${columnExpr(column)})) = lower(immutable_unaccent(${trimmed}))`;
    }
  } else if (mode === "starts" || mode === "ends") {
    const pattern = mode === "starts" ? `${escapeLike(trimmed)}%` : `%${escapeLike(trimmed)}`;
    direct = likeClause(column, pattern, trimmed, mode);
  } else {
    const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
    direct = Prisma.sql`(${Prisma.join(
      words.map((word) => likeClause(column, `%${escapeLike(word)}%`, word, "contains")),
      " AND ",
    )})`;
  }
  if (column === "all") return direct;
  const words = mode === "exact" ? [trimmed] : trimmed.split(/\s+/).filter((word) => word.length > 0);
  const indexed = Prisma.sql`(${Prisma.join(
    words.map((word) => likeClause("all", `%${escapeLike(word)}%`, word, "contains")),
    " AND ",
  )})`;
  return Prisma.sql`(${indexed} AND ${direct})`;
}

function clauseSql(clause: SearchClause): Prisma.Sql | null {
  const sql = textFilter(clause.query, clause.mode, clause.column);
  if (!sql) return null;
  return clause.exclude ? Prisma.sql`NOT (${sql})` : sql;
}

function combinedText(request: SearchRequest): Prisma.Sql | null {
  const parts: { join: "and" | "or"; sql: Prisma.Sql }[] = [];
  const main = textFilter(request.query, request.mode, request.column);
  if (main) parts.push({ join: "and", sql: main });
  for (const clause of request.clauses ?? []) {
    const sql = clauseSql(clause);
    if (sql) parts.push({ join: clause.join, sql });
  }
  if (parts.length === 0) return null;
  let combined = parts[0].sql;
  for (const part of parts.slice(1)) {
    combined = part.join === "or" ? Prisma.sql`(${combined} OR ${part.sql})` : Prisma.sql`(${combined} AND ${part.sql})`;
  }
  return combined;
}

type FacetName = "areas" | "folders" | "nationalities" | "propertyTypes" | "files";

function whereSql(request: SearchRequest, except?: FacetName): Prisma.Sql {
  const filters = request.filters;
  const parts: Prisma.Sql[] = [Prisma.sql`f.status = 'done'`];
  const text = combinedText(request);
  if (text) parts.push(text);
  if (except !== "areas" && filters.areas.length > 0) parts.push(Prisma.sql`f.area IN (${Prisma.join(filters.areas)})`);
  if (except !== "folders" && filters.folders.length > 0) parts.push(Prisma.sql`f.folder_path IN (${Prisma.join(filters.folders)})`);
  if (except !== "nationalities" && filters.nationalities.length > 0) {
    parts.push(Prisma.sql`COALESCE(r.data->>'nationality', '') IN (${Prisma.join(filters.nationalities)})`);
  }
  if (except !== "propertyTypes" && filters.propertyTypes.length > 0) {
    parts.push(Prisma.sql`COALESCE(r.data->>'property_type', '') IN (${Prisma.join(filters.propertyTypes)})`);
  }
  if (except !== "files" && filters.files.length > 0) {
    parts.push(Prisma.sql`CASE WHEN COALESCE(f.folder_path, '') = '' THEN f.original_name ELSE f.folder_path || ' › ' || f.original_name END IN (${Prisma.join(filters.files)})`);
  }
  if (filters.importedWithinDays) {
    const cutoff = new Date(Date.now() - filters.importedWithinDays * 24 * 60 * 60 * 1000);
    parts.push(Prisma.sql`f.imported_at >= ${cutoff}`);
  }
  return Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}`;
}

function labelFor(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim()) record[key] = item;
  }
  return record;
}

type RawHit = {
  id: string;
  rowNumber: number;
  data: unknown;
  fileId: string;
  fileName: string;
  area: string | null;
  folder: string | null;
  sheet: string;
  importedAt: Date | null;
};

function tally(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 40)
    .map(([value, count]) => ({ value, count }));
}

function fileLabel(folder: string, fileName: string): string {
  return folder ? `${folder} › ${fileName}` : fileName;
}

function firstStored(data: Record<string, string>, column: Exclude<SearchColumn, "all">): string {
  for (const key of storedKeys(column)) {
    const value = data[key]?.trim();
    if (value) return value;
  }
  return "";
}

function leadName(data: Record<string, string>): string {
  const stored = firstStored(data, "name");
  if (stored) return stored;
  const parts = [data.fname, data.mname, data.sname, data.first_name, data.last_name].filter(Boolean);
  return parts.join(" ");
}

function qualityFlags(data: Record<string, string>, name: string): string[] {
  const flags: string[] = [];
  if (!name.trim()) flags.push("Missing owner name");
  const phone = [data.mobile, data.mobile_2].filter(Boolean).join(" ");
  const digits = phone.replace(/\D/g, "");
  if (phone.trim() && (digits.length < 7 || digits.length > 15)) flags.push("Phone number looks incomplete");
  if (!data.project && !data.unit && !data.plot && !data.plot_no && !data.plot_number && !data.parcel) {
    flags.push("No building, unit, or plot");
  }
  return flags;
}

async function countMatches(where: Prisma.Sql, narrowSql: Prisma.Sql): Promise<number | null> {
  try {
    const rows = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '2500'");
        return tx.$queryRaw<{ n: number }[]>`
          SELECT COUNT(*)::int AS n
          FROM rows r
          JOIN files f ON f.id = r.file_id
          ${where}
          ${narrowSql}
        `;
      },
      { maxWait: 5000, timeout: 8000 },
    );
    return Number(rows[0]?.n ?? 0);
  } catch {
    return null;
  }
}

function toHit(row: RawHit, seen: number): SearchHit {
  const data = asRecord(row.data);
  const mobileRaw = [data.mobile, data.mobile_2].filter(Boolean).join(" / ");
  const extra = Object.entries(data)
    .filter(([key]) => !KNOWN_KEYS.has(key))
    .slice(0, 40)
    .map(([key, value]) => ({ label: labelFor(key), value }));
  return {
    id: row.id,
    fileId: row.fileId,
    fileName: row.fileName,
    area: firstStored(data, "area") || row.area || "",
    folder: row.folder || "",
    sheet: row.sheet,
    rowNumber: row.rowNumber,
    name: leadName(data),
    mobile: mobileRaw,
    mobileRaw,
    email: firstStored(data, "email"),
    nationality: firstStored(data, "nationality"),
    project: firstStored(data, "project"),
    unit: firstStored(data, "unit"),
    plot: firstStored(data, "plot"),
    propertyType: firstStored(data, "propertyType"),
    size: firstStored(data, "size"),
    price: firstStored(data, "price"),
    importedAt: row.importedAt ? row.importedAt.toISOString() : "",
    seen,
    flags: qualityFlags(data, leadName(data)),
    extra,
  };
}

const HIT_SORT: Record<string, (hit: SearchHit) => string> = {
  name: (hit) => hit.name,
  mobile: (hit) => hit.mobile,
  email: (hit) => hit.email,
  nationality: (hit) => hit.nationality,
  area: (hit) => hit.area,
  project: (hit) => hit.project,
  unit: (hit) => hit.unit,
  propertyType: (hit) => hit.propertyType,
  fileName: (hit) => hit.fileName,
  source: (hit) => hit.fileName,
  importedAt: (hit) => hit.importedAt,
};

function sortPage(hits: SearchHit[], sort: SearchRequest["sort"]): SearchHit[] {
  const pick = sort?.field ? HIT_SORT[sort.field] : undefined;
  if (!pick) return hits;
  const direction = sort?.direction === "asc" ? 1 : -1;
  return hits
    .slice()
    .sort((a, b) => pick(a).localeCompare(pick(b), undefined, { numeric: true, sensitivity: "base" }) * direction || a.rowNumber - b.rowNumber);
}

export async function search(request: SearchRequest): Promise<SearchResponse> {
  const started = Date.now();
  const pageSize = Math.min(Math.max(request.pageSize || 100, 1), request.pageSize > PAGE_LIMIT ? 2000 : PAGE_LIMIT);
  const page = Math.max(request.page || 1, 1);
  const offset = (page - 1) * pageSize;
  const where = whereSql(request);
  const hasText = request.query.trim().length > 0 || (request.clauses ?? []).some((clause) => clause.query.trim().length > 0);
  const filters = request.filters;
  const unfiltered =
    !hasText &&
    filters.areas.length === 0 &&
    filters.folders.length === 0 &&
    filters.nationalities.length === 0 &&
    filters.propertyTypes.length === 0 &&
    filters.files.length === 0 &&
    !filters.importedWithinDays;
  const narrowSql = unfiltered
    ? Prisma.sql`AND f.id = (SELECT id FROM files WHERE status = 'done' ORDER BY imported_at DESC NULLS LAST LIMIT 1)`
    : Prisma.empty;
  const orderSql = unfiltered ? Prisma.sql`ORDER BY r.row_number ASC` : Prisma.empty;
  const countPromise = hasText && pageSize <= PAGE_LIMIT ? countMatches(where, narrowSql) : Promise.resolve(null);
  const fetched = await prisma.$queryRaw<RawHit[]>`
    SELECT r.id, r.row_number AS "rowNumber", r.data,
           f.id AS "fileId", f.original_name AS "fileName", f.area, f.folder_path AS folder, s.name AS sheet, f.imported_at AS "importedAt"
    FROM rows r
    JOIN files f ON f.id = r.file_id
    JOIN sheets s ON s.id = r.sheet_id
    ${where}
    ${narrowSql}
    ${orderSql}
    LIMIT ${pageSize + 1} OFFSET ${offset}
  `;
  const capped = fetched.length > pageSize;
  const pageRows = capped ? fetched.slice(0, pageSize) : fetched;
  const hits = sortPage(
    pageRows.map((hit) => toHit(hit, 1)),
    request.sort,
  );
  const counted = await countPromise;
  const exact = counted !== null;

  return {
    hits,
    total: exact ? counted : offset + hits.length,
    capped: exact ? false : capped,
    tookMs: Date.now() - started,
    page,
    pageSize,
    facets: {
      areas: tally(hits.map((hit) => hit.area)),
      folders: tally(hits.map((hit) => hit.folder)),
      nationalities: tally(hits.map((hit) => hit.nationality)),
      propertyTypes: tally(hits.map((hit) => hit.propertyType)),
      files: tally(hits.map((hit) => fileLabel(hit.folder, hit.fileName))),
    },
  };
}

export async function relatedHits(id: string): Promise<Pick<SearchHit, "id" | "area" | "folder" | "fileName" | "rowNumber">[]> {
  const row = await prisma.row.findUnique({ where: { id }, select: { phoneKeys: true, emailKeys: true } });
  if (!row || (row.phoneKeys.length === 0 && row.emailKeys.length === 0)) return [];
  return prisma.$queryRaw`
    SELECT DISTINCT ON (r.file_id) r.id, COALESCE(f.area, '') AS area, COALESCE(f.folder_path, '') AS folder,
           f.original_name AS "fileName", r.row_number AS "rowNumber"
    FROM rows r
    JOIN files f ON f.id = r.file_id
    WHERE f.status = 'done' AND r.id <> ${id}
      AND (
        (${row.phoneKeys}::text[] <> '{}' AND r.phone_keys && ${row.phoneKeys}::text[])
        OR (${row.emailKeys}::text[] <> '{}' AND r.email_keys && ${row.emailKeys}::text[])
      )
    ORDER BY r.file_id, r.row_number
    LIMIT 30
  `;
}
