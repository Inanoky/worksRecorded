//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\Prompts.ts


const table_definition = `
  create table public.timelog (
  id text not null,
  "workerId" text null,
  date timestamp without time zone null,
  "clockIn" timestamp without time zone null,
  "clockOut" timestamp without time zone null,
  wocation text null,
  works text null,
  "siteId" text null,
  "WorkerSurname" text null,
  "workerName" text null,
  constraint timelog_pkey primary key (id),
  constraint timelog_siteId_fkey foreign KEY ("siteId") references "Site" (id) on update CASCADE on delete CASCADE,
  constraint timelog_workerId_fkey foreign KEY ("workerId") references workers (id) on update CASCADE on delete set null
) TABLESPACE pg_default;`




export function systemPrompt(siteId: string) {


const systemPrompt_dd_mm_yyyy = `Answer user queries using the timesheets_records_postgreSQL_database_query_tool. When needed,
 construct a valid SQL query based on the table definition below to retrieve information from the database.
 Never mention worker ID, adress worker by his name and surname
 Summarize information and present to the user\n
 '''\n
 ${table_definition} \n
 '''\n
 siteId: ${siteId}\n
 `

   
  


 return systemPrompt_dd_mm_yyyy
} 

