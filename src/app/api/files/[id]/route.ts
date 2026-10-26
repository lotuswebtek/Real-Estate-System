import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { area?: unknown };
  const area = typeof body.area === "string" ? body.area.trim() : "";
  if (!area) return NextResponse.json({ error: "Enter an area name." }, { status: 400 });
  await prisma.file.update({ where: { id }, data: { area } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.file.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
