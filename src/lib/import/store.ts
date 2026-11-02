import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, statfs } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { normalizeHeader } from "@/lib/columns/headers";
import { readWorkbookBuffer } from "@/lib/import/cells";
import { duplicateTarget, sheetsToImport } from "@/lib/import/names";
import { addQuality, emptyQuality, qualityLine, type QualityTally } from "@/lib/import/table";
import { readWorkbookSheets } from "@/lib/import/stream-xlsx";
import { extendHeaders, parseGrid, parsedRowFrom, planHeaders, planReady, type HeaderPlan, type ParsedHeader, type ParsedRow } from "@/lib/import/table";
import { prisma } from "@/lib/db/prisma";

const BATCH = 1000;
const LARGE_XLSX_BYTES = 8 * 1024 * 1024;

function isLargeWorkbook(name: string, size: number): boolean {
  return size >= LARGE_XLSX_BYTES && /\.(xlsx|xlsm)$/i.test(name);
}

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function storageRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PATH || "./storage");
}

function maxBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB || "50");
  return (Number.isFinite(mb) && mb > 0 ? mb : 50) * 1024 * 1024;
}

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message : "The file could not be read.";
  if (/maximum call stack/i.test(message)) return "This workbook has too many rows for one read. It will be imported again with the updated reader.";
  if (/unsupported|corrupt|invalid/i.test(message)) return "This workbook looks damaged or is in a format the app cannot read.";
  return "This workbook could not be read. Check that it is a normal Excel or CSV file, then import it again.";
}

async function rememberColumns(db: PrismaClient, headers: { raw: string; key: string }[]) {
  const seen = new Set<string>();
  for (const header of headers) {
    if (!header.key || seen.has(header.key)) continue;
    seen.add(header.key);
    const column = await db.column.upsert({
      where: { normalizedKey: header.key },
      update: {},
      create: { normalizedKey: header.key, displayName: header.raw || header.key },
    });
    const normalized = normalizeHeader(header.raw);
    if (!normalized) continue;
    await db.columnAlias.upsert({
      where: { normalized },
      update: {},
      create: { columnId: column.id, rawHeader: header.raw, normalized },
    });
  }
}

async function flushRows(db: PrismaClient, fileId: string, sheetId: string, batch: ParsedRow[], tally: QualityTally) {
  if (batch.length === 0) return;
  for (const row of batch) addQuality(tally, row);
  await db.row.createMany({
    data: batch.map((row) => ({
      fileId,
      sheetId,
      rowNumber: row.rowNumber,
      data: row.data,
      searchText: row.searchText,
      phoneKeys: row.phoneKeys,
      emailKeys: row.emailKeys,
    })),
  });
  batch.length = 0;
}

async function noteProgress(db: PrismaClient, fileId: string, rowCount: number, sheetCount: number) {
  await db.file.update({ where: { id: fileId }, data: { rowCount, sheetCount } });
}

