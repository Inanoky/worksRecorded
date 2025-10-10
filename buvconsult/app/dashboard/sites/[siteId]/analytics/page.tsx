import {getCategoryMonthlySpendings, getMonthlySpendings} from "@/server/actions/analytics-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MonthlySpendingsChart} from "@/components/landing/analytics/MonthlySpendingsChart";
import {MonthlyCategoryChart} from "@/components/landing/analytics/MonthlyCategoryChart";
import {BudgetVsReal} from "@/components/landing/analytics/BudgetVsReal";
import {PieCharTotals} from "@/components/landing/analytics/PieCharTotals";
import {KeyMetrics} from "@/components/landing/analytics/KeyMetrics";
import AiWidgetRag from "@/components/ai/AiChat";

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