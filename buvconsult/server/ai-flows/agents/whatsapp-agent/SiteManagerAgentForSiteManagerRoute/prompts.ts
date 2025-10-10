import { getUserFirstNameById } from "@/server/actions/whatsapp-actions"





const systemPrompt_05_08_2025 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "Keep asking following up questions until you get the answer" +
    "WHen you have all information - politely thank the user.  "


const systemPrompt_05_08_2025_V2 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "Keep asking following up questions until you get the answer" +
    "WHen you have all information - politely thank the user, summarize all information gathered and call the save_to_database tool " +
    "siteId : 48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315"

const systemPrompt_08_08_2025_V1 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "Keep asking following up questions until you get the answer" +
    "WHen you have all information - politely thank the user, summarize all information gathered and call the save_to_database tool "

    const systemPrompt_02_09_2025 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing - ask for clarificaiton, but do not ask questions if not necessary"

    





export const systemPrompt = systemPrompt_05_08_2025_V2

export async  function systemPromptFunction(siteId, userId){

  const userName = await getUserFirstNameById(userId);


      function getTodayDDMMYYYY() {
              const d = new Date();
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}-${month}-${year}`;
            }

    const today = getTodayDDMMYYYY()



      const prompt_old = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "Keep asking following up questions until you get the answer" +
    "WHen you have all information - politely thank the user, summarize all information gathered and call the save_to_database to " +
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${today} (format dd-mm-yyyy)`



  const prompt_02_09_2025 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing - ask for clarificaiton, but do not ask questions if not necessary" +
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${today} (format dd-mm-yyyy)`


      const prompt_02_09_2025_v2 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing (where work done, how many workers, how mony hours) - ask for clarificaiton, do not assume, but do not ask questions if not necessary" +
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${today} (format dd-mm-yyyy)`


    const prompt_02_09_2025_v3 = "You will have a conversation with the user about construction activities on site. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "First of all check if user message already has necessary information. If there is -  politely thank the user, summarize all information gathered and call the save_to_database tool" +
    "If some information is clearly missing (where work done, how many workers, how mony hours) - ask for clarificaiton, do not assume, but do not ask questions if not necessary" +
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${today} (format dd-mm-yyyy)`

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
    Date ${today} (format dd-mm-yyyy)`

    const prompt = prompt_02_09_2025_v4


  console.log(today)



   return prompt
}



 const systemPromptSaveToDatabase_05_08_2025 = "You will receive a log of construction activites on site. Map it according to the zod schema you are given"

  const systemPromptSaveToDatabase_10_08_2025 = "You will receive a log of construction activites on site. Map it according to the zod schema you are given \n"  +
  " Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part)."

    const systemPromptSaveToDatabase_20_08_2025 = "You will receive a log of construction activites on site. Analyze and map Location and Works" +
  "     according to the zod schema you are given \n" +
    "Any additional works mark as additional works. " +
  " Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part)."


      const systemPromptSaveToDatabase_02_09_2025 = "You will receive a log of construction activites on site. Analyze and map Location and Works" +
  "     according to the zod schema you are given \n" +
    "Any additional works mark as additional works. " +
  " Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part)." +
  "For comments describe what was completed, where and with what labor"


export const systemPromptSaveToDatabase = systemPromptSaveToDatabase_02_09_2025