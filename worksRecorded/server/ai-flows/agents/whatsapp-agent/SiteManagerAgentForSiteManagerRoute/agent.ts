"use server"
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {AIMessage, BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/prompts"
import {toolNode, tools} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/tools";
import { siteManagerAgentForSiteManagerRouteModelModel,  siteManagerAgentForSiteManagerRouteModelModelTemperature } from "@/server/ai-flows/ai-models-settings";
import { getUserFullNameById } from "@/server/actions/whatsapp-actions";
import { sanitizeCheckpointHistory } from "@/server/ai-flows/agents/whatsapp-agent/messageHistory";
import { injectSiteManagerToolCallContext } from "@/server/ai-flows/agents/whatsapp-agent/toolCallContext";

type PostgresCheckpointer = ReturnType<typeof PostgresSaver.fromConnString>;

let checkpointerSetupPromise: Promise<void> | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function isInvalidToolResultsError(error: unknown): boolean {
    const maybeError = asRecord(error);
    if (maybeError?.lc_error_code === "INVALID_TOOL_RESULTS") return true;
    const message = typeof maybeError?.message === "string" ? maybeError.message : "";
    return message.includes("INVALID_TOOL_RESULTS") || message.includes("tool_call_id");
}

function isCheckpointMigrationRace(error: unknown): boolean {
    const maybeError = asRecord(error);
    const message = typeof maybeError?.message === "string" ? maybeError.message : "";
    return (
        maybeError?.code === "23505" &&
        (maybeError?.constraint === "checkpoint_migrations_pkey" ||
            message.includes("checkpoint_migrations_pkey"))
    );
}

async function setupCheckpointerOnce(checkpointer: PostgresCheckpointer) {
    if (!checkpointerSetupPromise) {
        checkpointerSetupPromise = checkpointer.setup().catch((error: unknown) => {
            if (isCheckpointMigrationRace(error)) {
                console.warn("LangGraph checkpoint setup migration already exists; continuing.", error);
                return;
            }

            checkpointerSetupPromise = null;
            throw error;
        });
    }

    await checkpointerSetupPromise;
}





export default async function talkToWhatsappAgent(question, siteId, userId) {
    console.log("=== talkToWhatsappAgent called ===");
    const userFullName = (await getUserFullNameById(userId))?.trim();
    const normalizedQuestion = question.trim();
    const sourceComment = userFullName ? `${userFullName} : ${normalizedQuestion}` : normalizedQuestion;



//introdued originalQuestion in graph state.
  const state = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

});

    const shouldContinue = (state) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        console.log("shouldContinue - lastMessage:", lastMessage);

        if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
            for (const toolCall of lastMessage.tool_calls) {
                try {
                    injectSiteManagerToolCallContext(toolCall, {
                        sourceComment,
                        userId,
                        siteId,
                    });
                } catch (e) {
                    console.error("Error modifying arguments for save_to_database:", e);
                }
            }

            console.log("shouldContinue: Detected tool_calls, going to 'tools'");
            return "tools";
        }
        console.log("shouldContinue: No tool_calls, going to END");
        return END;
    };

    const agent = async (state) => {
        const { messages } = state;
        const sanitized = sanitizeCheckpointHistory(messages);
        const safeMessages = sanitized.messages;
        if (safeMessages.length !== messages.length) {
            console.warn("site-manager agent - sanitized checkpoint history before model call", {
                before: messages.length,
                after: safeMessages.length,
                ...sanitized.stats,
            });
        }

        const llm = new ChatOpenAI({
            
            temperature: siteManagerAgentForSiteManagerRouteModelModelTemperature,
            model: siteManagerAgentForSiteManagerRouteModelModel,
            reasoning: { effort: "low" },
        }).bindTools(tools);

        try {
            const response = await llm.invoke(safeMessages);

            return {
                messages: [response]
            };
        } catch (error) {
            console.error("site-manager agent - model invocation failed", error);
            if (isInvalidToolResultsError(error)) {
                return {
                    messages: [new AIMessage({ content: "WorkRecorded: Sorry, there was a temporary issue while processing your message. Please send it once more." })],
                };
            }
            throw error;
        }
    };

    const workflow = new StateGraph(state)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addEdge(START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", END])
        .addEdge("tools", "agent") // <--- loop back to agent!

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required for site manager WhatsApp agent checkpointing");
    }

    const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);

    await setupCheckpointerOnce(checkpointer);
    const config = {
      configurable: { thread_id: `siteManager:${siteId}:${userId}` },
    };



    const graph = workflow.compile({ checkpointer });

    const systemPrompt = systemPromptFunction(siteId,userId)

    const inputs = {
        messages: [
            new SystemMessage(await systemPrompt),
            new HumanMessage(question),
        ],

    };



    let finalState;

    for await (const output of await graph.stream(inputs, config)) {

        for (const value of Object.values(output)) {
            if (value?.messages?.length) {
                finalState = value;
            }
        }
    }

    if (finalState && finalState.messages && finalState.messages.length > 0) {

        const lastContentMsg = finalState.messages.findLast((msg: BaseMessage) => typeof msg.content === "string" && msg.content.length > 0);
        return lastContentMsg ? lastContentMsg.content : "Completed action with no response.";
    } else {

        return null;
    }
}
