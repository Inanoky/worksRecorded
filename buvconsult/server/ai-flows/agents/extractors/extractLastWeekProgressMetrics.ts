//C:\Users\user\MVP\Buvconsult-deploy\buvconsult\components\AI\SiteDiary\agent.ts
"use server"

import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSiteDiaryPreviousWeek } from "@/server/actions/analytics-actions";
import { savePreviousWeekMetrics } from "@/server/actions/analytics-actions";
import { extractLastWeekProgressMetricsModel, extractLastWeekProgressMetricsModelTemperature } from "@/server/ai-flows/ai-models-settings";
const schema = z.object({


  elementsAssembled: z.number(),
  hoursWorked: z.number(),
  additionalHoursWorked: z.number(),
  delayedHours: z.number(),
  reason: z.string()

});


export async function extractSiteDiaryPreviouseWeek(siteId: string) {
  console.log("Extracting Site Diary metrics for previous week for siteId:", siteId);

  const records = await getSiteDiaryPreviousWeek(siteId);

  
  // 2) Convert Excel → CSV (all sheets)



 


  const llm = new ChatOpenAI({
    model: extractLastWeekProgressMetricsModel,
    temperature: extractLastWeekProgressMetricsModelTemperature
   
  });

  const structured = llm.withStructuredOutput(schema);

      const prompt = [
          
              new SystemMessage(`Those are the Site Diary records for the previous week:\n${JSON.stringify(records)}\n\n`),
              new HumanMessage(` Based on the Site Diary records provided, extract the following metrics for the previous week:
                - Total number of elements assembled                
                - Total hours worked
                - Total additional hours worked
                - Total delayed hours
                - Your carculations reasoning`),
          ]
      
  
 
  // 4) Invoke model (returns parsed & validated Node object)
  const results = await structured.invoke(prompt);


          
  
  await savePreviousWeekMetrics(siteId, results);


  console.log("Extracted Site Diary metrics for previous week:", results);

  return results
}

// Example usage:
