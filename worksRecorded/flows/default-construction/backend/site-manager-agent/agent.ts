"use server"
import {Annotation, END, START, StateGraph, messagesStateReducer} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {AIMessage, BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction} from "@/flows/default-construction/backend/site-manager-agent/prompts"
import {
    extractAndSaveSiteDiary,
    replaceLastSiteDiaryBatchOperation,
    startSiteDiaryCorrectionOperation,
    toolNode,
    tools,
} from "@/flows/default-construction/backend/site-manager-agent/tools";
import { siteManagerAgentForSiteManagerRouteModelModel,  siteManagerAgentForSiteManagerRouteModelModelTemperature } from "@/server/ai-flows/ai-models-settings";
import { getUserFullNameById } from "@/server/actions/whatsapp-actions";
import { getPendingSiteDiaryCorrection } from "@/server/actions/site-diary-actions";
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
    fastPathTraceConfig,
    type FastPathFallbackReason,
    type FastPathOutcome,
    type SiteManagerAgentRunDetails,
} from "./runContext";
import {
    detectReplyLanguage,
    formatDeterministicSaveReply,
    formatDeterministicCorrectionReply,
    getFastPathMode,
    isCorrectionOnlyToolRound,
    isSiteDiaryFastPathCandidate,
    isSaveOnlyToolRound,
    parseCorrectionToolResult,
    parseSaveToolOutcome,
} from "./fastPath";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { getUserAddressName, shouldSampleUserAddress } from "./nameAddressing";

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
    const replyToMessageId = getWhatsappSourceContext().replyToMessageId ?? null;
    const pendingCorrection = await getPendingSiteDiaryCorrection({ siteId, userId });
    const intentContext = {
        hasReplyContext: Boolean(replyToMessageId),
        hasPendingCorrection: pendingCorrection?.status === "pending",
    };
    const userFirstName = userFullName?.trim().split(/\s+/u)[0] ?? null;
    const includeAddressName = shouldSampleUserAddress(whatsappMessageId);
    const sourceComment = userFullName ? `${userFullName} : ${normalizedQuestion}` : normalizedQuestion;
    const fastPathMode = getFastPathMode();
    const fastPathCandidate = isSiteDiaryFastPathCandidate(normalizedQuestion);
    setSiteManagerExecutionPath("legacy-agent", fastPathMode);
    let legacyFastPathAttempted = false;
    let legacyFastPathOutcome: FastPathOutcome = "skipped";
    let legacyFallbackReason: FastPathFallbackReason | undefined = "ineligible";
    let classifiedIntent = "not-classified";
    let classifiedCorrectionMode = "not_applicable";
    let classifiedIntentConfidence: number | null = null;
    let classifiedIntentReason: string | null = null;

    const completeRunDetails = (content: string, finishReason: string, responseMetadata: unknown = null, usageMetadata: unknown = null) => {
        recordSiteManagerTiming("totalMs", Date.now() - totalStarted);
        if (!runContext) return;
        const metrics = getSiteManagerMetricsSnapshot();
        const responseMetadataRecord = asRecord(responseMetadata);
        const responseModelName = typeof responseMetadataRecord?.model_name === "string"
            ? responseMetadataRecord.model_name
            : null;
        runContext.details = {
            content,
            requestedModel,
            actualModel: responseModelName ?? metrics.modelCalls.at(-1)?.actualModel ?? null,
            tokenUsage: metrics.aggregateTokenUsage,
            usageMetadata,
            responseMetadata,
            finishReason,
            ...metrics,
        };
    };

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
                    fastPathTrace: {
                        fastPathMode: "shadow",
                        fastPathCandidate: true,
                        executionPath: "legacy-agent",
                        fastPathAttempted: true,
                        fastPathOutcome: "fallback",
                    },
                    intentContext,
                }),
            );
            legacyFastPathAttempted = true;
            classifiedIntent = shadowResult.action;
            classifiedCorrectionMode = shadowResult.correctionMode;
            classifiedIntentConfidence = shadowResult.intentConfidence ?? null;
            classifiedIntentReason = shadowResult.intentReason ?? null;
            legacyFastPathOutcome = shadowResult.action === "save_new_report"
                ? "save"
                : shadowResult.action === "correct_existing_report"
                    ? "correction"
                    : shadowResult.action === "clarify"
                        ? "clarify"
                        : "fallback";
            legacyFallbackReason = shadowResult.action === "fallback" ? "model-fallback" : undefined;
            recordSiteManagerTiming(
                shadowResult.action === "save_new_report" ? "shadowSaveDecisions" : "shadowFallbackDecisions",
                1,
            );
        } catch (error) {
            console.warn("site-manager fast-path shadow evaluation failed", error);
            legacyFastPathAttempted = true;
            legacyFastPathOutcome = "error";
            legacyFallbackReason = "extraction-error";
            recordSiteManagerTiming("shadowFallbackDecisions", 1);
        }
    }

    if (fastPathMode === "on" && fastPathCandidate) {
        let fastPathResult;
        try {
            fastPathResult = await runWithSiteManagerToolContext(
                { userId, siteId, originalUserComment: sourceComment },
                () => extractAndSaveSiteDiary({
                    question: normalizedQuestion,
                    allowFallback: true,
                    fastPathTrace: {
                        fastPathMode: "on",
                        fastPathCandidate: true,
                        executionPath: "fast-path",
                        fastPathAttempted: true,
                        fastPathOutcome: "fallback",
                    },
                    intentContext,
                }),
            );
            legacyFastPathAttempted = true;
            classifiedIntent = fastPathResult.action;
            classifiedCorrectionMode = fastPathResult.correctionMode;
            classifiedIntentConfidence = fastPathResult.intentConfidence ?? null;
            classifiedIntentReason = fastPathResult.intentReason ?? null;
            legacyFastPathOutcome = fastPathResult.action === "save_new_report"
                ? "save"
                : fastPathResult.action === "correct_existing_report"
                    ? "correction"
                    : fastPathResult.action === "clarify"
                        ? "clarify"
                        : "fallback";
            legacyFallbackReason = fastPathResult.action === "fallback" ? "model-fallback" : undefined;
        } catch (error) {
            console.warn("site-manager fast path failed before persistence; using legacy agent", error);
            legacyFastPathAttempted = true;
            legacyFastPathOutcome = "error";
            legacyFallbackReason = "extraction-error";
        }

        if (fastPathResult?.action === "clarify") {
            setSiteManagerExecutionPath("correction-path", fastPathMode);
            const content = fastPathResult.language === "lv"
                ? "Vai vēlaties labot iepriekšējo ierakstu vai saglabāt jaunu darbu ierakstu?"
                : fastPathResult.language === "ru"
                    ? "Вы хотите исправить предыдущую запись или сохранить новую?"
                    : "Do you want to correct the previous record or save a new work record?";
            completeRunDetails(content, "deterministic-correction-prompt");
            return content;
        }

        if (fastPathResult?.action === "save_new_report") {
            setSiteManagerExecutionPath("fast-path", fastPathMode);
            const content = formatDeterministicSaveReply(
                fastPathResult.language,
                {
                    ok: fastPathResult.ok,
                    count: fastPathResult.count,
                    message: fastPathResult.ok ? undefined : parseSaveToolOutcome(fastPathResult.content).message,
                    records: fastPathResult.records,
                },
                includeAddressName
                    ? getUserAddressName(userFirstName, fastPathResult.language)
                    : null,
            );
            completeRunDetails(content, "fast-path");
            return content;
        }

        if (fastPathResult?.action === "correct_existing_report") {
            setSiteManagerExecutionPath("correction-path", fastPathMode);
            const correctionTrace = fastPathTraceConfig({
                fastPathMode,
                fastPathCandidate,
                executionPath: "correction-path",
                fastPathAttempted: true,
                fastPathOutcome: "correction",
            });
            if (runContext) {
                runContext.fastPathTrace = correctionTrace.metadata;
                runContext.traceMetadata = {
                    ...(runContext.traceMetadata ?? {}),
                    classifiedIntent,
                    correctionMode: fastPathResult.correctionMode,
                    intentConfidence: classifiedIntentConfidence,
                    intentReason: classifiedIntentReason,
                };
            }

            const correctionResult = await runWithSiteManagerToolContext(
                { userId, siteId, originalUserComment: sourceComment },
                () => fastPathResult.correctionMode === "intent_only"
                    ? startSiteDiaryCorrectionOperation({ language: fastPathResult.language })
                    : fastPathResult.correctionMode === "supplied"
                        ? replaceLastSiteDiaryBatchOperation({
                            correction: normalizedQuestion,
                            language: fastPathResult.language,
                        })
                        : Promise.resolve({
                            kind: "site_diary_correction" as const,
                            status: "needs_clarification" as const,
                            language: fastPathResult.language,
                        }),
            );
            recordSiteManagerTiming(`correctionStatus.${correctionResult.status}`, 1);
            const content = formatDeterministicCorrectionReply(correctionResult);
            completeRunDetails(
                content,
                correctionResult.status === "pending" || correctionResult.status === "needs_clarification"
                    ? "deterministic-correction-prompt"
                    : "deterministic-correction",
            );
            return content;
        }
    }

    const legacyTrace = fastPathTraceConfig({
        fastPathMode,
        fastPathCandidate,
        executionPath: "legacy-agent",
        fastPathAttempted: legacyFastPathAttempted,
        fastPathOutcome: legacyFastPathOutcome,
        fallbackReason: legacyFallbackReason,
    });
    if (runContext) runContext.fastPathTrace = legacyTrace.metadata;
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
            replyToMessageId,
            pendingCorrection: intentContext.hasPendingCorrection,
            classifiedIntent,
            correctionMode: classifiedCorrectionMode,
            intentConfidence: classifiedIntentConfidence,
            intentReason: classifiedIntentReason,
            ...(runContext?.traceMetadata ?? {}),
            ...legacyTrace.metadata,
        },
        tags: [...(runContext?.traceTags ?? []), ...legacyTrace.tags],
    });

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
        const controlled = prepareControlledModelMessages(messages, {
            profile: "whatsapp-legacy",
        });
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
        if (isSaveOnlyToolRound(toolNames)) return "save_confirmation";
        if (isCorrectionOnlyToolRound(toolNames)) return "correction_confirmation";
        return "agent";
    };

    const saveConfirmation = async (state) => {
        const toolMessage = [...(state.messages ?? [])].reverse().find((message: any) =>
            message?.name === "save_to_database" || message?.additional_kwargs?.name === "save_to_database");
        const toolContent = typeof toolMessage?.content === "string" ? toolMessage.content : "";
        const replyLanguage = detectReplyLanguage(normalizedQuestion);
        return {
            messages: [new AIMessage({
                content: formatDeterministicSaveReply(
                    replyLanguage,
                    {
                        ...parseSaveToolOutcome(toolContent),
                        records: getSiteManagerSavedConfirmationRecords(),
                    },
                    includeAddressName
                        ? getUserAddressName(userFirstName, replyLanguage)
                        : null,
                ),
            })],
        };
    };

    const correctionConfirmation = async (state) => {
        setSiteManagerExecutionPath("correction-path", fastPathMode);
        const toolMessage = [...(state.messages ?? [])].reverse().find((message: any) =>
            message?.name === "start_site_diary_correction" ||
            message?.name === "replace_last_site_diary_batch" ||
            message?.additional_kwargs?.name === "start_site_diary_correction" ||
            message?.additional_kwargs?.name === "replace_last_site_diary_batch");
        const toolContent = typeof toolMessage?.content === "string" ? toolMessage.content : "";
        const correctionResult = parseCorrectionToolResult(toolContent);
        recordSiteManagerTiming(`correctionStatus.${correctionResult.status}`, 1);
        return {
            messages: [new AIMessage({
                content: formatDeterministicCorrectionReply(correctionResult),
            })],
        };
    };

    const workflow = new StateGraph(state)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addNode("save_confirmation", saveConfirmation)
        .addNode("correction_confirmation", correctionConfirmation)
        .addEdge(START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", END])
        .addConditionalEdges("tools", afterTools, ["save_confirmation", "correction_confirmation", "agent"])
        .addEdge("save_confirmation", END)
        .addEdge("correction_confirmation", END)

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
            new SystemMessage(`Trusted correction state: replyContext=${intentContext.hasReplyContext}; pendingCorrection=${intentContext.hasPendingCorrection}. Interpret the complete message. Never treat a standalone word as authoritative correction intent. Use start_site_diary_correction only for a clear intent-only correction, and replace_last_site_diary_batch only for a clear supplied correction or pending correction response.`),
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
                finishReason: responseMetadata?.finish_reason ??
                    (metrics.toolCalls.some((call) => call.name === "save_to_database")
                        ? "deterministic-save"
                        : metrics.toolCalls.some((call) =>
                            call.name === "start_site_diary_correction" ||
                            call.name === "replace_last_site_diary_batch")
                            ? "deterministic-correction"
                            : null),
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
