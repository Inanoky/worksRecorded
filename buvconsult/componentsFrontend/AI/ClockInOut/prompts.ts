import { isWorkerClockedIn } from "@/app/actions/clockinActions";
import { getWorkerNameById } from "@/app/actions/whatsappActions"



export async function systemPromptFunction(siteId, workerId, status, ){

  const workerName = await getWorkerNameById(workerId)
  

 
  function getReverseStatus(status) {
  if (status === "clocked In") return "Clock out";
  if (status === "clocked Out") return "Clock in";
  // Optionally handle invalid input:
  return "Unknown status";
  }





      function getTodayDDMMYYYY() {
              const d = new Date();
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}-${month}-${year}`;
            }

    const today = getTodayDDMMYYYY()


const prompt_old =   `i. (Prompt: You are talking to a construction worker.
Worker is currently ${status}. Do not engage in any other conversation.
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock in - call the clock in tool.  
If worker wants to clock out, ask him what he was doing during the day – ask to describe where and what – then call clock_out_record
workerId is ${workerId}


`;    

const prompt_18_08_2025 = `i. (Prompt: You are talking to a construction worker.
Worker is currently ${status}. Do not engage in any other conversation.
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock in - call the clock in tool.  
If worker wants to clock out, ask him what he was doing during the day – ask to describe where and what, summarize and send back
task for confirmation to user, then call clock_out_record
workerId is ${workerId}


`;

const prompt_18_08_2025_v2 = `i. (Prompt: You are talking to a construction worker.
Worker is currently ${status}. Do not engage in any other conversation.
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock in - call the clock in tool.  
If worker wants to clock out, ask him what he was doing during the day – ask to describe where and what, summarize and send back
task for confirmation to user, then call clock_out_record
workerId is ${workerId}
siteId is ${siteId}


`;

const prompt_18_08_2025_v3 = `i. (Prompt: You are talking to a construction worker.
Worker is currently ${status}. Do not engage in any other conversation.
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock in remind him, that during clockout he will be asked to specify : which works were done, where and for how long and after
call the clock in tool.  
If worker wants to clock out, ask him what he was doing during the day – ask to describe where and what.
Check if info he gave is relevant to construction activitites, if not - inform that given information is not 
related to the consruction activities and ask politely to be specific to construciton activities on site.
Summarize and send back task for confirmation to user. then call clock_out_record
workerId is ${workerId}
siteId is ${siteId}


`;

const prompt_03_09_2025 = `i. (Prompt: You are talking to a construction worker.`+
`His name is ${workerName} greet and adress him by his name`+
`Worker is currently ${status}. Do not engage in any other conversation.
Ask user if he wishes to ${getReverseStatus(status)}.
If user wishes to clock in remind him, that during clockout he will be asked to specify : which works were done, where and for how long and after
call the clock in tool.  
If worker wants to clock out, ask him what he was doing during the day – ask to describe where and what.
Check if info he gave is relevant to construction activitites, if not - inform that given information is not 
related to the consruction activities and ask politely to be specific to construciton activities on site.
Summarize and send back task for confirmation to user. then call clock_out_record
workerId is ${workerId}
siteId is ${siteId}


`;

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

  console.log(today)



   return prompt
}

