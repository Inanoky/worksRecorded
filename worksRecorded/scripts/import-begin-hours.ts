import "dotenv/config";
import { readFile } from "node:fs/promises";
import { persistBeginHours } from "@/lib/begin-hours-server";
import { prisma } from "@/lib/utils/db";

async function main() {
  const [snapshotPath, mappingPath, mode] = process.argv.slice(2);
  if (!snapshotPath || !mappingPath || (mode && mode !== "--apply"))
    throw new Error(
      "Usage: npx tsx scripts/import-begin-hours.ts snapshot.json mappings.json [--apply]",
    );
  const snapshot = await readFile(snapshotPath, "utf8");
  const mappings: { siteId: string; objects: string[] }[] = JSON.parse(
    await readFile(mappingPath, "utf8"),
  );
  for (const mapping of mappings) {
    const args = {
      ...mapping,
      snapshot,
      importedBy: "codex:authorized-user-import",
    };
    const preview = await persistBeginHours(args);
    console.log(JSON.stringify({ siteId: mapping.siteId, ...preview }));
    if (mode === "--apply")
      console.log(
        JSON.stringify({
          siteId: mapping.siteId,
          ...(await persistBeginHours({
            ...args,
            expectedRevision: preview.revision,
          })),
        }),
      );
  }
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Import failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
