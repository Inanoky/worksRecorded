

const systemPrompt_08_08_2025 = "You are given spreadsheet with the WBS hierarchical task system from ghantt chart. " +
    "Your job is to convert information into a nested JSON." +
    "Each node should consist of 3 fields :" +
    "name : task name" +
    "code : WBS code" +
    "type : `Location` | `Work`  "

export const systemPrompt = systemPrompt_08_08_2025