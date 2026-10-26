import { createReadStream } from "node:fs";
import { createRequire } from "node:module";
import type { Readable } from "node:stream";
import type { GridRow } from "@/lib/import/table";

const require = createRequire(import.meta.url);

type ZipEntry = Readable & {
  path: string;
  autodrain: () => Readable & { promise?: () => Promise<void> };
};

type ZipParser = (options: { forceStream: boolean }) => Readable & AsyncIterable<ZipEntry>;

type WorkbookMeta = {
  names: Map<string, string>;
  sharedStrings: string[];
};

const MAX_COLUMNS = 256;
const MAX_ROW_XML = 5_000_000;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCodePoint(Number(num)))
    .replace(/&amp;/g, "&");
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0];
  if (!letters) return -1;
  let index = 0;
  for (const char of letters.toUpperCase()) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function numberText(raw: string): string {
  const trimmed = decodeXml(raw).trim();
  if (!trimmed) return "";
  if (/[eE]/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const rounded = Math.round(numeric);
      if (Number.isSafeInteger(rounded)) return String(rounded);
    }
  }
  if (/^-?\d+\.0+$/.test(trimmed)) return trimmed.replace(/\.0+$/, "");
  return trimmed;
}

export function cellsFromRowXml(xml: string, sharedStrings: string[]): GridRow {
  const rowNumber = Number(xml.match(/<(?:[\w.-]+:)?row\b[^>]*\br="(\d+)"/)?.[1] ?? "0");
  const cells: string[] = [];
  const pattern = /<(?:[\w.-]+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?c>)/g;
  for (const match of xml.matchAll(pattern)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const ref = attrs.match(/\br="([A-Z]+)\d+"/i)?.[1] ?? "";
    const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
    const index = ref ? columnIndex(ref) : cells.length;
    if (index < 0 || index >= MAX_COLUMNS) continue;
    let text = "";
    if (type === "inlineStr" || body.includes("<t")) {
      text = [...body.matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g)]
        .map((part) => decodeXml(part[1] ?? ""))
        .join("")
        .trim();
    } else if (type === "s") {
      const pointer = Number(body.match(/<(?:[\w.-]+:)?v>([\s\S]*?)<\/(?:[\w.-]+:)?v>/)?.[1] ?? "");
      text = sharedStrings[pointer] ?? "";
    } else if (type === "b") {
      const bit = body.match(/<(?:[\w.-]+:)?v>([\s\S]*?)<\/(?:[\w.-]+:)?v>/)?.[1] ?? "";
      text = bit.trim() === "1" ? "TRUE" : "FALSE";
    } else if (type !== "e") {
      const raw = body.match(/<(?:[\w.-]+:)?v>([\s\S]*?)<\/(?:[\w.-]+:)?v>/)?.[1] ?? "";
      text = numberText(raw);
    }
    while (cells.length < index) cells.push("");
    cells[index] = text.trim();
  }
  return { excelRow: Number.isFinite(rowNumber) ? rowNumber : 0, cells };
}

function findRowStart(text: string): number {
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf("<", from);
    if (at === -1) return -1;
    if (/^<(?:[\w.-]+:)?row(?:\s|\/|>)/.test(text.slice(at, at + 24))) return at;
    from = at + 1;
  }
  return -1;
}

function drainRows(buffer: string): { rows: string[]; rest: string } {
  const rows: string[] = [];
  let rest = buffer;
  while (rest.length > 0) {
    const start = findRowStart(rest);
    if (start === -1) {
      rest = rest.length > 64 ? rest.slice(-64) : rest;
      break;
    }
    if (start > 0) rest = rest.slice(start);
    const endOfOpen = rest.indexOf(">");
    if (endOfOpen === -1) break;
    if (rest[endOfOpen - 1] === "/") {
      rows.push(rest.slice(0, endOfOpen + 1));
      rest = rest.slice(endOfOpen + 1);
      continue;
    }
    const prefix = rest.slice(1, rest.indexOf("row"));
    const closeTag = `</${prefix}row>`;
    const closeAt = rest.indexOf(closeTag, endOfOpen);
    if (closeAt === -1) break;
    const rowEnd = closeAt + closeTag.length;
    if (rowEnd - start > MAX_ROW_XML) {
      rest = rest.slice(rowEnd);
      continue;
    }
    rows.push(rest.slice(0, rowEnd));
    rest = rest.slice(rowEnd);
  }
  return { rows, rest };
}