async function importLargeWorkbook(db: PrismaClient, fileId: string, sourcePath: string, selected: string[]) {
  let sheetCount = 0;
  let rowCount = 0;
  let flushes = 0;
  const importedNames: string[] = [];
  const tally = emptyQuality();
  const allow = selected.length > 0 ? new Set(selected) : null;
  await readWorkbookSheets(sourcePath, async ({ name, rows }) => {
    importedNames.push(name);
    sheetCount += 1;
    let headers: ParsedHeader[] = [];
    let started = false;
    const pending: { excelRow: number; cells: string[] }[] = [];
    let sheetId = "";
    let sheetRows = 0;
    const batch: ParsedRow[] = [];

    const startSheet = async (plan: HeaderPlan) => {
      started = true;
      headers = plan.headers;
      await rememberColumns(db, headers);
      const created = await db.sheet.create({
        data: { fileId, name, headerRowNumber: plan.headerRowNumber, rowCount: 0 },
      });
      sheetId = created.id;
      for (const row of plan.data) await pushRow(row);
    };

    const pushRow = async (row: { excelRow: number; cells: string[] }) => {
      const widened = extendHeaders(headers, row.cells.length);
      if (widened.length !== headers.length) {
        await rememberColumns(db, widened.slice(headers.length));
        headers = widened;
      }
      const parsed = parsedRowFrom(row.excelRow, row.cells, headers);
      if (!parsed || !sheetId) return;
      batch.push(parsed);
      sheetRows += 1;
      rowCount += 1;
      if (sheetRows % 25000 === 0) console.log(`  ${name}: ${sheetRows} rows`);
      if (batch.length >= BATCH) {
        await flushRows(db, fileId, sheetId, batch, tally);
        flushes += 1;
        if (flushes % 5 === 0) await noteProgress(db, fileId, rowCount, sheetCount);
        if (sheetRows % 25000 === 0) {
          const space = await statfs(process.cwd()).catch(() => null);
          const free = space ? Number(space.bavail) * Number(space.bsize) : Number.POSITIVE_INFINITY;
          if (free < 3 * 1024 * 1024 * 1024) throw new Error("The disk is nearly full, so this workbook was stopped.");
        }
      }
    };

    for await (const row of rows) {
      if (started) {
        await pushRow(row);
        continue;
      }
      pending.push(row);
      const ready = planReady(pending);
      if (ready) await startSheet(ready);
    }
    if (!started) await startSheet(planHeaders(pending));
    await flushRows(db, fileId, sheetId, batch, tally);
    if (sheetId) await db.sheet.update({ where: { id: sheetId }, data: { rowCount: sheetRows } });
    await noteProgress(db, fileId, rowCount, sheetCount);
  }, allow ? (name) => allow.has(name) : undefined);
  const missing = selected.filter((name) => !importedNames.includes(name));
  if (sheetCount === 0) throw new Error(selected.length > 0 ? "None of the selected worksheets were found." : "This workbook has no readable sheets.");
  const quality = qualityLine(tally);
  return { sheetCount, rowCount, failures: [...missing.map((name) => `${name}: worksheet was not in the file`), ...(quality ? [quality] : [])] };
}

