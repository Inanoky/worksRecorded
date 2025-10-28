import { getUserFirstNameById } from "@/server/actions/whatsapp-actions"
import { getTodayDDMMYYYY } from "@/server/ai-flows/agents/shared-between-agents/getTodayDDMMYYY"




export async  function systemPromptFunction(siteId, userId){

  const userName = await getUserFirstNameById(userId);

   




    const prompt_02_09_2025_v4 = `You will have a conversation with the user called ${userName} (Call user by his name) about construction. ` +
    ` activities on site. Your job is to extract necessary information. ` +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing (where work done, how many workers, how mony hours) - ask for clarificaiton, do not assume, but do not ask questions if not necessary" +
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${getTodayDDMMYYYY()} (format dd-mm-yyyy)`


        const prompt_27_10_2025 = `You will have a conversation with the user called ${userName} (Call user by his name) about construction. ` +
    ` activities on site. Your job is to extract necessary information. ` +
    "from the user. If user provide description of construciton works, you need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing (where work done, how many workers, how mony hours) - ask for clarificaiton, do not assume, but do not ask questions if not necessary" +
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
    
    If information provided by user is not a description of construciton works (administrative task, general information, general remark) - mark Works as Notes and save without 
    further questions. 
    `


       const prompt_28_10_2025 = `You will have a conversation with the user called ${userName} (Call user by his name) about construction. ` +
    ` activities on site. Your job is to extract necessary information. ` +
    "from the user. If user provide description of construciton works, you need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing (where work done, how many workers, how mony hours) - ask for clarificaiton, do not assume, but do not ask questions if not necessary" +
    `siteId : ${siteId}
    userId : ${userId}    
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
    
    If information provided by user is not a description of construciton works (administrative task, general information, general remark) - mark Works as Notes and save without 
    further questions. 
    `



    const prompt = prompt_28_10_2025 

 



   return prompt
}


      const systemPromptSaveToDatabase_02_09_2025 = "You will receive a log of construction activites on site. Analyze and map Location and Works" +
  "     according to the zod schema you are given \n" +
    "Any additional works mark as additional works. " +
  " Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part)." +
  "For comments describe what was completed, where and with what labor"


export const systemPromptSaveToDatabase = systemPromptSaveToDatabase_02_09_2025