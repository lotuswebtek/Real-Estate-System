import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth/token";
import { revokeSession } from "@/lib/auth/users";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const session = await readSession(token ? decodeURIComponent(token) : undefined);
  if (session) {
    try {
      await revokeSession(session.jti);
    } catch {
      console.error("Could not revoke the session in Postgres. The cookie was still cleared.");
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
