import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

const UPLOAD_ACTIONS = ["upload", "replace-file", "reprocess-file", "delete-file"];

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  const entries = await prisma.auditLog.findMany({
    where: scope === "uploads" ? { action: { in: UPLOAD_ACTIONS } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, detail: true, createdAt: true },
  });
  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      detail: entry.detail ?? "",
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
