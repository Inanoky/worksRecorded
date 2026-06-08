import {
    injectSiteManagerToolCallContext,
    injectWorkerToolCallContext,
} from "./toolCallContext";

describe("tool call context injection", () => {
    it("injects app context into LangChain-style site manager toolCall.args without original audio URL", () => {
        const toolCall = {
            name: "save_to_database",
            args: {
                question: "save diary",
                siteId: "site-1",
                userId: "user-1",
                date: "08-06-2026",
                originalUserComment: "Test transcript",
            },
            type: "tool_call",
            id: "call-1",
        };

        const injected = injectSiteManagerToolCallContext(toolCall, {
            sourceComment: "Manager Name : Test transcript",
            userId: "user-1",
            siteId: "site-1",
        });

        expect(injected).toBe(true);
        expect(toolCall.args).toEqual(
            expect.objectContaining({
                originalUserComment: "Manager Name : Test transcript",
            }),
        );
        expect(toolCall.args).not.toHaveProperty("originalAudioUrl");
    });

    it("injects app context into OpenAI-style site manager function arguments without original audio URL", () => {
        const toolCall = {
            function: {
                name: "save_to_database",
                arguments: JSON.stringify({
                    question: "save diary",
                    siteId: "site-1",
                    userId: "user-1",
                    date: "08-06-2026",
                    originalUserComment: "Test transcript",
                }),
            },
        };

        const injected = injectSiteManagerToolCallContext(toolCall, {
            sourceComment: "Manager Name : Test transcript",
            userId: "user-1",
            siteId: "site-1",
        });

        expect(injected).toBe(true);
        const parsedArgs = JSON.parse(toolCall.function.arguments);
        expect(parsedArgs).toEqual(
            expect.objectContaining({
                originalUserComment: "Manager Name : Test transcript",
            }),
        );
        expect(parsedArgs).not.toHaveProperty("originalAudioUrl");
    });

    it("injects app context into LangChain-style worker diary toolCall.args without original audio URL", () => {
        const toolCall = {
            name: "WorkerDiaryToDatabase",
            args: {
                question: "save worker diary",
            },
            type: "tool_call",
            id: "call-2",
        };

        const injected = injectWorkerToolCallContext(toolCall, {
            workerId: "worker-1",
            siteId: "site-1",
            nowISO: "2026-06-08T12:00:00.000Z",
            sourceComment: "Worker Name : Test transcript",
        });

        expect(injected).toBe(true);
        expect(toolCall.args).toEqual(
            expect.objectContaining({
                workerId: "worker-1",
                siteId: "site-1",
                date: "2026-06-08T12:00:00.000Z",
                originalUserComment: "Worker Name : Test transcript",
            }),
        );
        expect(toolCall.args).not.toHaveProperty("originalAudioUrl");
    });
});
