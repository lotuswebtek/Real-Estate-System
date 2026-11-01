import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  await connection();
  const [byStatus, areas, sheets, incompleteFiles, recent] = await Promise.all([
    prisma.file.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { rowCount: true },
    }),
    prisma.file.groupBy({
      by: ["area"],
      where: { status: "done" },
      _sum: { rowCount: true },
      _count: { _all: true },
    }),
    prisma.sheet.count(),
    prisma.file.count({ where: { status: "done", rowCount: 0 } }),
    prisma.file.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, originalName: true, status: true, rowCount: true, importedAt: true, errorMessage: true },
    }),
  ]);

  const countFor = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const rowsFor = (status: string) => byStatus.find((row) => row.status === status)?._sum.rowCount ?? 0;

  return NextResponse.json({
    filesDone: countFor("done"),
    filesFailed: countFor("failed"),
    filesDuplicate: countFor("duplicate"),
    filesPending: countFor("queued") + countFor("processing") + countFor("waiting"),
    sourceRows: byStatus.reduce((sum, row) => sum + (row._sum.rowCount ?? 0), 0),
    doneRows: rowsFor("done"),
    sheets,
    incompleteFiles,
    areas: areas
      .map((row) => ({ area: row.area || "Unassigned", rows: row._sum.rowCount ?? 0, files: row._count._all }))
      .sort((a, b) => b.rows - a.rows)
      .slice(0, 12),
    recent: recent.map((file) => ({
      id: file.id,
      name: file.originalName,
      status: file.status,
      rows: file.rowCount,
      importedAt: file.importedAt?.toISOString() ?? null,
      error: file.errorMessage ? file.errorMessage.slice(0, 180) : "",
    })),
  });
}
