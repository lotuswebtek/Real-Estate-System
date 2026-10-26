import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession, type SessionPayload } from "./token";

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return readSession(jar.get(SESSION_COOKIE)?.value);
}
