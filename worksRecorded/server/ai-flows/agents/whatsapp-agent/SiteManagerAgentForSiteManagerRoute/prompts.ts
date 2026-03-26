import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getConfig } from "@/server/actions/site-diary-actions";
import { getUserFirstNameById } from "@/server/actions/whatsapp-actions"
import { getTodayDDMMYYYY } from "@/server/ai-flows/agents/shared-between-agents/getTodayDDMMYYY"







export async  function systemPromptFunction(siteId, userId){

  const userName = await getUserFirstNameById(userId);



  //---------------This we need so when we want simpliest option without any sorting-----------------

  const config = await getConfig(siteId)

  if (config?.AIpromptToUse?.Client === "NoSorting"){

      const NoSorting = `Store users comments without changes

   siteId : ${siteId}
    userId : ${userId}
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)

  `


    return NoSorting


  }





         const prompt_10_11_2025 = `You will have a conversation with the user called ${userName} (Call user by his name) about construction. ` +
    ` activities on site. Your job is to extract necessary information ` +
    "from the user's message. If user provide description of construciton works, you need to know :" +
    "1) What tasks was completed?" +
    "2) Where each task was competed?" +
    "3) How many workers were involved for each task?" +
    "4) For how long they were working on each task?" +
    "Summarize all information gathered and call the save_to_database tool" +
    `siteId : ${siteId}
    userId : ${userId}
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
    also pass original user comment to originalUserComment in the format "Name Surname : original comment"

    If information provided by user is not a description of construciton works (administrative task, general information, general remark) - mark Works as Notes


    `



         const prompt_19_03_206 = `You will have a conversation with the user called ${userName} (Call user by his name) about construction. ` +
    ` activities on site. Your job is to extract necessary information for users message `
    "Summarize all information you can gather and call the save_to_database tool" +
    `siteId : ${siteId}
    userId : ${userId}
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
    also pass original user comment to originalUserComment in the format "Name Surname : original comment"

    If information provided by user is not a description of construciton works (administrative task, general information, general remark) - mark Works as Notes


    `



         const prompt_20_03_206 = `You will receive message from ${userName} (Call user by his name) about construction ` +
    ` activities on site. If it is greeting, greet and adress him by his name. Your job extract all information you can gather from user message and save it calling the save_to_database tool  `
     +
    `siteId : ${siteId}
    userId : ${userId}
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
    Also pass the original worker message to the WorkerDiaryToDatabase tool

    If information provided by user is not a description of construciton works (administrative task, general information, general remark) - mark Works as Notes


    `

    const prompt =  prompt_20_03_206





   return prompt
}


  export async function systemPromptSaveToDatabaseFunction( userId, client){


 const language = await getOrganizationLanguageByUserId(userId)







  const systemPromptSaveToDatabase_02_01_2026 = ` You will receive a log of construction activites on site. Analyze and map Location and Works
  according to the zod schema you are given

  Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part).
  For comments describe what was completed, where and with what labor in ${language} `




const glossary =


`
# Glossary and Mapping Instructions

This document provides instructions to improve mapping accuracy.

Please follow the guidelines below:




- When multiple works are mentioned in the same text, create separate diary entries for each.
- If there is relevant information present, include it.
- Any actions with floor slabs including formworks and rebars good match will be Works to Pārseguma paneļu montāža – HCS 220, tajā skaitā šuvju betonēšana (Pamatu pārsegums).
- HCS stands for 'hollow core slabs' or 'floor slabs' or "Pārseguma paneļis" .
- CSW means 'concrete sandwich walls'.
- Choose the best fitting works enum
- Amounts - means amount of work completed. If not clear - leave blank
- Units  - units of works completed. For examplem m3, tn, pcs. leave blank if not clear.


When mapping, try to select the most suitable work category from the provided Zod schema. After each mapping action, briefly validate the outcome in 1–2 lines and proceed or self-correct if necessary.

## Examples

- **Example 1:**
  - Work: "Shoring props (Doka) were dismantled on the 2nd floor by 2 workers over 3 hours."
  - Mapping: Mark as 'Assembly Walls'.

- **Example 2:**
  - Text: "Kāpņu laukumu liešanas darbi, darbinieki: 1, laiks: 08:00–15:00 (7 h)"
  - Mapping: Mark as 'Stairs assembly'.

- **Example 3:**
  - Text: "Welding and painting rebars for balconies, darbinieki: 1, laiks: 08:00–15:00 (7 h)"
  - Mapping: Mark as 'Balcony'.



`;






  const NoSortingPromptSaveToDatabase_02_01_2026 = ` You will receive a log of construction activites on site. Save the message in comments.

  Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part).
  `


const NoSorting =


`
# Glossary and Mapping Instructions

This document provides instructions to improve mapping accuracy.

Please follow the guidelines below:





Store message as it is without changes. Do not extract locations, mark records as note. Do not split the message.


`;



const GMCIRL_systemPromptSaveToDatabase_02_01_2026 = ` You will receive a log of construction activites on site. Analyze and map according to the zod schema you are given

  Date format: Input dates are dd-mm-yyyy. Convert to ISO date string (yyyy-mm-dd), UTC (no time part).
  For comments describe what was completed, where and with what labor in ${language}, and then include original log in brackets (without change)`




const GMCIRL_glossary =


`
# Glossary and Mapping Instructions

This document provides instructions to improve mapping accuracy. Begin with a concise checklist (3–7 bullets) of the steps you will take before mapping, to ensure clarity and completeness.

Please follow the guidelines below:



- If there is relevant information present, include it.
- When multiple works are mentioned in the same text, create separate diary entries for each.
- Works Ctegory - if work is about some changes or something unexpected - mark it CE
- Amounts - means amount of work completed. If not clear - leave blank
- Units  - units of works completed. For examplem m3, tn, pcs. leave blank if not clear.


When mapping, try to select the most suitable work category from the provided Zod schema. After each mapping action, briefly validate the outcome in 1–2 lines and proceed or self-correct if necessary.









  }


`



let systemPromptSaveToDatabase = `${systemPromptSaveToDatabase_02_01_2026}\n ${glossary}`



if (client === "GMCIRL"){


  systemPromptSaveToDatabase = `${GMCIRL_systemPromptSaveToDatabase_02_01_2026}\n ${GMCIRL_glossary}`

}

if (client === "NoSorting"){


  systemPromptSaveToDatabase = `${NoSortingPromptSaveToDatabase_02_01_2026}\n ${NoSorting}`

}




 return systemPromptSaveToDatabase

}