"use server"
import {Annotation, END, START, StateGraph, messagesStateReducer} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {AIMessage, BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/prompts";
import { CLOCK_IN_CARD_SENT_TOKEN, toolNode, tools } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/tools"
import { getSiteIdByWorkerId, isWorkerClockedIn} from "@/server/actions/timesheets-actions";
import { clickInAgentForWorkersModel, clockInAgentForWorkersModelTemperature } from "@/server/ai-flows/ai-models-settings";
import { getWorkerFullNameById } from "@/server/actions/whatsapp-actions";
import { injectWorkerToolCallContext } from "@/server/ai-flows/agents/whatsapp-agent/toolCallContext";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
    buildAiRunContext,
    getWorkerThreadId,
    summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";
import {
    buildControlledMemoryMessagesUpdate,
    getControlledMemoryMetadata,
    prepareControlledModelMessages,
} from "@/server/ai-flows/controlled-memory";
import {
    buildWorkerSenderTraceContext,
    getWorkerAgentRunContext,
    getWorkerSenderTraceMetadata,
    getWorkerSenderTraceTags,
    runWithWorkerAgentEvalContext,
    setWorkerSenderTraceContext,
    type WorkerAgentRunDetails,
} from "./runContext";

export { runWithWorkerAgentEvalContext };
export type { WorkerAgentRunDetails };

function isInvalidToolResultsError(error: unknown): boolean {
    const maybeError = error as any;
    if (maybeError?.lc_error_code === "INVALID_TOOL_RESULTS") return true;
    const message = typeof maybeError?.message === "string" ? maybeError.message : "";
    return message.includes("INVALID_TOOL_RESULTS") || message.includes("tool_call_id");
}

function buildWorkerAgentRunDetails(args: {
    content: string;
    requestedModel: string;
    message?: BaseMessage | null;
}): WorkerAgentRunDetails {
    const responseMetadata = (args.message as any)?.response_metadata ?? null;
    const usageMetadata = (args.message as any)?.usage_metadata ?? null;

    return {
        content: args.content,
        requestedModel: args.requestedModel,
        actualModel: responseMetadata?.model_name ?? null,
        tokenUsage: usageMetadata ?? responseMetadata?.tokenUsage ?? null,
        usageMetadata,
        responseMetadata,
        finishReason: responseMetadata?.finish_reason ?? null,
    };
}

export default async function talkToClockInAgent(question, workerId, originalAudioUrl?: string | null) {
    console.log("=== talkToWhatsappAgent (Worker) called ===", { hasAudio: !!originalAudioUrl });
    const runContext = getWorkerAgentRunContext();
    const requestedModel = runContext?.model ?? clickInAgentForWorkersModel;

    const siteId = await getSiteIdByWorkerId(workerId)
    console.log(siteId)

    const status = (await isWorkerClockedIn(workerId)).isClockedIn ? "clocked In" : "clocked Out";
    const workerFullName = (await getWorkerFullNameById(workerId))?.trim();
    const senderTraceContext = buildWorkerSenderTraceContext({
        fullName: workerFullName,
    });
    if (runContext) {
        setWorkerSenderTraceContext(senderTraceContext);
    }
    const senderTraceMetadata = getWorkerSenderTraceMetadata({
        ...runContext,
        ...senderTraceContext,
    });
    const senderTraceTags = getWorkerSenderTraceTags({
        ...runContext,
        ...senderTraceContext,
    });
    const runName = senderTraceContext.senderLabel
        ? `WhatsAppWorkerAgent - ${senderTraceContext.senderLabel}`
        : undefined;
    const normalizedQuestion = question.trim();
    const sourceComment = workerFullName ? `${workerFullName} : ${normalizedQuestion}` : normalizedQuestion;
    let lastAiResponse: BaseMessage | null = null;
    const aiContext = buildAiRunContext({
        flow: "whatsapp-worker",
        runName,
        threadId: runContext?.threadId ?? getWorkerThreadId(workerId),
        siteId,
        workerId,
        channel: "whatsapp",
        model: requestedModel,
        metadata: {
            workerStatus: status,
            hasOriginalAudioUrl: Boolean(originalAudioUrl),
            questionPreview: summarizeForTrace(question),
            ...senderTraceMetadata,
            ...(runContext?.traceMetadata ?? {}),
        },
        tags: [...senderTraceTags, ...(runContext?.traceTags ?? [])],
    });

    console.log(`Worker is currently ${status}`)

    // NEW: Get current date/time once for the diary tool
    const nowISO = new Date().toISOString();

    console.log("Question:", question, "WorkerId", workerId, "SiteId" , siteId);

    const state = Annotation.Root({
        messages: Annotation<BaseMessage[]>({
            reducer: messagesStateReducer,
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
        const controlled = prepareControlledModelMessages(messages as any[], {
            profile: "whatsapp-legacy",
        });
        const safeMessages = controlled.messages;
        if (
            controlled.stats.compactedCount > 0 ||
            controlled.stats.preparedCount !== controlled.stats.originalCount
        ) {
            console.warn("agent node - controlled checkpoint history before model call", {
                ...controlled.stats,
            });
        }
        console.log("agent node - messages to model:", safeMessages);

        const llm = new ChatOpenAI({
            temperature: clockInAgentForWorkersModelTemperature,
            model: requestedModel,
        }).bindTools(tools);

        try {
            const response = await llm.invoke(safeMessages, {
                ...aiContext.runnableConfig,
                runName: "WhatsAppWorkerModel",
                metadata: {
                    ...aiContext.runnableConfig.metadata,
                    ...getControlledMemoryMetadata(controlled.stats),
                },
            });
            lastAiResponse = response;

            console.log("agent node - LLM response:", response);

            return {
                messages: buildControlledMemoryMessagesUpdate(safeMessages, response)
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

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required for worker WhatsApp agent checkpointing");
    }

    const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);

    await checkpointer.setup();
    const config = {
        configurable: { thread_id: aiContext.threadId },
        ...aiContext.runnableConfig,
    };


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
            if (!value?.messages?.length) continue;
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
            if (runContext) {
                runContext.details = buildWorkerAgentRunDetails({
                    content: "",
                    requestedModel,
                    message: lastAiResponse,
                });
            }
            return "";
        }

        // Find the last actual message content (usually after tool execution)
        const lastContentMsg = finalState.messages.findLast(
            (msg: BaseMessage) => typeof msg.content === 'string' && msg.content.length > 0
        );

        const content = lastContentMsg ? lastContentMsg.content : "Completed action with no response.";

        if (runContext) {
            runContext.details = buildWorkerAgentRunDetails({
                content: String(content),
                requestedModel,
                message: lastContentMsg ?? lastAiResponse,
            });
        }

        console.log("AI content:", content);
        return content;
    } else {
        console.log("No final AI message content produced.");
        if (runContext) {
            runContext.details = {
                content: "",
                requestedModel,
                actualModel: null,
                tokenUsage: null,
                usageMetadata: null,
                responseMetadata: null,
                finishReason: null,
            };
        }
        return "Sorry, I ran into an error processing your request.";
    }
}
