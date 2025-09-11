import {getCategoryMonthlySpendings, getMonthlySpendings} from "@/app/actions/AnalyticsActions";
import { Card, CardHeader, CardTitle, CardContent } from "@/componentsFrontend/ui/card";
import { MonthlySpendingsChart} from "@/app/components/frontend/analytics/MonthlySpendingsChart";
import {MonthlyCategoryChart} from "@/app/components/frontend/analytics/MonthlyCategoryChart";
import {BudgetVsReal} from "@/app/components/frontend/analytics/BudgetVsReal";
import {PieCharTotals} from "@/app/components/frontend/analytics/PieCharTotals";
import {KeyMetrics} from "@/app/components/frontend/analytics/keyMetrics";
import AiWidgetRag from "@/componentsFrontend/AI/RAG/AiWidgetRag";

export default async function Analytics({params}:

{params : Promise <{siteId:string}>

}) {

     const {siteId} = await params
    const data = await getMonthlySpendings(siteId)
    const MonthlyCategoryChartData = await getCategoryMonthlySpendings(siteId)

  return (
      <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 auto-rows-fr">
                    <MonthlySpendingsChart data={data}/>
                    <MonthlyCategoryChart data={MonthlyCategoryChartData}/>
                    <BudgetVsReal data={data}/>
                    <KeyMetrics/>

                </div>
                <AiWidgetRag siteId={siteId}/>

          </>

     );
}