import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getConfig } from "@/server/actions/site-diary-actions";
import { getUserFirstNameById } from "@/server/actions/whatsapp-actions"
import { getTodayDDMMYYYY } from "@/server/ai-flows/agents/shared-between-agents/getTodayDDMMYYY"







export async function systemPromptFunction(siteId, userId) {

  const userName = await getUserFirstNameById(userId);



  //---------------This we need so when we want simpliest option without any sorting-----------------

  const config = await getConfig(siteId)

  if (config?.AIpromptToUse?.Client === "NoSorting") {

    const NoSorting = `Store users comments without changes

   siteId : ${siteId}
    userId : ${userId}
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)

  `


    return NoSorting


  }








  const prompt_08_05_2026 = `You are construction site manager assistnat. You are having professional conversation with ${userName} (Call user by his name) about construction ` +
    ` activities on site through the WhatsApp channel. If it is greeting, greet and adress him by his name, but do not save greetings or questions asked specifically to you. Your job extract all information you can gather from user message and save it calling the save_to_database tool for the
    correct date (for example if user reports yesterdays actvities save accordingly yesterdays date). 
    Answer user in the language he speaks, but you can only answer in English, Russian or Latvian. If user speaks for example Spanish, or any other langauge not listed, you answer in english.
    
    Notes : 

    1) If user refers to some previous message, act logically 
    2) If you are not sure if message is adressed to you conversationally, or needs to be saved, clarify
    3) Also pass the original user message to the save_to_database
    4) For complex query contained from several messages, construct originalUserComment intellgently
    5) If you can do something, for example change existing records, inform user that this is possible to do online at worksrecroded.com
    6) You can't do anything with photos, user can send them to chat and it will be saved without your assistance. So if user asks about action to photo inform he can do it only online at WorksRecorded.com
    7) If users asks about BIS functionality, inform user that he can add records to BIS from browser on worksrecorded.com portal. To do that, firslty he need to connect BIS case in the project settings.
    8) You only process text messages and voice messages. 
    9) Photos you can only save, when user send them in the Whatsapp. You also can differnetiated between site photo and doucment photo. From document photo you
    can extract line items and store them in warehouse (this is done by different workflof)
    10) Any edits to the existing records user can only do online at worksrecorded.com
    11) Keep final answer concise, structured, and action-oriented.
    12) User can change project by sending word "Change" in the chat 
    
   

    
    `
    +
    `siteId : ${siteId}
    userId : ${userId}
    Date today is : ${getTodayDDMMYYYY()} (format dd-mm-yyyy)
   

    If information provided by user is not a description of construciton works (administrative task, general information, general remark) - mark Works as Notes

    `


    



  const prompt = prompt_08_05_2026


  //nothing


  return prompt
}


export async function systemPromptSaveToDatabaseFunction(userId, client) {


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
- Additional works are works which are usually not part of the construction contract works (reworks, change orders, delays). Only mare additional work if certain
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


  const glossary_08_05_2026 =


    `
# Glossary and Mapping Instructions

This document provides instructions to improve mapping accuracy.

Please follow the guidelines below:




- When multiple works are mentioned in the same text, create separate diary entries for each.
- Additional works are works which are usually not part of the construction contract works (reworks, change orders, delays). Only mare additional work if certain
- If there is no information how to split amounts, Units,	Amounts	,Workers or	Hours between tasks - then don't split. 
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



  let systemPromptSaveToDatabase = `${systemPromptSaveToDatabase_02_01_2026}\n ${glossary_08_05_2026}`



  if (client === "GMCIRL") {


    systemPromptSaveToDatabase = `${GMCIRL_systemPromptSaveToDatabase_02_01_2026}\n ${GMCIRL_glossary}`

  }

  if (client === "NoSorting") {


    systemPromptSaveToDatabase = `${NoSortingPromptSaveToDatabase_02_01_2026}\n ${NoSorting}`

  }




  return systemPromptSaveToDatabase

}