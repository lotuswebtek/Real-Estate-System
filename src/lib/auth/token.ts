import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "lf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type UserRole = "admin" | "viewer";

export type SessionPayload = {
  email: string;
  role: UserRole;
  name: string;
  jti: string;
};

function secretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function signSession(input: Omit<SessionPayload, "jti">): Promise<{ token: string; jti: string } | null> {
  const key = secretKey();
  if (!key) return null;
  const jti = crypto.randomUUID();
  const token = await new SignJWT({
    email: input.email,
    role: input.role,
    name: input.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.email)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
  return { token, jti };
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== "admin" && payload.role !== "viewer") return null;
    if (typeof payload.email !== "string" || typeof payload.jti !== "string") return null;
    return {
      email: payload.email,
      role: payload.role,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      jti: payload.jti,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
