import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnv() {
  const text = readFileSync(path.join(process.cwd(), ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!key || process.env[key]) continue;
    process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const { prisma } = await import("../src/lib/db/prisma");
  const { importFileById } = await import("../src/lib/import/store");
  const failed = process.argv[2]
    ? await prisma.file.findMany({ where: { status: "failed", originalName: process.argv[2] }, select: { id: true, originalName: true } })
    : await prisma.file.findMany({ where: { status: "failed" }, select: { id: true, originalName: true } });
  console.log(`Retrying ${failed.length} files`);
  for (const file of failed) {
    console.log(`start ${file.originalName}`);
    try {
      await importFileById(file.id, prisma);
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/\d/g, "#").slice(0, 180) : "failed";
      console.log(`threw ${file.originalName} ${message}`);
    }
    const saved = await prisma.file.findUnique({ where: { id: file.id }, select: { status: true, rowCount: true, errorMessage: true } });
    const detail = saved?.status === "failed" ? saved.errorMessage ?? "failed" : `${saved?.rowCount ?? 0} rows`;
    console.log(`${saved?.status ?? "failed"}  ${file.originalName}  ${detail}`);
  }
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message.replace(/\d/g, "#") : "Retry failed");
  process.exit(1);
});
