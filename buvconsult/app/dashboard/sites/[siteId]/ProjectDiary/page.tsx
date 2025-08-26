import {GetRecordsFromDB} from "@/app/ProjectDiaryActions"
import AiWidgetRag from "@/components/AI/RAG/AiWidgetRag";
import {DocumentsDataTable} from "@/components/DocumentDataTable";
import {GetDocumentsFromDB, GetInvoicesFromDB, getProjectNameBySiteId} from "@/app/actions";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {TemplateTable} from "@/components/templates/frontendTable";

export default async function ProjectDiary ({params}:

{params : Promise <{siteId:string}>

}){



    const {siteId} = await params
    const records = await GetRecordsFromDB(siteId)
    const projectName = await getProjectNameBySiteId(siteId)





    return (

       
               <div className="w-full">
       
                             <TemplateTable data={records} pageSize={20}  />
               </div>
       
    )
}

