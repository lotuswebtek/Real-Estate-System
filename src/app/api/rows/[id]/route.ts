import { NextResponse } from "next/server";
import { leadById, relatedTo } from "@/lib/search";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const [lead, related] = await Promise.all([leadById(id), relatedTo(id)]);
  if (!lead) return NextResponse.json({ lead: null, related: [] }, { status: 404 });
  return NextResponse.json({ lead, related });
}
