import { NextResponse } from "next/server";
import { relatedTo } from "@/lib/search";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const related = await relatedTo(id);
  return NextResponse.json({ related });
}
