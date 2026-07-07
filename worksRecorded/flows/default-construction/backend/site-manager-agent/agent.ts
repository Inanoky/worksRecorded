"use server"
import {Annotation, END, START, StateGraph, messagesStateReducer} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {AIMessage, BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction} from "@/flows/default-construction/backend/site-manager-agent/prompts"
import {extractAndSaveSiteDiary, toolNode, tools} from "@/flows/default-construction/backend/site-manager-agent/tools";
import { siteManagerAgentForSiteManagerRouteModelModel,  siteManagerAgentForSiteManagerRouteModelModelTemperature } from "@/server/ai-flows/ai-models-settings";
import { getUserFullNameById } from "@/server/actions/whatsapp-actions";
import {
    getSiteManagerSavedConfirmationRecords,
    runWithSiteManagerToolContext,
} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";
import {
    buildAiRunContext,
    getSiteManagerThreadId,
    summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";
import {
    buildControlledMemoryMessagesUpdate,
    getControlledMemoryMetadata,
    prepareControlledModelMessages,
} from "@/server/ai-flows/controlled-memory";
import {
    getSiteManagerAgentRunContext,
    getSiteManagerMetricsSnapshot,
    recordSiteManagerModelCall,
    recordSiteManagerTiming,
    runWithSiteManagerAgentEvalContext,
    setSiteManagerExecutionPath,
    type SiteManagerAgentRunDetails,
} from "./runContext";
import {
    detectReplyLanguage,
    formatDeterministicSaveReply,
    getFastPathMode,
    isSiteDiaryFastPathCandidate,
    isSaveOnlyToolRound,
    parseSaveToolOutcome,
} from "./fastPath";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

export { runWithSiteManagerAgentEvalContext };
export type { SiteManagerAgentRunDetails };

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

export default async function talkToWhatsappAgent(question, siteId, userId, originalAudioUrl?: string | null) {
    const totalStarted = Date.now();
    console.log("=== talkToWhatsappAgent (Site Manager) called ===", { hasAudio: !!originalAudioUrl });
    const runContext = getSiteManagerAgentRunContext();
    const requestedModel = runContext?.model ?? siteManagerAgentForSiteManagerRouteModelModel;
    const userFullName = (await getUserFullNameById(userId))?.trim();
    const normalizedQuestion = question.trim();
    const whatsappMessageId = getWhatsappSourceContext().messageId ?? null;
    const sourceComment = userFullName ? `${userFullName} : ${normalizedQuestion}` : normalizedQuestion;
    const fastPathMode = getFastPathMode();
    const fastPathCandidate = isSiteDiaryFastPathCandidate(normalizedQuestion);
    setSiteManagerExecutionPath("legacy-agent", fastPathMode);
    const aiContext = buildAiRunContext({
        flow: "whatsapp-site-manager",
        threadId: runContext?.threadId ?? getSiteManagerThreadId(siteId, userId),
        siteId,
        userId,
        channel: "whatsapp",
        model: requestedModel,
        metadata: {
            hasOriginalAudioUrl: Boolean(originalAudioUrl),
            questionPreview: summarizeForTrace(question),
            whatsappMessageId,
            ...(runContext?.traceMetadata ?? {}),
        },
        tags: runContext?.traceTags,
    });

    const state = Annotation.Root({
        messages: Annotation<BaseMessage[]>({
            reducer: messagesStateReducer,
            default: () => [],
        }),
    });

    if (fastPathMode === "shadow" && fastPathCandidate) {
        try {
            const shadowResult = await runWithSiteManagerToolContext(
                { userId, siteId, originalUserComment: sourceComment },
                () => extractAndSaveSiteDiary({
                    question: normalizedQuestion,
                    allowFallback: true,
                    persist: false,
                }),
            );
            recordSiteManagerTiming(
                shadowResult.action === "save" ? "shadowSaveDecisions" : "shadowFallbackDecisions",
                1,
            );
        } catch (error) {
            console.warn("site-manager fast-path shadow evaluation failed", error);
            recordSiteManagerTiming("shadowFallbackDecisions", 1);
        }
    }

    if (fastPathMode === "on" && fastPathCandidate) {
        let fastPathResult;
        try {
            fastPathResult = await runWithSiteManagerToolContext(
                { userId, siteId, originalUserComment: sourceComment },
                () => extractAndSaveSiteDiary({ question: normalizedQuestion, allowFallback: true }),
            );
        } catch (error) {
            console.warn("site-manager fast path failed before persistence; using legacy agent", error);
        }

        if (fastPathResult?.action === "save") {
            setSiteManagerExecutionPath("fast-path", fastPathMode);
            const content = formatDeterministicSaveReply(userFullName, fastPathResult.language, {
                ok: fastPathResult.ok,
                count: fastPathResult.count,
                message: fastPathResult.ok ? undefined : parseSaveToolOutcome(fastPathResult.content).message,
                records: fastPathResult.records,
            });
            recordSiteManagerTiming("totalMs", Date.now() - totalStarted);
            if (runContext) {
                const metrics = getSiteManagerMetricsSnapshot();
                const finalModel = metrics.modelCalls.at(-1);
                runContext.details = {
                    content,
                    requestedModel,
                    actualModel: finalModel?.actualModel ?? null,
                    tokenUsage: metrics.aggregateTokenUsage,
                    usageMetadata: null,
                    responseMetadata: null,
                    finishReason: "fast-path",
                    ...metrics,
                };
            }
            return content;
        }
    }

    const shouldContinue = (state) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        console.log("shouldContinue - lastMessage:", lastMessage);

        if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
            console.log("shouldContinue: Detected tool_calls, going to 'tools'");
            return "tools";
        }
        console.log("shouldContinue: No tool_calls, going to END");
        return END;
    };

    const agent = async (state) => {
        const { messages } = state;
        const controlled = prepareControlledModelMessages(messages);
        const safeMessages = controlled.messages;
        if (
            controlled.stats.compactedCount > 0 ||
            controlled.stats.preparedCount !== controlled.stats.originalCount
        ) {
            console.warn("site-manager agent - controlled checkpoint history before model call", {
                ...controlled.stats,
            });
        }

        const llm = new ChatOpenAI({
            temperature: siteManagerAgentForSiteManagerRouteModelModelTemperature,
            model: requestedModel,
            reasoning: { effort: "low" },
        }).bindTools(tools);

        try {
            const modelStarted = Date.now();
            const response = await llm.invoke(safeMessages, {
                ...aiContext.runnableConfig,
                runName: "WhatsAppSiteManagerModel",
                metadata: {
                    ...aiContext.runnableConfig.metadata,
                    ...getControlledMemoryMetadata(controlled.stats),
                },
            });
            const durationMs = Date.now() - modelStarted;
            const usage = (response as any).usage_metadata ?? (response as any).response_metadata?.tokenUsage ?? {};
            const inputTokens = Number(usage.input_tokens ?? usage.promptTokens ?? 0);
            const outputTokens = Number(usage.output_tokens ?? usage.completionTokens ?? 0);
            recordSiteManagerModelCall({
                purpose: safeMessages.some((message: any) =>
                    (message?.getType?.() ?? message?._getType?.()) === "tool")
                    ? "final-response"
                    : "routing",
                model: requestedModel,
                actualModel: (response as any).response_metadata?.model_name ?? null,
                durationMs,
                inputTokens,
                outputTokens,
                totalTokens: Number(usage.total_tokens ?? usage.totalTokens ?? inputTokens + outputTokens),
            });

            return {
                messages: buildControlledMemoryMessagesUpdate(safeMessages, response)
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

    const afterTools = (state) => {
        const messages = state.messages ?? [];
        const toolRequest = [...messages].reverse().find((message: any) =>
            Array.isArray(message?.tool_calls) && message.tool_calls.length > 0);
        const toolNames = toolRequest?.tool_calls?.map((call: any) => call.name) ?? [];
        return isSaveOnlyToolRound(toolNames)
            ? "save_confirmation"
            : "agent";
    };

    const saveConfirmation = async (state) => {
        const toolMessage = [...(state.messages ?? [])].reverse().find((message: any) =>
            message?.name === "save_to_database" || message?.additional_kwargs?.name === "save_to_database");
        const toolContent = typeof toolMessage?.content === "string" ? toolMessage.content : "";
        return {
            messages: [new AIMessage({
                content: formatDeterministicSaveReply(
                    userFullName,
                    detectReplyLanguage(normalizedQuestion),
                    {
                        ...parseSaveToolOutcome(toolContent),
                        records: getSiteManagerSavedConfirmationRecords(),
                    },
                ),
            })],
        };
    };

    const workflow = new StateGraph(state)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addNode("save_confirmation", saveConfirmation)
        .addEdge(START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", END])
        .addConditionalEdges("tools", afterTools, ["save_confirmation", "agent"])
        .addEdge("save_confirmation", END)

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required for site manager WhatsApp agent checkpointing");
    }

    const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);

    await setupCheckpointerOnce(checkpointer);
    const config = {
      configurable: { thread_id: aiContext.threadId },
      ...aiContext.runnableConfig,
    };

    const graph = workflow.compile({ checkpointer });

    const systemPrompt = systemPromptFunction(siteId, userId)

    const inputs = {
        messages: [
            new SystemMessage(await systemPrompt),
            new HumanMessage(question),
        ],
    };

    let finalState;

    await runWithSiteManagerToolContext(
        { userId, siteId, originalUserComment: sourceComment },
        async () => {
            for await (const output of await graph.stream(inputs, config)) {
                for (const value of Object.values(output)) {
                    if (value?.messages?.length) {
                        finalState = value;
                    }
                }
            }
        },
    );

    if (finalState && finalState.messages && finalState.messages.length > 0) {
        const lastContentMsg = finalState.messages.findLast((msg: BaseMessage) => typeof msg.content === "string" && msg.content.length > 0);
        const content = lastContentMsg ? String(lastContentMsg.content) : "Completed action with no response.";
        const responseMetadata = (lastContentMsg as any)?.response_metadata ?? null;
        const usageMetadata = (lastContentMsg as any)?.usage_metadata ?? null;

        if (runContext) {
            recordSiteManagerTiming("totalMs", Date.now() - totalStarted);
            const metrics = getSiteManagerMetricsSnapshot();
            runContext.details = {
                content,
                requestedModel,
                actualModel: responseMetadata?.model_name ?? metrics.modelCalls.at(-1)?.actualModel ?? null,
                tokenUsage: metrics.aggregateTokenUsage,
                usageMetadata,
                responseMetadata,
                finishReason: responseMetadata?.finish_reason ?? (metrics.toolCalls.some((call) => call.name === "save_to_database") ? "deterministic-save" : null),
                ...metrics,
            };
        }

        return content;
    } else {
        if (runContext) {
            recordSiteManagerTiming("totalMs", Date.now() - totalStarted);
            const metrics = getSiteManagerMetricsSnapshot();
            runContext.details = {
                content: "",
                requestedModel,
                actualModel: null,
                tokenUsage: null,
                usageMetadata: null,
                responseMetadata: null,
                finishReason: null,
                ...metrics,
            };
        }
        return null;
    }
}
