import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db/client";
import { enqueueImport } from "@/lib/import/worker";
import { areaFromFileName, folderLabel, isImportableFile, shouldSkipFileName } from "@/lib/import/names";

type UploadResult = { name: string; status: string; existingName?: string };

function sheetNames(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 40);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  const paths = form.getAll("paths").map((item) => (typeof item === "string" ? item : ""));
  if (files.length === 0) return NextResponse.json({ error: "Choose at least one Excel or CSV file." }, { status: 400 });

  const source = await prisma.source.findUnique({ where: { id: "manual-uploads" } });
  if (!source) return NextResponse.json({ error: "The upload source is missing. Run the database seed and try again." }, { status: 500 });

  const maxBytes = Number(process.env.MAX_UPLOAD_MB || "50") * 1024 * 1024;
  const replace = form.get("replace") === "1";
  const category = typeof form.get("area") === "string" ? form.get("area")!.toString().trim() : "";
  const folderOverride = typeof form.get("folder") === "string" ? form.get("folder")!.toString().trim() : "";
  const selectedSheets = files.length === 1 ? sheetNames(form.get("sheets")) : [];
  const accepted: UploadResult[] = [];

  for (const [index, file] of files.entries()) {
    const relative = paths[index] || file.name;
    const name = path.basename(relative);
    if (shouldSkipFileName(name) || !isImportableFile(name)) {
      accepted.push({ name, status: "skipped" });
      continue;
    }
    if (file.size > maxBytes) {
      accepted.push({ name, status: "too-large" });
      continue;
    }

    const folderFromPath = path.dirname(relative.replace(/\\/g, "/"));
    const folderPath = folderOverride || folderLabel(folderFromPath === "." ? "" : folderFromPath);
    const area = category || areaFromFileName(name);
    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256Hash = createHash("sha256").update(bytes).digest("hex");
    const existing = await prisma.file.findFirst({
      where: { sha256Hash, status: { in: ["queued", "processing", "done", "failed", "duplicate"] } },
      select: { id: true, originalName: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    if (existing && (existing.status === "queued" || existing.status === "processing")) {
      accepted.push({ name, status: "already-running", existingName: existing.originalName });
      continue;
    }
    if (existing && !replace) {
      accepted.push({ name, status: "duplicate", existingName: existing.originalName });
      continue;
    }

    if (existing && replace) {
      const directory = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PATH || "./storage", existing.id);
      await mkdir(directory, { recursive: true });
      const storagePath = path.join(/*turbopackIgnore: true*/ directory, name);
      await writeFile(storagePath, bytes);
      await prisma.file.update({
        where: { id: existing.id },
        data: {
          originalName: name,
          folderPath,
          area,
          selectedSheets,
          sizeBytes: BigInt(file.size),
          sha256Hash,
          absolutePath: storagePath,
          storagePath,
          status: "queued",
          errorMessage: null,
          duplicateOfFileId: null,
        },
      });
      await enqueueImport(existing.id, true);
      await recordAudit("replace-file", `file=${name} id=${existing.id} folder=${folderPath}`);
      accepted.push({ name, status: "queued" });
      continue;
    }

    const record = await prisma.file.create({
      data: {
        sourceId: source.id,
        originalName: name,
        folderPath,
        area,
        selectedSheets,
        sizeBytes: BigInt(file.size),
        sha256Hash,
        status: "queued",
      },
    });
    const directory = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PATH || "./storage", record.id);
    await mkdir(directory, { recursive: true });
    const storagePath = path.join(/*turbopackIgnore: true*/ directory, name);
    await writeFile(storagePath, bytes);
    await prisma.file.update({ where: { id: record.id }, data: { absolutePath: storagePath, storagePath } });
    await enqueueImport(record.id);
    await recordAudit("upload", `file=${name} id=${record.id} folder=${folderPath} sheets=${selectedSheets.length || "all"}`);
    accepted.push({ name, status: "queued" });
  }

  return NextResponse.json({ files: accepted });
}
