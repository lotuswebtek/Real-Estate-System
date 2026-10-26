import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const root = process.argv[2];
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(xlsx|xls|xlsm|csv)$/i.test(entry.name)) files.push(full);
  }
}

walk(root);

const headerCounts = new Map();
const examples = [];
let failed = 0;

for (const file of files) {
  try {
    const buf = readFileSync(file);
    const workbook = XLSX.read(buf, { type: "buffer", sheetRows: 12, cellDates: true });
    const rel = path.relative(root, file);
    const sheets = workbook.SheetNames.slice(0, 3).map((name) => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      let header = [];
      let headerRow = 0;
      for (let i = 0; i < rows.length; i += 1) {
        const cells = (rows[i] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
        if (cells.length >= 2) {
          header = (rows[i] ?? []).map((cell) => String(cell ?? "").trim());
          headerRow = i + 1;
          break;
        }
      }
      for (const cell of header) {
        const key = cell.toLowerCase().replace(/\s+/g, " ").trim();
        if (!key) continue;
        headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
      }
      return { name, headerRow, header: header.filter(Boolean).slice(0, 18) };
    });
    if (examples.length < 24) {
      examples.push({ rel, bytes: statSync(file).size, sheets });
    }
  } catch (error) {
    failed += 1;
    if (failed <= 8) console.log("FAIL", path.relative(root, file), error instanceof Error ? error.message : "error");
  }
}

console.log(JSON.stringify({ files: files.length, failed, examples, topHeaders: [...headerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60) }, null, 2));
