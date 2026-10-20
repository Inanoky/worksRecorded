import { Prisma } from "@prisma/client";

export function buildZtcImageBatchStageQuery(args: {
	id: string;
	batchKey: string;
	workerId: string;
	organizationId: string | null;
	mode: string;
	item: unknown;
	messageId: string;
	quietMs: number;
	staleMs: number;
}) {
	return Prisma.sql`
    INSERT INTO "ZtcInboundMediaBatch" (
      "id", "batchKey", "workerId", "organizationId", "mode", "status",
      "items", "firstReceivedAt", "lastReceivedAt", "lastMessageId",
      "processAfter", "createdAt", "updatedAt"
    ) VALUES (
      ${args.id}, ${args.batchKey}, ${args.workerId}, ${args.organizationId},
      ${args.mode}, 'collecting', ${JSON.stringify([args.item])}::jsonb,
      NOW(), NOW(), ${args.messageId || null},
      NOW() + (${args.quietMs}::int * INTERVAL '1 millisecond'), NOW(), NOW()
    )
    ON CONFLICT ("batchKey") DO UPDATE SET
      "id" = CASE
        WHEN "ZtcInboundMediaBatch"."status" = 'collecting'
          AND "ZtcInboundMediaBatch"."updatedAt" > NOW() - (${args.staleMs}::int * INTERVAL '1 millisecond')
        THEN "ZtcInboundMediaBatch"."id"
        ELSE EXCLUDED."id"
      END,
      "workerId" = EXCLUDED."workerId",
      "organizationId" = EXCLUDED."organizationId",
      "mode" = EXCLUDED."mode",
      "status" = 'collecting',
      "items" = CASE
        WHEN "ZtcInboundMediaBatch"."status" = 'collecting'
          AND "ZtcInboundMediaBatch"."updatedAt" > NOW() - (${args.staleMs}::int * INTERVAL '1 millisecond')
        THEN "ZtcInboundMediaBatch"."items" || EXCLUDED."items"
        ELSE EXCLUDED."items"
      END,
      "firstReceivedAt" = CASE
        WHEN "ZtcInboundMediaBatch"."status" = 'collecting'
          AND "ZtcInboundMediaBatch"."updatedAt" > NOW() - (${args.staleMs}::int * INTERVAL '1 millisecond')
        THEN "ZtcInboundMediaBatch"."firstReceivedAt"
        ELSE EXCLUDED."firstReceivedAt"
      END,
      "lastReceivedAt" = NOW(),
      "lastMessageId" = EXCLUDED."lastMessageId",
      "processAfter" = EXCLUDED."processAfter",
      "updatedAt" = NOW()
    RETURNING jsonb_array_length("items") AS "itemCount"
  `;
}

export function buildZtcImageBatchDeleteQuery(batchId: string) {
	return Prisma.sql`
    DELETE FROM "ZtcInboundMediaBatch"
    WHERE "id" = ${batchId} AND "status" = 'processing'
  `;
}
