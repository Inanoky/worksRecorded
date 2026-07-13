const table_definition = `
  create table public."BISmaterialRecords" (
  id text not null,
  name text null,
  quantity double precision null,
  "categoryId" text null,
  "categoryName" text null,
  "measurementUnitId" text null,
  "measurementUnit" text null,
  cost double precision null,
  "invoiceNr" text null,
  "invoiceDate" timestamp without time zone null,
  "materialDate" timestamp without time zone null,
  "supplierName" text null,
  "importBatchId" text null,
  "costCode" text null,
  "sourcePhoto" text null,
  "declarationAttachment" jsonb null,
  "agreementAttachment" jsonb null,
  "siteId" text null,
  "userId" text null,
  "orgId" text null,
  "createdAt" timestamp without time zone not null,
  "BISId" text null,
  "bisStatus" text null,
  constraint BISmaterialRecords_pkey primary key (id)
) TABLESPACE pg_default;`

export function systemPrompt(siteId: string) {
  const systemPrompt_15_04_2026 = `Answer user queries using the postreSQL_bis_material_records_database_query_tool. When needed,
construct a valid SQL query based on the table definition below to retrieve information from the database.
Summarize information and present it to the user.\n
Always filter(scope) by siteId.\n
You are only allowed to make Select statements.\n
'''\n
${table_definition}\n
'''\n
You are only allowed to query for this siteId: ${siteId}\n`

  return systemPrompt_15_04_2026
}
