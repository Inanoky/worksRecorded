import {GetRecordsFromDB} from "@/server/actions/project-diary-actions"
import { getProjectNameBySiteId} from "@/server/actions/shared-actions";
import {GenericTemplateTable} from "@/components/_templates/tableWithGenericActions";

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

