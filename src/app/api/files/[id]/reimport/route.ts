import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db/client";
import { enqueueImport } from "@/lib/import/worker";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = await prisma.file.findUnique({
    where: { id },
    select: { id: true, originalName: true, status: true, absolutePath: true, storagePath: true },
  });
  if (!file) return NextResponse.json({ error: "That file is no longer in the library." }, { status: 404 });
  if (!file.absolutePath && !file.storagePath) {
    return NextResponse.json({ error: "The original file is missing, so it cannot be read again." }, { status: 400 });
  }
  if (file.status === "processing" || file.status === "queued") {
    return NextResponse.json({ error: "This file is already importing." }, { status: 409 });
  }
  await prisma.file.update({ where: { id }, data: { status: "queued", errorMessage: null } });
  await enqueueImport(id, true);
  await recordAudit("reprocess-file", `file=${file.originalName} id=${file.id}`);
  return NextResponse.json({ ok: true });
}
