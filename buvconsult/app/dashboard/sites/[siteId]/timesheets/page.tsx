



import { AddWorkerForm } from "@/components/ClockInOut/AddWorkerFrom";
import { TemplateTable } from "@/components/templates/frontendTable";
import { getTimelogsBySiteId, getWorkersBySiteId } from "@/app/clockinActions";
import { ScrollTable } from "@/components/templates/scrollAreaTemplate";
import { Card, CardTitle, CardHeader, CardContent, CardFooter} from "@/components/ui/card";

export default async function AddWorkerPage({params}:
            {params: Promise<{siteId:string}>
            }){

    const {siteId} = await params
     const timelogs = await getTimelogsBySiteId(siteId);
     const workers = await getWorkersBySiteId(siteId);





    return (
    <div className="grid grid-cols-1" >
      <div className="flex flex-row justify-start gap-10  max-h-[400px] overflow-hidden" >
      
        {/* Right: Workers Table in ScrollArea, matches form height */}
        <div >
          <div  >
            <Card className = "h-80">
              <CardHeader>
              <CardTitle>Workers on site</CardTitle>
              </CardHeader>
              <CardContent>
            <ScrollTable
             data={workers}
              pageSize={25} 
              visibleColumns={[2,3,4,5,6,7,8,9,10]} 
              columnLabels={["ID", "First Name", "Last Name", "ID", "Phone", "On site?", "Clock In", "Last Work"]}
              toolbar={false} />
              </CardContent>
              <CardFooter>
                something
                </CardFooter>
            </Card>
          </div>
        </div>
          {/* Left: AddWorkerForm */}
        <div >
          <AddWorkerForm siteId={siteId} />
        </div>

      </div>

      {/* Timelogs Table (below, takes natural height) */}
      <div className="mt-8">
        <TemplateTable data={timelogs} pageSize={20}  />
      </div>
    </div>
  );
}