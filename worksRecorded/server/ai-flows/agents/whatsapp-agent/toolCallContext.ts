type ToolCallLike = {
    name?: string;
    args?: Record<string, unknown>;
    function?: {
        name?: string;
        arguments?: string;
    };
};

type SiteManagerToolContext = {
    sourceComment: string;
    userId: string;
    siteId: string | null;
    originalAudioUrl?: string | null;
};

type WorkerToolContext = {
    workerId: string;
    siteId: string | null;
    nowISO: string;
    sourceComment: string;
    originalAudioUrl?: string | null;
};

function getToolName(toolCall: ToolCallLike): string | undefined {
    return toolCall.name ?? toolCall.function?.name;
}

function setSiteManagerArgs(args: Record<string, unknown>, context: SiteManagerToolContext) {
    args.userId = context.userId;
    args.siteId = context.siteId;
    args.originalUserComment = context.sourceComment;
    delete args.originalAudioUrl;
}

function setWorkerArgs(args: Record<string, unknown>, toolName: string, context: WorkerToolContext) {
    args.workerId = context.workerId;
    args.siteId = context.siteId;

    if (toolName === "WorkerDiaryToDatabase") {
        if (!args.date) args.date = context.nowISO;
        args.originalUserComment = context.sourceComment;
        delete args.originalAudioUrl;
    }
}

function mutateToolCallArgs(
    toolCall: ToolCallLike,
    mutate: (args: Record<string, unknown>) => void,
): "langchain_args" | "function_arguments" | null {
    if (toolCall.args && typeof toolCall.args === "object" && !Array.isArray(toolCall.args)) {
        mutate(toolCall.args);
        return "langchain_args";
    }

    if (toolCall.function?.arguments) {
        const args = JSON.parse(toolCall.function.arguments);
        mutate(args);
        toolCall.function.arguments = JSON.stringify(args);
        return "function_arguments";
    }

    return null;
}

export function injectSiteManagerToolCallContext(
    toolCall: ToolCallLike,
    context: SiteManagerToolContext,
): boolean {
    const toolName = getToolName(toolCall);
    if (toolName !== "save_to_database") return false;

    const argumentShape = mutateToolCallArgs(toolCall, (args) => {
        setSiteManagerArgs(args, context);
    });

    if (!argumentShape) return false;

    console.log("[originalAudioUrl][siteManagerAgent] injected app context into tool args", {
        argumentShape,
        toolName,
        userId: context.userId,
        siteId: context.siteId,
        hasOriginalAudioUrl: Boolean(context.originalAudioUrl),
    });

    return true;
}

export function injectWorkerToolCallContext(
    toolCall: ToolCallLike,
    context: WorkerToolContext,
): boolean {
    const toolName = getToolName(toolCall);
    if (
        toolName !== "ClockInWorker" &&
        toolName !== "ClockOutWorker" &&
        toolName !== "WorkerDiaryToDatabase"
    ) {
        return false;
    }

    const argumentShape = mutateToolCallArgs(toolCall, (args) => {
        setWorkerArgs(args, toolName, context);
    });

    if (!argumentShape) return false;

    if (toolName === "WorkerDiaryToDatabase") {
        console.log("[originalAudioUrl][workerAgent] injected app context into tool args", {
            argumentShape,
            toolName,
            workerId: context.workerId,
            siteId: context.siteId,
            hasOriginalAudioUrl: Boolean(context.originalAudioUrl),
        });
    }

    return true;
}
