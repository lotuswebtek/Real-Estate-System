import { prisma } from "@/lib/db/prisma";
import { importFileById } from "@/lib/import/store";

const globalWorker = globalThis as unknown as { leadFinderWorker?: boolean };
const STALE_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;
let busy = false;

function fileIdFrom(payload: unknown): string {
  return payload && typeof payload === "object" && "fileId" in payload ? String(payload.fileId ?? "") : "";
}

async function reclaimStuckFiles() {
  const staleBefore = new Date(Date.now() - STALE_MS);
  const stuck = await prisma.file.findMany({
    where: { status: { in: ["processing", "queued"] }, updatedAt: { lt: staleBefore } },
    select: { id: true },
  });
  for (const file of stuck) {
    const activeJob = await prisma.job.findFirst({
      where: { status: { in: ["pending", "running"] }, payload: { path: ["fileId"], equals: file.id } },
      select: { id: true },
    });
    if (activeJob) continue;
    await prisma.file.update({
      where: { id: file.id },
      data: { status: "failed", errorMessage: "The import stopped before it finished. Use Retry." },
    });
  }
}

async function reclaimStaleJobs() {
  const stale = await prisma.job.findMany({
    where: { status: "running", lockedAt: { lt: new Date(Date.now() - STALE_MS) } },
    select: { id: true, attempts: true, payload: true },
  });
  for (const job of stale) {
    const fileId = fileIdFrom(job.payload);
    if (job.attempts >= MAX_ATTEMPTS) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: "The import stopped before it finished." },
      });
      if (fileId) {
        await prisma.file.updateMany({
          where: { id: fileId, status: { in: ["processing", "queued"] } },
          data: { status: "failed", errorMessage: "The import stopped before it finished. Use Retry." },
        });
      }
      continue;
    }
    await prisma.job.update({ where: { id: job.id }, data: { status: "pending", lockedAt: null } });
  }
}

async function pump() {
  if (busy) return;
  busy = true;
  const started = Date.now();
  try {
    await reclaimStuckFiles();
    await reclaimStaleJobs();
    while (Date.now() - started < 4 * 60 * 1000) {
      const job = await prisma.job.findFirst({
        where: { status: "pending", runAfter: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
      });
      if (!job) break;
      if (job.attempts >= MAX_ATTEMPTS) {
        await prisma.job.update({
          where: { id: job.id },
          data: { status: "failed", errorMessage: "The import stopped before it finished." },
        });
        continue;
      }
      const claimed = await prisma.job.updateMany({
        where: { id: job.id, status: "pending" },
        data: { status: "running", lockedAt: new Date(), attempts: { increment: 1 } },
      });
      if (claimed.count === 0) continue;
      try {
        const fileId = fileIdFrom(job.payload);
        const force = Boolean(job.payload && typeof job.payload === "object" && "force" in job.payload && job.payload.force);
        if (fileId) await importFileById(fileId, prisma, { force });
        await prisma.job.update({ where: { id: job.id }, data: { status: "done", errorMessage: null } });
      } catch (error) {
        await prisma.job.update({
          where: { id: job.id },
          data: { status: "failed", errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Import failed" },
        });
      }
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

export async function enqueueImport(fileId: string, force = false) {
  await prisma.job.create({ data: { type: "import-file", payload: { fileId, force }, status: "pending" } });
  startImportWorker();
  try {
    const { after } = await import("next/server");
    after(() => {
      void pump();
    });
  } catch {
    void pump();
  }
}
