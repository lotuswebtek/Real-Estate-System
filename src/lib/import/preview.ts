import * as XLSX from "xlsx";
import { MASTER_COLUMNS } from "@/lib/columns/aliases";
import { findHeaderIndex, labelHeaders, masterKeyForHeader } from "@/lib/import/table";

const KNOWN = new Set(MASTER_COLUMNS.map((column) => column.normalizedKey));

export type PreviewColumn = {
  source: string;
  field: string;
  mapped: boolean;
};

export type PreviewSheet = {
  name: string;
  columns: PreviewColumn[];
  sample: string[][];
};

function clip(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77)}...`;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function sheetFromRows(name: string, rows: string[][]): PreviewSheet {
  const headerIndex = findHeaderIndex(rows);
  const headerRow = headerIndex === null ? [] : (rows[headerIndex] ?? []);
  const labels = labelHeaders(headerRow).slice(0, 12);
  const columns = labels.map((source) => {
    const field = masterKeyForHeader(source);
    return { source, field, mapped: KNOWN.has(field) };
  });
  const sample = rows
    .slice(headerIndex === null ? 0 : headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim()))
    .slice(0, 3)
    .map((row) => labels.map((_, index) => clip(row[index] ?? "")));
  return { name, columns, sample };
}

export function previewWorkbook(bytes: Uint8Array, fileName: string): PreviewSheet[] {
  if (fileName.toLowerCase().endsWith(".csv")) {
    const text = Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, "");
    const rows = text
      .split(/\r?\n/)
      .slice(0, 16)
      .filter((line) => line.trim())
      .map(splitCsvLine);
    return [sheetFromRows(fileName, rows)];
  }
  const workbook = XLSX.read(bytes, { type: "array", sheetRows: 16 });
  return workbook.SheetNames.slice(0, 12).map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return sheetFromRows(name, []);
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const rows = matrix.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []));
    return sheetFromRows(name, rows);
  });
}
