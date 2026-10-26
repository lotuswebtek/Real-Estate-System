import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { enqueueImport } from "@/lib/import/worker";
import { areaFromFileName, folderLabel, isImportableFile, shouldSkipFileName } from "@/lib/import/names";

export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  const paths = form.getAll("paths").map((item) => (typeof item === "string" ? item : ""));
  if (files.length === 0) return NextResponse.json({ error: "Choose at least one Excel or CSV file." }, { status: 400 });

  const source = await prisma.source.findUnique({ where: { id: "manual-uploads" } });
  if (!source) return NextResponse.json({ error: "The upload source is missing. Run the database seed and try again." }, { status: 500 });

  const maxBytes = Number(process.env.MAX_UPLOAD_MB || "50") * 1024 * 1024;
  const accepted: { name: string; status: string }[] = [];

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
    const folder = path.dirname(relative.replace(/\\/g, "/"));
    const record = await prisma.file.create({
      data: {
        sourceId: source.id,
        originalName: name,
        folderPath: folderLabel(folder === "." ? "" : folder),
        area: areaFromFileName(name),
        sizeBytes: BigInt(file.size),
        status: "queued",
      },
    });
    const directory = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PATH || "./storage", record.id);
    await mkdir(directory, { recursive: true });
    const storagePath = path.join(/*turbopackIgnore: true*/ directory, name);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, bytes);
    await prisma.file.update({ where: { id: record.id }, data: { absolutePath: storagePath, storagePath } });
    await enqueueImport(record.id);
    accepted.push({ name, status: "queued" });
  }

  return NextResponse.json({ files: accepted });
}
