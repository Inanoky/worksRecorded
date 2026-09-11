import { createHash } from "node:crypto";
import {
  BEGIN_ORGANIZATION_ID,
  BEGIN_RATE_CENTS,
  BEGIN_STORAGE_MARKER,
  type BeginDay,
  beginPeriodDates,
  parseBeginDay,
  parseBeginSnapshot,
  summarizeBeginEntries,
} from "@/lib/begin-hours";
import { prisma } from "@/lib/utils/db";

const storageWhere = () => ({
  organizationId: BEGIN_ORGANIZATION_ID,
  archiveReason: BEGIN_STORAGE_MARKER,
  archivedAt: { not: null },
});
export async function persistBeginHours(args: {
  siteId: string;
  snapshot: string;
  objects: string[];
  expectedRevision?: string;
  importedBy: string;
  userId?: string;
}) {
  const target = await prisma.site.findFirst({
    where: { id: args.siteId, organizationId: BEGIN_ORGANIZATION_ID },
    select: { id: true },
  });
  if (!target) throw new Error("Nav Limeni projekta.");
  const snapshot = parseBeginSnapshot(args.snapshot);
  const objects = [...new Set(args.objects)].sort();
  if (
    !objects.length ||
    objects.some((object) => !object || !snapshot.objects.includes(object))
  )
    throw new Error("Izvēlieties Begin objektus šim projektam.");
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${BEGIN_ORGANIZATION_ID}))`;
      const occupied = await tx.sitediaryrecords.findFirst({
        where: {
          organizationId: BEGIN_ORGANIZATION_ID,
          AND: [
            { Comments_Custom_2: { not: null } },
            { Comments_Custom_2: { not: "" } },
            {
              OR: [
                { archiveReason: null },
                { archiveReason: { not: BEGIN_STORAGE_MARKER } },
              ],
            },
          ],
        },
        select: { id: true },
      });
      if (occupied)
        throw new Error(
          "Comments_Custom_2 jau tiek izmantots. Imports nav veikts.",
        );
      const site = await tx.site.findUniqueOrThrow({
        where: { id: args.siteId },
        select: { siteDiaryRecordsMap: true },
      });
      const config = site.siteDiaryRecordsMap as Record<string, unknown> | null;
      const field = config?.Comments_Custom_2 as
        | Record<string, unknown>
        | undefined;
      const custom = field?.customSettings as
        | Record<string, unknown>
        | undefined;
      if (
        (field?.Type && field.Type !== "noRender") ||
        custom?.displayinSiteList === "yes" ||
        field?.Show === true ||
        field?.visible === true ||
        field?.enabled === true
      )
        throw new Error(
          "Comments_Custom_2 ir aktīvs konfigurācijā. Imports nav veikts.",
        );
      const stored = await tx.sitediaryrecords.findMany({
        where: storageWhere(),
        select: { id: true, siteId: true, Comments_Custom_2: true },
      });
      const parsed = stored.map((record) => ({
        ...record,
        day: parseBeginDay(record.Comments_Custom_2),
      }));
      if (
        parsed.some(
          (record) =>
            record.siteId !== args.siteId &&
            record.day.objects.some((object) => objects.includes(object)),
        )
      )
        throw new Error(
          "Begin objekts jau piesaistīts citam WorksRecorded projektam.",
        );
      if (
        parsed.some((record) => record.day.sourceCompany !== snapshot.company)
      )
        throw new Error("Begin uzņēmums atšķiras no iepriekšējā importa.");
      const relevant = parsed.filter((record) => record.siteId === args.siteId);
      const revision = createHash("sha256")
        .update(
          JSON.stringify(
            relevant
              .map((record) => [record.id, record.Comments_Custom_2])
              .sort(),
          ),
        )
        .digest("hex");
      if (
        args.expectedRevision !== undefined &&
        args.expectedRevision !== revision
      )
        throw new Error("Dati mainījušies. Atkārtojiet priekšskatījumu.");
      const days = beginPeriodDates(snapshot.from, snapshot.through).map(
        (date) => {
          const existing = relevant.find((record) => record.day.date === date);
          if (
            existing &&
            JSON.stringify([...existing.day.objects].sort()) !==
              JSON.stringify(objects)
          )
            throw new Error(
              "Šim periodam jāizvēlas iepriekš importētie Begin objekti.",
            );
          if (existing && existing.day.capturedOn > snapshot.capturedOn)
            throw new Error("Nevar aizstāt jaunāku momentuzņēmumu ar vecāku.");
          const entries = snapshot.entries.filter(
            (entry) => entry.date === date && objects.includes(entry.object),
          );
          const day: BeginDay = {
            kind: BEGIN_STORAGE_MARKER,
            version: 1,
            date,
            entries,
            objects,
            sourceCompany: snapshot.company,
            capturedOn: snapshot.capturedOn,
            importedAt: new Date().toISOString(),
            importedBy: args.importedBy,
            rateCents: existing?.day.rateCents ?? BEGIN_RATE_CENTS,
            history: existing
              ? [
                  ...existing.day.history,
                  (({ history, kind, version, date, ...previous }) => previous)(
                    existing.day,
                  ),
                ]
              : [],
          };
          const unchanged =
            existing &&
            JSON.stringify(existing.day.entries) === JSON.stringify(entries) &&
            existing.day.capturedOn === snapshot.capturedOn;
          return { existing, day, unchanged };
        },
      );
      const preview = {
        revision,
        company: snapshot.company,
        from: snapshot.from,
        through: snapshot.through,
        previousMinutes: days.reduce(
          (sum, item) =>
            sum +
            summarizeBeginEntries(item.existing?.day.entries ?? []).minutes,
          0,
        ),
        minutes: days.reduce(
          (sum, item) => sum + summarizeBeginEntries(item.day.entries).minutes,
          0,
        ),
        entries: days.reduce((sum, item) => sum + item.day.entries.length, 0),
        unmappedEntries: snapshot.entries.filter((entry) => !entry.object)
          .length,
        changedDays: days.filter((item) => !item.unchanged).length,
      };
      if (args.expectedRevision === undefined)
        return { ...preview, saved: false };
      for (const { day, existing, unchanged } of days) {
        if (unchanged) continue;
        const payload = JSON.stringify(day);
        if (payload.length > 1_000_000)
          throw new Error("Dienas vēsture pārsniedz 1 MB. Imports nav veikts.");
        if (existing)
          await tx.sitediaryrecords.update({
            where: { id: existing.id },
            data: { Comments_Custom_2: payload },
          });
        else
          await tx.sitediaryrecords.create({
            data: {
              id: createHash("sha256")
                .update(`${BEGIN_ORGANIZATION_ID}:${args.siteId}:${day.date}`)
                .digest("hex"),
              siteId: args.siteId,
              organizationId: BEGIN_ORGANIZATION_ID,
              userId: args.userId,
              Date: new Date(`${day.date}T12:00:00Z`),
              Works: "Stundas dati",
              Comments_Custom_2: payload,
              Photos: [],
              archivedAt: new Date(),
              archiveReason: BEGIN_STORAGE_MARKER,
            },
          });
      }
      return { ...preview, saved: true };
    },
    { timeout: 20000 },
  );
}
