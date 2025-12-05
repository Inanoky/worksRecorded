//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\Prompts.ts


const table_definition = `
  create table public."InvoiceItems" (
  id text not null,
  item text null,
  currency text null,
  category text null,
  "commentsForUser" text null,
  "invoiceId" text not null,
  "unitOfMeasure" text null,
  "siteId" text null,
  "isInvoice" boolean null,
  sum double precision null,
  "pricePerUnitOfMeasure" double precision null,
  quantity double precision null,
  "itemDescription" text null,
  "invoiceNumber" text null,
  "sellerName" text null,
  "invoiceDate" timestamp without time zone null,
  "paymentDate" timestamp without time zone null,
  constraint InvoiceItems_pkey primary key (id),
  constraint InvoiceItems_invoiceId_fkey foreign KEY ("invoiceId") references "Invoices" (id) on update CASCADE on delete CASCADE,
  constraint InvoiceItems_siteId_fkey foreign KEY ("siteId") references "Site" (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;`




export function systemPrompt(siteId: string) {


const systemPrompt_dd_mm_yyyy = `Answer user queries using the postgreSQL_invoice_database_query_tool. When needed,
 construct a valid SQL query based on the table definition below to retrieve information from the database.
 Summarize information and present to the user\n
 '''\n
 ${table_definition} \n
 '''\n
 siteId: ${siteId}\n
 `
const systemPrompt_30_10_2025 = `Answer user queries using the postgreSQL_invoice_database_query_tool. \n
When needed, construct a valid SQL query based on the table definition below to retrieve information from the database.\n
Always filter(scope) by siteId.\n
 Summarize information and present to the user\n
 
 '''\n
 ${table_definition} \n
 '''\n
 siteId: ${siteId}\n
 `



 const systemPrompt_31_10_2025 = `Answer user queries using the postgreSQL_invoice_database_query_tool. \n
When needed, construct a valid SQL query based on the table definition below to retrieve information from the database.\n
Always filter(scope) by siteId.\n
 Summarize information and present to the user\n
You are only allowed to make Select statements \n
 '''\n
 ${table_definition} \n
 '''\n
 You are only allowed to query for this siteId: ${siteId}\n
 `
  


 return systemPrompt_31_10_2025 
} 

