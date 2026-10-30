import { Prisma } from "@prisma/client";

function linkArray(value: Prisma.Sql, fields = ["id", "number", "type"]) {
	return Prisma.sql`(SELECT COALESCE(jsonb_agg(jsonb_build_object(${Prisma.join(fields.map((field) => Prisma.sql`${field}::text, entry -> ${field}::text`))})), '[]'::jsonb)
		FROM jsonb_array_elements(CASE WHEN jsonb_typeof(${value}) = 'array' THEN ${value} ELSE '[]'::jsonb END) entry)`;
}

export const fimaBisLinkMetadataSql = Prisma.sql`jsonb_build_object(
	'kuceImport', jsonb_build_object('bisLinks', ${linkArray(Prisma.sql`r."evalMetadata" #> '{kuceImport,bisLinks}'`)}),
	'fimaMaterialReceiptPlan', jsonb_build_object('bisRecords', ${linkArray(Prisma.sql`r."evalMetadata" #> '{fimaMaterialReceiptPlan,bisRecords}'`)}),
	'fimaCollaboration', jsonb_build_object('bisMaterials', jsonb_build_object('entries', ${linkArray(Prisma.sql`r."evalMetadata" #> '{fimaCollaboration,bisMaterials,entries}'`, ["bisId", "number"])}))
) || COALESCE((SELECT jsonb_object_agg(key, jsonb_build_object('records', ${linkArray(Prisma.sql`value -> 'records'`)}))
	FROM jsonb_each(CASE WHEN jsonb_typeof(r."evalMetadata") = 'object' THEN r."evalMetadata" ELSE '{}'::jsonb END)
	WHERE key ~ '^fimaBisDraftCreation([0-9]{8})?$'), '{}'::jsonb)`;
