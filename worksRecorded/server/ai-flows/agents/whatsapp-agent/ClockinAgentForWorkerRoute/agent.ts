"use server"
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {AIMessage, BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/prompts";
import { CLOCK_IN_CARD_SENT_TOKEN, toolNode, tools } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/tools"
import { getSiteIdByWorkerId, isWorkerClockedIn} from "@/server/actions/timesheets-actions";
import { clickInAgentForWorkersModel, clockInAgentForWorkersModelTemperature } from "@/server/ai-flows/ai-models-settings";
import { getWorkerFullNameById } from "@/server/actions/whatsapp-actions";
import { sanitizeCheckpointHistory } from "@/server/ai-flows/agents/whatsapp-agent/messageHistory";
import { injectWorkerToolCallContext } from "@/server/ai-flows/agents/whatsapp-agent/toolCallContext";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

function isInvalidToolResultsError(error: unknown): boolean {
    const maybeError = error as any;
    if (maybeError?.lc_error_code === "INVALID_TOOL_RESULTS") return true;
    const message = typeof maybeError?.message === "string" ? maybeError.message : "";
    return message.includes("INVALID_TOOL_RESULTS") || message.includes("tool_call_id");
}

export default async function talkToClockInAgent(question, workerId, originalAudioUrl?: string | null, originalAudioRecordId?: string | null) {
    console.log("=== talkToWhatsappAgent (Worker) called ===", { hasAudio: !!originalAudioUrl, hasRecordId: !!originalAudioRecordId });

    const siteId = await getSiteIdByWorkerId(workerId)
    console.log(siteId)

    const status = (await isWorkerClockedIn(workerId)).isClockedIn ? "clocked In" : "clocked Out";
    const workerFullName = (await getWorkerFullNameById(workerId))?.trim();
    const normalizedQuestion = question.trim();
    const sourceComment = workerFullName ? `${workerFullName} : ${normalizedQuestion}` : normalizedQuestion;

    console.log(`Worker is currently ${status}`)

    // NEW: Get current date/time once for the diary tool
    const nowISO = new Date().toISOString();

    console.log("Question:", question, "WorkerId", workerId, "SiteId" , siteId);

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

        // Safely access tool_calls array (using 'as any' to avoid importing ToolCall type)
        const toolCalls = (lastMessage as any)?.tool_calls;

        if (lastMessage && toolCalls && Array.isArray(toolCalls) && toolCalls.length) {

            // CRITICAL FIX: Inject context data into tool call arguments
            for (const toolCall of toolCalls) {
                try {
                    const injected = injectWorkerToolCallContext(toolCall, {
                        workerId,
                        siteId,
                        nowISO,
                        sourceComment,
                        originalAudioUrl: originalAudioUrl ?? getWhatsappSourceContext().originalAudioUrl ?? null,
                        originalAudioRecordId: originalAudioRecordId ?? getWhatsappSourceContext().originalAudioRecordId ?? null,
                    });

                    if (injected) {
                        const toolName = toolCall.name ?? toolCall.function?.name;
                        console.log(`Injected context into arguments for tool: ${toolName}`);
                    }
                } catch (e) {
                    const toolName = toolCall.name ?? toolCall.function?.name ?? "unknown";
                    console.error(`Error modifying arguments for ${toolName}:`, e);
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
        const sanitized = sanitizeCheckpointHistory(messages as any[]);
        const safeMessages = sanitized.messages;
        if (safeMessages.length !== messages.length) {
            console.warn("agent node - sanitized checkpoint history before model call", {
                before: messages.length,
                after: safeMessages.length,
                ...sanitized.stats,
            });
        }
        console.log("agent node - messages to model:", safeMessages);

        const llm = new ChatOpenAI({
            temperature: clockInAgentForWorkersModelTemperature,
            model: clickInAgentForWorkersModel,
        }).bindTools(tools);

        try {
            const response = await llm.invoke(safeMessages);

            console.log("agent node - LLM response:", response);

            return {
                messages: [response]
            };
        } catch (error) {
            console.error("agent node - model invocation failed", error);
            if (isInvalidToolResultsError(error)) {
                return {
                    messages: [new AIMessage({ content: "WorkRecorded: Sorry, there was a temporary issue while saving your update. Please send it once more." })],
                };
            }
            throw error;
        }
    };

    const shouldContinueAfterTools = (state) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1] as any;

        const hasClockInCardSignal =
            (typeof lastMessage?.content === "string" &&
                lastMessage.content.includes(CLOCK_IN_CARD_SENT_TOKEN)) ||
            (Array.isArray(lastMessage?.content) &&
                lastMessage.content.some((entry: any) =>
                    typeof entry?.text === "string" &&
                    entry.text.includes(CLOCK_IN_CARD_SENT_TOKEN)
                ));

        if (hasClockInCardSignal) {
            console.log("Clock-in card signal detected in tool output. Ending graph run without extra LLM reply.");
            return END;
        }

        return "agent";
    };

    const workflow = new StateGraph(state)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addEdge(START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", END])
        .addConditionalEdges("tools", shouldContinueAfterTools, ["agent", END])

    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL
    );

    await checkpointer.setup();
    const config = { configurable: { thread_id: workerId} };


    const graph = workflow.compile({ checkpointer });

    const systemPrompt = systemPromptFunction(siteId, workerId, status)

    const inputs = {
        messages: [
            new SystemMessage(await systemPrompt),
            new HumanMessage(question),
        ],
    };

    console.log("Graph initial inputs:", JSON.stringify(inputs, null, 2));

    let finalState;
    let lastMsg;

    for await (const output of await graph.stream(inputs, config)) {
        console.log("Step/Run full output:", JSON.stringify(output, null, 2));
        for (const [key, value] of Object.entries(output)) {
            lastMsg = value.messages[value.messages.length - 1];
            finalState = value;
            console.log(`Current node: ${key}`);
            console.log("Last message at node:", lastMsg);
        }
    }

    if (finalState && finalState.messages && finalState.messages.length > 0) {
        const hasClockInCardSignal = finalState.messages.some((msg: any) => {
            if (typeof msg?.content === "string") {
                return msg.content.includes(CLOCK_IN_CARD_SENT_TOKEN);
            }
            if (Array.isArray(msg?.content)) {
                return msg.content.some((entry: any) =>
                    typeof entry?.text === "string" &&
                    entry.text.includes(CLOCK_IN_CARD_SENT_TOKEN)
                );
            }
            return false;
        });

        if (hasClockInCardSignal) {
            return "";
        }

        // Find the last actual message content (usually after tool execution)
        const lastContentMsg = finalState.messages.findLast(
            (msg: BaseMessage) => typeof msg.content === 'string' && msg.content.length > 0
        );

        const content = lastContentMsg ? lastContentMsg.content : "Completed action with no response.";
        console.log("AI content:", content);
        return content;
    } else {
        console.log("No final AI message content produced.");
        return "Sorry, I ran into an error processing your request.";
    }
}
