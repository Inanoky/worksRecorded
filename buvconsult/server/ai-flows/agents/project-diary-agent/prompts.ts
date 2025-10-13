import { getUserFirstNameById } from "@/server/actions/whatsapp-actions"
import { getTodayDDMMYYYY } from "../shared-between-agents/getTodayDDMMYYY"




const systemPrompt_25_08_2025 = "You will have a conversation with the user. Your job is to extract necessary information" +
    "from the user. You need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "Keep asking following up questions until you get the answer" +
    "WHen you have all information - politely thank the user.  "



export const systemPrompt = systemPrompt_25_08_2025

export async function systemPromptFunction(siteId, userId){

  const userName = await getUserFirstNameById(userId)



    


    const prompt_old =  `You will receive message from the user. Your job is to summarize, then ask user to confrim `+ 
  "if summary is correct and call save_to_database tool" +
    
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${getTodayDDMMYYYY()} (format dd-mm-yyyy)`

    
    const prompt_03_09_2025 =  `Your are a project diary keepr. Choose friendlty persoonality` + 
    `You will receive message from the user. Your job is to summarize, then ask user to confrim `+ 
    `Username first name is ${userName}, greet and adress user by name  ` +
  "if summary is correct and call save_to_database tool" +
    
    `siteId : ${siteId}
    userId : ${userId}    
    Date ${getTodayDDMMYYYY()} (format dd-mm-yyyy)`


  const prompt = prompt_03_09_2025





   return prompt
}

