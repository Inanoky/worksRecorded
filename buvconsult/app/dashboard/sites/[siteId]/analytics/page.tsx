import {getCategoryMonthlySpendings, getMonthlySpendings} from "@/server/actions/analytics-actions";
import { MonthlySpendingsChart} from "@/components/analytics/MonthlySpendingsChart";
import {MonthlyCategoryChart} from "@/components/analytics/MonthlyCategoryChart";
import {BudgetVsReal} from "@/components/analytics/BudgetVsReal";
import {KeyMetrics} from "@/components/analytics/KeyMetrics";
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