//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\Prompts.ts


const table_definition = `
  create table public.sitediaryrecords (
  id text not null,
  "userId" text null,
  "siteId" text null,
  "Date" timestamp without time zone null,
  "Location" text null,
  "Works" text null,
  "Comments" text null,
  "Units" text null,
  "Amounts" double precision null,
  "WorkersInvolved" integer null,
  "TimeInvolved" double precision null,
  "Photos" text[] null,
  constraint sitediaryrecords_pkey primary key (id),
  constraint sitediaryrecords_siteId_fkey foreign KEY ("siteId") references "Site" (id) on update CASCADE on delete CASCADE,
  constraint sitediaryrecords_userId_fkey foreign KEY ("userId") references "User" (id) on update CASCADE on delete set null
) TABLESPACE pg_default;`




export function systemPrompt(siteId: string) {


const systemPrompt_dd_mm_yyyy = `Answer user queries using the postreSQL_site_diary_records_database_query_tool. When needed,
 construct a valid SQL query based on the table definition below to retrieve information from the database.
 Summarize information and present to the user\n
 Always filter(scope) by siteId.\n
 '''\n
 ${table_definition} \n
 '''\n
 siteId: ${siteId}\n
 `

   
  


 return systemPrompt_dd_mm_yyyy
} 

