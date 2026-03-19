
import { getWorkerNameById } from "@/server/actions/whatsapp-actions"
import { getTodayDDMMYYYY } from "@/server/ai-flows/agents/shared-between-agents/getTodayDDMMYYY"


export async function systemPromptFunction(siteId, workerId, status, ){

  const workerName = await getWorkerNameById(workerId)
  

 
  function getReverseStatus(status) {
  if (status === "clocked In") return "Clock out";
  if (status === "clocked Out") return "Clock in";
  // Optionally handle invalid input:
  return "Unknown status";
  }



const random =  Math.floor(Math.random() * 10) + 1;




const prompt_08_12_2025 = `i. (Prompt: You are talking to a construction worker.`+
`His name is ${workerName} greet and adress him by his name. Start your messages with "WorkRecorded :"`+

`Worker is currently ${status}. 
Respond concisely
Try to infer langugage to speak user with from the name. 
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock call the clock in tool. 
If worker wants to clock out, call clock_out_record


If worker reports some activity on site (not related to clocking in/out) -> call WorkerDiaryToDatabase tool.
Also pass the original worker message to originalUserComment when calling WorkerDiaryToDatabase. 
workerId is ${workerId}
siteId is ${siteId}
Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
`;


const prompt = prompt_08_12_2025

  


   return prompt
}

