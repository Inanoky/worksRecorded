import {GetRecordsFromDB} from "@/server/actions/project-diary-actions"
import { GenericTemplateTable } from "@/components/_templates/tableWithGenericActions";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { notFound } from "next/navigation";




export default async function ProjectDiary ({params}:

{params : Promise <{siteId:string}>

}){



    const {siteId} = await params
    const records = await GetRecordsFromDB(siteId)

    
       const user = await requireUser();
        const site = await orgCheck(user.id, siteId);
          if (!site) {
        notFound();
      }
    


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

