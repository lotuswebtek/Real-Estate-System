import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readWorkbookBuffer } from "@/lib/import/cells";
import { cellsFromRowXml, readWorkbookSheets } from "@/lib/import/stream-xlsx";
import { parseGrid, type GridRow } from "@/lib/import/table";

let tempRoot = "";

beforeAll(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), "lead-finder-xlsx-"));
});

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("streamed workbook cells", () => {
  it("rebuilds a large numeric phone from the worksheet xml", () => {
    const row = cellsFromRowXml(
      '<row r="4"><c r="A4" t="inlineStr"><is><t>Ahmed</t></is></c><c r="C4"><v>9.71501112233E+11</v></c></row>',
      [],
    );
    expect(row.excelRow).toBe(4);
    expect(row.cells[0]).toBe("Ahmed");
    expect(row.cells[1]).toBe("");
    expect(row.cells[2]).toBe("971501112233");
  });

  it("reads the same lead rows as the in-memory workbook reader", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Palm owners"],
      ["NameEn", "Mobile", "Email"],
      ["Sara", "0501234567", "sara@example.com"],
      ["Omar", "971501112233", "omar@example.com"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
    const filePath = path.join(tempRoot, "leads.xlsx");
    XLSX.writeFile(workbook, filePath);

    const streamed: GridRow[] = [];
    let sheetName = "";
    await readWorkbookSheets(filePath, async ({ name, rows }) => {
      sheetName = name;
      for await (const row of rows) streamed.push(row);
    });

    const fromDisk = readWorkbookBuffer(await import("node:fs/promises").then((fs) => fs.readFile(filePath)));
    expect(sheetName).toBe("Leads");
    expect(parseGrid(streamed).rows.map((row) => row.data)).toEqual(parseGrid(fromDisk[0]?.rows ?? []).rows.map((row) => row.data));
    expect(parseGrid(streamed).rows[0]?.phoneKeys).toEqual(["501234567"]);
  });
});
