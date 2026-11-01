import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import { searchRequestFromUrl } from "@/lib/search/request";

export async function GET(request: Request) {
  const result = await search(searchRequestFromUrl(new URL(request.url), 100));
  return NextResponse.json(result);
}
