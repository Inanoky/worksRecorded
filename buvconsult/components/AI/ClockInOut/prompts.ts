import { isWorkerClockedIn } from "@/app/clockinActions";



export function systemPromptFunction(workerName, workerId, status){


 
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

const prompt = prompt_18_08_2025

  console.log(today)



   return prompt
}

