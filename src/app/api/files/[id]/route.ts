import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db/client";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { area?: unknown };
  const area = typeof body.area === "string" ? body.area.trim() : "";
  if (!area) return NextResponse.json({ error: "Enter an area name." }, { status: 400 });
  await prisma.file.update({ where: { id }, data: { area } });
  return NextResponse.json({ ok: true });
}

function storedDirectory(target: string): string | null {
  const root = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PATH || "./storage");
  const dir = path.resolve(/*turbopackIgnore: true*/ path.dirname(target));
  const rootKey = root.toLowerCase();
  const dirKey = dir.toLowerCase();
  if (dirKey === rootKey || !dirKey.startsWith(`${rootKey}${path.sep}`)) return null;
  return dir;
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = await prisma.file.findUnique({
    where: { id },
    select: { id: true, originalName: true, status: true, absolutePath: true, storagePath: true },
  });
  if (!file) return NextResponse.json({ error: "That file is no longer in the library." }, { status: 404 });
  if (file.status === "queued" || file.status === "processing") {
    return NextResponse.json({ error: "Wait until this import finishes before deleting it." }, { status: 409 });
  }
  await recordAudit("delete-file", `file=${file.originalName} id=${file.id}`);
  await prisma.file.delete({ where: { id } });
  const target = file.absolutePath || file.storagePath;
  const directory = target ? storedDirectory(target) : null;
  if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
