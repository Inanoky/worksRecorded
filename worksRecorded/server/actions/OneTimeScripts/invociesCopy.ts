// scripts/copyInvoicesBetweenSites.ts
//
// Usage (example):
//   npx ts-node scripts/copyInvoicesBetweenSites.ts
//
// Assumes prisma client is generated and DATABASE_URL is set.
//
// What it does:
// - Copies ALL invoices from copyFrom site to copyTo site
// - Copies ALL invoice items belonging to each invoice
// - Keeps original invoice IDs? NO (new IDs are generated)
// - Preserves original uploadedAt/createdAt where available
// - Sets SiteId/siteId on new records to copyTo
//
// IMPORTANT:
// - If your DB has unique constraints not shown here (e.g. invoiceNumber unique), you may need to adjust.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Hardcode here
const copyFrom = "4b8c3b2e-683d-4ff3-83c1-dd9d73609fa6";
const copyTo = "97e7fec4-3b34-4dd5-839f-fcd56072a2ee";

type InvoiceWithItems = Awaited<
  ReturnType<typeof prisma.invoices.findMany>
>[number] & { items?: any[] };

async function main() {
  if (!copyFrom || !copyTo) {
    throw new Error("copyFrom and copyTo must be set.");
  }
  if (copyFrom === copyTo) {
    throw new Error("copyFrom and copyTo cannot be the same.");
  }

  // Ensure both sites exist
  const [fromSite, toSite] = await Promise.all([
    prisma.site.findUnique({ where: { id: copyFrom }, select: { id: true } }),
    prisma.site.findUnique({ where: { id: copyTo }, select: { id: true } }),
  ]);

  if (!fromSite) throw new Error(`Source site not found: ${copyFrom}`);
  if (!toSite) throw new Error(`Target site not found: ${copyTo}`);

  const invoices = await prisma.invoices.findMany({
    where: { SiteId: copyFrom },
    include: { items: true },
    orderBy: { uploadedAt: "asc" },
  });

  console.log(`Found ${invoices.length} invoices to copy.`);

  let copiedInvoices = 0;
  let copiedItems = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const inv of invoices as InvoiceWithItems[]) {
        const {
          id: _oldInvoiceId,
          SiteId: _oldSiteId,
          items,
          ...invoiceData
        } = inv;

        // Create new invoice
        const newInvoice = await tx.invoices.create({
          data: {
            ...invoiceData,

            // override the site
            SiteId: copyTo,

            // Safety: keep relations consistent if they exist
            // (If you want to force userId/orgId changes, do it here)
          },
        });

        copiedInvoices++;

        // Create new invoice items
        if (items && items.length > 0) {
          const itemsData = items.map((it: any) => {
            const {
              id: _oldItemId,
              invoiceId: _oldInvoiceId2,
              siteId: _oldItemSiteId,
              ...rest
            } = it;

            return {
              ...rest,
              invoiceId: newInvoice.id,
              siteId: copyTo, // item also points to site
            };
          });

          // createMany is faster; skipDuplicates false by default
          // If you have unique constraints, consider: skipDuplicates: true
          const res = await tx.invoiceItems.createMany({
            data: itemsData,
          });

          copiedItems += res.count;
        }
      }
    },
    { timeout: 600000 }
  );

  console.log(
    `DONE. Copied invoices: ${copiedInvoices}, copied items: ${copiedItems}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