export async function importFileById(fileId: string, db: PrismaClient = prisma, options?: { force?: boolean }): Promise<void> {
  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file) return;
  await db.file.update({ where: { id: fileId }, data: { status: "processing", errorMessage: null } });

  try {
    const sourcePath = file.absolutePath || file.storagePath;
    if (!sourcePath) throw new Error("missing path");
    const { readFile, stat } = await import("node:fs/promises");
    const info = await stat(sourcePath);
    if (info.size > maxBytes()) {
      const limit = process.env.MAX_UPLOAD_MB || "50";
      throw new Error(`larger than ${limit} MB`);
    }
    const large = isLargeWorkbook(file.originalName, info.size);
    const buffer = large ? null : await readFile(sourcePath);
    const sha256Hash = buffer ? createHash("sha256").update(buffer).digest("hex") : await hashFile(sourcePath);
    const matches = await db.file.findMany({
      where: { sha256Hash, id: { not: fileId } },
      select: { id: true, originalName: true, sha256Hash: true, status: true },
    });
    const targetId = duplicateTarget(
      sha256Hash,
      matches.map((match) => ({ id: match.id, hash: match.sha256Hash, status: match.status })),
      fileId,
    );
    const duplicate = matches.find((match) => match.id === targetId);
    if (duplicate && !options?.force) {
      await db.row.deleteMany({ where: { fileId } });
      await db.sheet.deleteMany({ where: { fileId } });
      await db.file.update({
        where: { id: fileId },
        data: {
          sha256Hash,
          sizeBytes: BigInt(info.size),
          status: "duplicate",
          duplicateOfFileId: duplicate.id,
          rowCount: 0,
          sheetCount: 0,
          errorMessage: `Duplicate of ${duplicate.originalName}`,
          importedAt: new Date(),
        },
      });
      return;
    }

    let storagePath = sourcePath;
    if (!file.absolutePath) {
      const destinationDir = path.join(/*turbopackIgnore: true*/ storageRoot(), fileId);
      await mkdir(destinationDir, { recursive: true });
      storagePath = path.join(/*turbopackIgnore: true*/ destinationDir, file.originalName);
      if (path.resolve(/*turbopackIgnore: true*/ sourcePath) !== path.resolve(/*turbopackIgnore: true*/ storagePath)) {
        await copyFile(sourcePath, storagePath);
      }
    }

    await db.row.deleteMany({ where: { fileId } });
    await db.sheet.deleteMany({ where: { fileId } });

    if (large || !buffer) {
      const imported = await importLargeWorkbook(db, fileId, sourcePath, file.selectedSheets);
      await db.file.update({
        where: { id: fileId },
        data: {
          sha256Hash,
          sizeBytes: BigInt(info.size),
          storagePath,
          status: "done",
          duplicateOfFileId: null,
          errorMessage: imported.failures.length > 0 ? imported.failures.join("\n").slice(0, 1000) : null,
          sheetCount: imported.sheetCount,
          rowCount: imported.rowCount,
          importedAt: new Date(),
        },
      });
      return;
    }

    const grids = readWorkbookBuffer(buffer);
    const chosen = sheetsToImport(grids.map((sheet) => sheet.name), file.selectedSheets);
    const failures = chosen.missing.map((name) => `${name}: worksheet was not in the file`);
    const tally = emptyQuality();
    if (file.selectedSheets.length > 0 && chosen.included.length === 0) {
      throw new Error("None of the selected worksheets were found.");
    }

    let rowCount = 0;
    let importedSheets = 0;
    for (const sheet of grids) {
      if (!chosen.included.includes(sheet.name)) continue;
      let createdId = "";
      try {
        const parsed = parseGrid(sheet.rows);
        sheet.rows = [];
        await rememberColumns(db, parsed.headers);
        const created = await db.sheet.create({
          data: {
            fileId,
            name: sheet.name,
            headerRowNumber: parsed.headerRowNumber,
            rowCount: parsed.rows.length,
          },
        });
        createdId = created.id;
        for (let offset = 0; offset < parsed.rows.length; offset += BATCH) {
          const batch = parsed.rows.slice(offset, offset + BATCH);
          await db.row.createMany({
            data: batch.map((row) => ({
              fileId,
              sheetId: created.id,
              rowNumber: row.rowNumber,
              data: row.data,
              searchText: row.searchText,
              phoneKeys: row.phoneKeys,
              emailKeys: row.emailKeys,
            })),
          });
        }
        for (const row of parsed.rows) addQuality(tally, row);
        rowCount += parsed.rows.length;
        importedSheets += 1;
        await noteProgress(db, fileId, rowCount, importedSheets);
      } catch (error) {
        if (createdId) {
          await db.row.deleteMany({ where: { sheetId: createdId } });
          await db.sheet.delete({ where: { id: createdId } }).catch(() => undefined);
        }
        failures.push(`${sheet.name}: ${readableError(error)}`);
      }
    }

    await db.file.update({
      where: { id: fileId },
      data: {
        sha256Hash,
        sizeBytes: BigInt(info.size),
        storagePath,
        status: importedSheets === 0 && failures.length > 0 ? "failed" : "done",
        duplicateOfFileId: null,
        errorMessage: [...failures, qualityLine(tally)].filter(Boolean).join("\n").slice(0, 1000) || null,
        sheetCount: importedSheets,
        rowCount,
        importedAt: new Date(),
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "The file could not be read.";
    console.error(raw.replace(/\d{5,}/g, "#").slice(0, 300));
    const tooBig = error instanceof Error && error.message.startsWith("larger than");
    await db.file.update({
      where: { id: fileId },
      data: {
        status: "failed",
        errorMessage: tooBig
          ? `This file is larger than ${process.env.MAX_UPLOAD_MB || "50"} MB. Raise MAX_UPLOAD_MB in .env if you need to import it.`
          : readableError(error),
      },
    });
  }
}
