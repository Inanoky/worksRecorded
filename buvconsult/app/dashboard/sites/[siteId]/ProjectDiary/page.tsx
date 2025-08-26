import {GetRecordsFromDB} from "@/app/actions/ProjectDiaryActions"
import AiWidgetRag from "@/components/AI/RAG/AiWidgetRag";
import {DocumentsDataTable} from "@/components/DocumentDataTable";
import {GetDocumentsFromDB, GetInvoicesFromDB, getProjectNameBySiteId} from "@/app/actions/actions";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {TemplateTable} from "@/components/templates/frontendTable";
import {GenericTemplateTable} from "@/components/templates/tableWithGenericActions";

export default async function ProjectDiary ({params}:

{params : Promise <{siteId:string}>

}){



    const {siteId} = await params
    const records = await GetRecordsFromDB(siteId)
    const projectName = await getProjectNameBySiteId(siteId)





    return (

       
               <div className="w-full">
       
                             <GenericTemplateTable
                                data={records}               // your rows with UI keys like "record", "date"
                                pageSize={20}
                                tableName="projectdiaryrecord"
                                siteId={siteId}
                                editableFields={[3]}         // which UI columns are editable (1-based index)
                                fieldMap={{                  // 👈 UI key -> DB key
                                    record: "Record",          // UI "record" maps to DB "Record"
                                    date: "Date",              // (only if you plan to edit Date)
                                }}
/>
               </div>
       
    )
}

