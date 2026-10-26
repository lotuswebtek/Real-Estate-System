import * as XLSX from "xlsx";

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function cellToText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null || cell.v === "") return "";
  if (cell.v instanceof Date) return formatDate(cell.v);
  if (cell.t === "n" && typeof cell.v === "number") {
    const formatted = typeof cell.w === "string" ? cell.w.trim() : "";
    const scientific = /e\+/i.test(formatted);
    if (scientific || Math.abs(cell.v) >= 1e8) {
      const rounded = Math.round(cell.v);
      if (Number.isSafeInteger(rounded)) return String(rounded);
    }
    if (formatted && !scientific) return formatted;
    if (Number.isInteger(cell.v)) return String(cell.v);
    return String(cell.v);
  }
  if (typeof cell.w === "string" && cell.w.trim()) return cell.w.trim();
  return String(cell.v).trim();
}

export type SheetGrid = {
  name: string;
  rows: { excelRow: number; cells: string[] }[];
};

export function readWorkbookBuffer(buffer: Buffer): SheetGrid[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: false });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet?.["!ref"]) return { name, rows: [] };
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const rows: SheetGrid["rows"] = [];
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      const cells: string[] = [];
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: column });
        cells.push(cellToText(sheet[address]));
      }
      rows.push({ excelRow: rowIndex + 1, cells });
    }
    return { name, rows };
  });
}