function openZip(filePath: string): { entries: AsyncIterable<ZipEntry>; close: () => void } {
  const { Parse } = require("unzipper") as { Parse: ZipParser };
  const input = createReadStream(filePath);
  const zip = input.pipe(Parse({ forceStream: true }));
  return {
    entries: zip,
    close: () => {
      input.destroy();
      zip.destroy();
    },
  };
}

async function discard(entry: ZipEntry) {
  for await (const chunk of entry) {
    void chunk;
  }
}

async function readEntryText(entry: ZipEntry): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of entry) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function readSharedStrings(entry: ZipEntry): Promise<string[]> {
  const strings: string[] = [];
  const decoder = new TextDecoder("utf-8");
  let pending = "";
  const take = (final: boolean) => {
    if (final) pending += decoder.decode();
    while (pending.length > 0) {
      const start = pending.indexOf("<si");
      if (start === -1) {
        pending = pending.length > 16 ? pending.slice(-16) : pending;
        break;
      }
      const end = pending.indexOf("</si>", start);
      if (end === -1) {
        pending = pending.slice(start);
        break;
      }
      const xml = pending.slice(start, end + 5);
      pending = pending.slice(end + 5);
      strings.push(
        [...xml.matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g)]
          .map((part) => decodeXml(part[1] ?? ""))
          .join(""),
      );
    }
  };
  for await (const chunk of entry) {
    pending += decoder.decode(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk), { stream: true });
    take(false);
  }
  take(true);
  return strings;
}

function sheetNames(workbookXml: string, relsXml: string): Map<string, string> {
  const rels = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = match[0];
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (!id || !target || !target.includes("worksheet")) continue;
    const normalized = decodeXml(target).replace(/\\/g, "/").replace(/^\/+/, "");
    rels.set(id, normalized.startsWith("xl/") ? normalized : `xl/${normalized}`);
  }
  const names = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<(?:[\w.-]+:)?sheet\b[^>]*>/g)) {
    const tag = match[0];
    const name = decodeXml(tag.match(/\bname="([^"]*)"/)?.[1] ?? "");
    const id = tag.match(/\br:id="([^"]+)"/)?.[1];
    if (!id) continue;
    const sheetPath = rels.get(id);
    if (sheetPath) names.set(sheetPath.toLowerCase(), name);
  }
  return names;
}

async function workbookMeta(filePath: string): Promise<WorkbookMeta> {
  const zip = openZip(filePath);
  let workbookXml = "";
  let relsXml = "";
  let sharedStrings: string[] = [];
  try {
    for await (const entry of zip.entries) {
      const entryPath = entry.path.replace(/\\/g, "/");
      if (entryPath === "xl/workbook.xml") workbookXml = await readEntryText(entry);
      else if (entryPath === "xl/_rels/workbook.xml.rels") relsXml = await readEntryText(entry);
      else if (entryPath === "xl/sharedStrings.xml") sharedStrings = await readSharedStrings(entry);
      else await discard(entry);
    }
  } finally {
    zip.close();
  }
  return { names: sheetNames(workbookXml, relsXml), sharedStrings };
}

async function* rowsFromEntry(entry: ZipEntry, sharedStrings: string[]): AsyncGenerator<GridRow> {
  const decoder = new TextDecoder("utf-8");
  let pending = "";
  let seen = 0;
  const emit = function* (buffer: string, final: boolean): Generator<GridRow> {
    if (final) pending = buffer + decoder.decode();
    const drained = drainRows(final ? pending : buffer);
    pending = drained.rest;
    for (const xml of drained.rows) {
      seen += 1;
      const row = cellsFromRowXml(xml, sharedStrings);
      if (!row.excelRow) row.excelRow = seen;
      if (row.cells.some((cell) => cell.trim())) yield row;
    }
  };
  for await (const chunk of entry) {
    pending += decoder.decode(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk), { stream: true });
    yield* emit(pending, false);
  }
  yield* emit(pending, true);
}

export async function readWorkbookSheets(
  filePath: string,
  onSheet: (sheet: { name: string; rows: AsyncIterable<GridRow> }) => Promise<void>,
): Promise<number> {
  const meta = await workbookMeta(filePath);
  const zip = openZip(filePath);
  let count = 0;
  try {
    for await (const entry of zip.entries) {
      const entryPath = entry.path.replace(/\\/g, "/");
      if (!/^xl\/worksheets\/sheet\d+\.xml$/i.test(entryPath)) {
        await discard(entry);
        continue;
      }
      count += 1;
      const name = meta.names.get(entryPath.toLowerCase()) || `Sheet ${count}`;
      await onSheet({ name, rows: rowsFromEntry(entry, meta.sharedStrings) });
    }
  } finally {
    zip.close();
  }
  return count;
}
