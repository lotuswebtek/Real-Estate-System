import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { search } from "@/lib/search";
import { searchRequestFromUrl } from "@/lib/search/request";
import type { SearchHit } from "@/lib/search/types";

export const maxDuration = 60;

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function toCsv(rows: SearchHit[], context: string): string {
  const header = ["Owner Name", "Mobile", "Email", "Nationality", "Community", "Building Name", "Plot Number", "Unit Number", "Property type", "Folder", "File", "Sheet", "Row", "Size", "Price", "Flags", "Search context"];
  const lines = rows.map((lead) =>
    [
      lead.name,
      lead.mobileRaw,
      lead.email,
      lead.nationality,
      lead.area,
      lead.project,
      lead.plot,
      lead.unit,
      lead.propertyType,
      lead.folder,
      lead.fileName,
      lead.sheet,
      String(lead.rowNumber),
      lead.size,
      lead.price,
      (lead.flags ?? []).join("; "),
      context,
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${header.join(",")}\n${lines.join("\n")}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchRequestFromUrl(url, 2000);
  parsed.page = 1;
  const result = await search(parsed);
  const context = [parsed.column, parsed.mode].join(" | ");
  await prisma.auditLog.create({
    data: {
      action: "export",
      detail: `rows=${result.hits.length} column=${parsed.column} mode=${parsed.mode}`,
    },
  });
  return new NextResponse(toCsv(result.hits, context), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lead-finder-matches.csv"',
    },
  });
}
