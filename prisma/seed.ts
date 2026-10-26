import { PrismaClient } from "@prisma/client";
import { MASTER_COLUMNS } from "../src/lib/columns/aliases";
import { normalizeHeader } from "../src/lib/columns/headers";

const prisma = new PrismaClient();

async function main() {
  await prisma.source.upsert({
    where: { id: "manual-uploads" },
    update: { name: "Manual uploads", isSystem: true, status: "active", type: "upload" },
    create: {
      id: "manual-uploads",
      type: "upload",
      name: "Manual uploads",
      status: "active",
      isSystem: true,
    },
  });

  for (const master of MASTER_COLUMNS) {
    const column = await prisma.column.upsert({
      where: { normalizedKey: master.normalizedKey },
      update: { displayName: master.displayName },
      create: {
        displayName: master.displayName,
        normalizedKey: master.normalizedKey,
      },
    });

    for (const alias of master.aliases) {
      const normalized = normalizeHeader(alias);
      await prisma.columnAlias.upsert({
        where: { normalized },
        update: { columnId: column.id, rawHeader: alias },
        create: {
          columnId: column.id,
          rawHeader: alias,
          normalized,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    await prisma.$disconnect();
    process.exit(1);
  });
