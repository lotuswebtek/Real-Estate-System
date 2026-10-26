import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/paths";
import { secretsMatch } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/token";
import { recordLogin } from "@/lib/auth/users";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown }).email === "string" ? (body as { email: string }).email.trim().toLowerCase() : "";
  const password = typeof (body as { password?: unknown }).password === "string" ? (body as { password: string }).password : "";
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!adminEmail || adminPassword.length < 8 || (process.env.SESSION_SECRET?.length ?? 0) < 32) {
    return NextResponse.json(
      { error: "The server is missing ADMIN_EMAIL, ADMIN_PASSWORD (8+ characters), or SESSION_SECRET (32+ characters) in .env. Add them and restart." },
      { status: 500 },
    );
  }

  if (!email || !password || !secretsMatch(email, adminEmail) || !secretsMatch(password, adminPassword)) {
    return NextResponse.json(
      { error: "That email or password does not match the admin account in .env." },
      { status: 401 },
    );
  }

  const signed = await signSession({ email: adminEmail, role: "admin", name: "Admin" });
  if (!signed) {
    return NextResponse.json({ error: "SESSION_SECRET in .env needs to be at least 32 characters." }, { status: 500 });
  }

  try {
    await recordLogin(adminEmail, signed.jti);
  } catch {
    console.error("Could not record the login in Postgres. Sign-in still succeeded.");
  }

  const response = NextResponse.json({ ok: true, next: safeNextPath(typeof (body as { next?: unknown }).next === "string" ? (body as { next: string }).next : "/") });
  response.cookies.set(SESSION_COOKIE, signed.token, sessionCookieOptions());
  return response;
}
