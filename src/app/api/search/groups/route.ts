import { NextResponse } from "next/server";
import { groupedSearch } from "@/lib/search";
import { searchRequestFromUrl } from "@/lib/search/request";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const by = url.searchParams.get("by") === "name" ? "name" : "mobile";
  const groups = await groupedSearch(searchRequestFromUrl(url, 100), by);
  return NextResponse.json({ groups });
}
