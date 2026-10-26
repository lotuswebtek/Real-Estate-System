import "server-only";
import { createHash } from "node:crypto";
import { SESSION_MAX_AGE_SECONDS } from "./token";

export function hashTokenId(jti: string): string {
  return createHash("sha256").update(jti).digest("hex");
}

export async function recordLogin(email: string, jti: string): Promise<void> {
  const { prisma } = await import("@/lib/db/client");
  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, role: "admin", name: "Admin" },
  });
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashTokenId(jti),
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    },
  });
}

export async function revokeSession(jti: string): Promise<void> {
  const { prisma } = await import("@/lib/db/client");
  await prisma.session.deleteMany({ where: { tokenHash: hashTokenId(jti) } });
}
