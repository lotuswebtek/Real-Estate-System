import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const entries = await prisma.auditLog.findMany({
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
