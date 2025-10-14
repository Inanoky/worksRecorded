
import { getWorkerNameById } from "@/server/actions/whatsapp-actions"



export async function systemPromptFunction(siteId, workerId, status, ){

  const workerName = await getWorkerNameById(workerId)
  

 
  function getReverseStatus(status) {
  if (status === "clocked In") return "Clock out";
  if (status === "clocked Out") return "Clock in";
  // Optionally handle invalid input:
  return "Unknown status";
  }






const prompt_13_10_2025 = `i. (Prompt: You are talking to a construction worker.`+
`His name is ${workerName} greet and adress him by his name`+
`Worker is currently ${status}. Do not engage in any other conversation.
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock call the clock in tool.  
If worker wants to clock out, call clock_out_record
workerId is ${workerId}
siteId is ${siteId}
`;


const prompt = prompt_13_10_2025

  


   return prompt
}

