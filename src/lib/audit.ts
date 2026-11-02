import { prisma } from "@/lib/db/prisma";

export async function recordAudit(action: string, detail: string) {
  const safe = detail.replace(/\d{7,}/g, "#").slice(0, 400);
  await prisma.auditLog.create({ data: { action, detail: safe } });
}
