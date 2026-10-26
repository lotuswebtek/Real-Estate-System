import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const files = await prisma.file.findMany({
    orderBy: [{ folderPath: "asc" }, { originalName: "asc" }],
    select: {
      id: true,
      originalName: true,
      area: true,
      folderPath: true,
      sheetCount: true,
      rowCount: true,
      status: true,
      errorMessage: true,
      importedAt: true,
    },
  });
  return NextResponse.json({
    files: files.map((file) => ({
      ...file,
      importedAt: file.importedAt?.toISOString() ?? null,
    })),
  });
}
