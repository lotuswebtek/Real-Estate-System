import { prisma } from "@/lib/db/prisma";
import { importFileById } from "@/lib/import/store";

const globalWorker = globalThis as unknown as { leadFinderWorker?: boolean };
let busy = false;

async function pump() {
  if (busy) return;
  busy = true;
  let jobId = "";
  try {
    const job = await prisma.job.findFirst({
      where: { status: "pending", runAfter: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    if (!job) return;
    jobId = job.id;
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "running", lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return;
    const payload = job.payload;
    const fileId = payload && typeof payload === "object" && "fileId" in payload ? String(payload.fileId ?? "") : "";
    if (fileId) await importFileById(fileId);
    await prisma.job.update({ where: { id: job.id }, data: { status: "done", errorMessage: null } });
  } catch (error) {
    if (jobId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "failed", errorMessage: error instanceof Error ? error.message : "Import failed" },
      });
    }
  } finally {
    busy = false;
  }
}

export function startImportWorker() {
  if (globalWorker.leadFinderWorker) return;
  globalWorker.leadFinderWorker = true;
  setInterval(() => {
    void pump();
  }, 2000);
  void pump();
}

export async function enqueueImport(fileId: string) {
  await prisma.job.create({ data: { type: "import-file", payload: { fileId }, status: "pending" } });
}
