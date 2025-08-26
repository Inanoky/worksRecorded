import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { clockInWorker, clockOutWorker } from "@/app/actions/clockinActions";
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from "@langchain/core/messages"; // Adjust if needed
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/components/AI/RAG/LanggraphAgentVersion/state";




export const clockInWorkerTool = new DynamicStructuredTool({
  name: "ClockInWorker",
  description: "Clock a worker in (start workday)",
  schema: z.object({
    workerId: z.string().describe("The unique worker ID"),
     siteId: z.string().describe("Site Id "),
    
  }),
  async func({ workerId, siteId}) {

    const now = new Date()

    // Server action expects Date objects, not strings
    const result = await clockInWorker({
      workerId,
      date: now,
      clockIn: now,
      siteId
    });
    if (result.success) {
      return { messages: ["Clocked in successfully"] };
    } else {
      return { messages: [`Failed to clock in: ${result.error}`] };
    }
  }
});

export const clockOutWorkerTool = new DynamicStructuredTool({
  name: "ClockOutWorker",
  description: "Clock a worker out (end workday)",
  schema: z.object({
    workerId: z.string().describe("The unique worker ID"),
    location: z.string().describe("Work location "),
    works: z.string().describe("Description of work performed"),
   
  }),
  async func({ workerId, location, works}) {

        const now = new Date()
    const result = await clockOutWorker({
      
      workerId,
      clockOut: now,
      location,
      works,
     

    });
    if (result.success) {
      return { messages: ["Clocked out successfully"] };
    } else {
      return { messages: [`Failed to clock out: ${result.error}`] };
    }
  }
});

export const tools = [clockInWorkerTool, clockOutWorkerTool];
export const toolNode = new ToolNode<typeof GraphState.State>(tools);