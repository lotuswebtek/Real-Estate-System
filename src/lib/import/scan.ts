import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { importFileById } from "@/lib/import/store";
import { areaFromFileName, folderLabel, isImportableFile, shouldSkipFileName } from "@/lib/import/names";
import { prisma } from "@/lib/db/prisma";

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

export type ScanSummary = {
  sourceId: string;
  checked: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
};

async function ensureDiskSpace() {
  try {
    const space = await statfs(process.cwd());
    const free = Number(space.bavail) * Number(space.bsize);
    if (free < 3 * 1024 * 1024 * 1024) {
      throw new Error("The disk is nearly full, so the import stopped before the next file.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The disk")) throw error;
  }
}

export async function importFolder(root: string, db: PrismaClient = prisma, onFile?: (message: string) => void): Promise<ScanSummary> {
  const resolved = path.resolve(root);
  const info = await stat(resolved);
  if (!info.isDirectory()) throw new Error("That path is not a folder.");

  const existing = await db.source.findFirst({ where: { type: "local", localPath: resolved } });
  const source =
    existing ??
    (await db.source.create({
      data: { type: "local", name: path.basename(resolved), localPath: resolved, status: "active" },
    }));

  const files = await walk(resolved);
  const summary: ScanSummary = { sourceId: source.id, checked: files.length, imported: 0, duplicates: 0, skipped: 0, failed: 0 };

  for (const [index, full] of files.entries()) {
    const name = path.basename(full);
    if (shouldSkipFileName(name) || !isImportableFile(name)) {
      summary.skipped += 1;
      continue;
    }
    const fileInfo = await stat(full);
    const mtime = BigInt(Math.round(fileInfo.mtimeMs));
    const relativeDir = path.dirname(path.relative(resolved, full));
    const folderPath = folderLabel(relativeDir === "." ? "" : relativeDir);
    const current = await db.file.findFirst({ where: { sourceId: source.id, absolutePath: full } });
    if (current?.status === "done" && current.sizeBytes === BigInt(fileInfo.size) && current.localMtimeMs === mtime) {
      summary.skipped += 1;
      onFile?.(`${index + 1}/${files.length}  unchanged  ${name}`);
      continue;
    }
    await ensureDiskSpace();
    const record = current
      ? await db.file.update({
          where: { id: current.id },
          data: {
            originalName: name,
            folderPath,
            area: areaFromFileName(name),
            sizeBytes: BigInt(fileInfo.size),
            localMtimeMs: mtime,
            status: "queued",
            errorMessage: null,
          },
        })
      : await db.file.create({
          data: {
            sourceId: source.id,
            originalName: name,
            absolutePath: full,
            folderPath,
            area: areaFromFileName(name),
            sizeBytes: BigInt(fileInfo.size),
            localMtimeMs: mtime,
            status: "queued",
          },
        });
    await importFileById(record.id, db);
    const saved = await db.file.findUnique({ where: { id: record.id }, select: { status: true, rowCount: true, errorMessage: true } });
    if (saved?.status === "done") summary.imported += 1;
    else if (saved?.status === "duplicate") summary.duplicates += 1;
    else summary.failed += 1;
    const detail = saved?.status === "failed" ? saved.errorMessage ?? "failed" : `${saved?.rowCount ?? 0} rows`;
    onFile?.(`${index + 1}/${files.length}  ${saved?.status ?? "failed"}  ${name}  ${detail}`);
  }

  await db.source.update({ where: { id: source.id }, data: { lastSyncedAt: new Date(), status: "active", errorMessage: null } });
  return summary;
}
