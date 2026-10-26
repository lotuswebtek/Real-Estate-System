import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  const text = readFileSync(file, "utf8");
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
  const { importFolder } = await import("../src/lib/import/scan");
  const root = process.argv[2];
  if (!root) {
    console.error("Add the folder path. Example: npm run import-folder -- \"D:\\Leads\"");
    process.exit(1);
  }
  console.log(`Importing ${root}`);
  const summary = await importFolder(root, prisma, (message) => console.log(message));
  console.log(
    `Done. Checked ${summary.checked}, imported ${summary.imported}, duplicates ${summary.duplicates}, skipped ${summary.skipped}, failed ${summary.failed}.`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Import failed");
  process.exit(1);
});
