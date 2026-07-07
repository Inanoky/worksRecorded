import {
    injectSiteManagerToolCallContext,
    injectWorkerToolCallContext,
} from "./toolCallContext";
import { formatSiteDiarySaveToolResult } from "./SiteManagerAgentForSiteManagerRoute/siteDiaryToolResult";

describe("tool call context injection", () => {
    it("injects app-controlled context into LangChain-style site manager toolCall.args without audio metadata", () => {
        const toolCall = {
            name: "save_to_database",
            args: {
                question: "save diary",
                siteId: "wrong-site",
                userId: "wrong-user",
                date: "08-06-2026",
                originalUserComment: "Test transcript",
                originalAudioUrl: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test",
            },
            type: "tool_call",
            id: "call-1",
        };

        const injected = injectSiteManagerToolCallContext(toolCall, {
            sourceComment: "Manager Name : Test transcript",
            userId: "user-1",
            siteId: "site-1",
            originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
        });

        expect(injected).toBe(true);
        expect(toolCall.args).toEqual(
            expect.objectContaining({
                question: "save diary",
                date: "08-06-2026",
                userId: "user-1",
                siteId: "site-1",
                originalUserComment: "Manager Name : Test transcript",
            }),
        );
        expect(toolCall.args).not.toHaveProperty("originalAudioUrl");
    });

    it("strips LLM-provided audio URL from existing tool args", () => {
        const toolCall = {
            name: "save_to_database",
            args: {
                question: "save diary",
                originalAudioUrl: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test",
            },
            type: "tool_call",
            id: "call-meta",
        };

        injectSiteManagerToolCallContext(toolCall, {
            sourceComment: "Manager Name : Test transcript",
            userId: "user-1",
            siteId: "site-1",
            originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
        });

        expect(toolCall.args).not.toHaveProperty("originalAudioUrl");
        expect(toolCall.args).toEqual(
            expect.objectContaining({
                userId: "user-1",
                siteId: "site-1",
            }),
        );
    });

    it("injects app-controlled context into OpenAI-style site manager function arguments without audio metadata", () => {
        const toolCall = {
            function: {
                name: "save_to_database",
                arguments: JSON.stringify({
                    question: "save diary",
                    siteId: "wrong-site",
                    userId: "wrong-user",
                    date: "08-06-2026",
                    originalUserComment: "Test transcript",
                    originalAudioUrl: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test",
                }),
            },
        };

        const injected = injectSiteManagerToolCallContext(toolCall, {
            sourceComment: "Manager Name : Test transcript",
            userId: "user-1",
            siteId: "site-1",
            originalAudioUrl: "https://ut.test.ufs.sh/f/voice.ogg",
        });

        expect(injected).toBe(true);
        const parsedArgs = JSON.parse(toolCall.function.arguments);
        expect(parsedArgs).toEqual(
            expect.objectContaining({
                question: "save diary",
                date: "08-06-2026",
                userId: "user-1",
                siteId: "site-1",
                originalUserComment: "Manager Name : Test transcript",
            }),
        );
        expect(parsedArgs).not.toHaveProperty("originalAudioUrl");
    });

    it("injects app context into LangChain-style worker diary toolCall.args without audio metadata", () => {
        const toolCall = {
            name: "WorkerDiaryToDatabase",
            args: {
                question: "save worker diary",
                workerId: "wrong-worker",
                siteId: "wrong-site",
            },
            type: "tool_call",
            id: "call-2",
        };

        const injected = injectWorkerToolCallContext(toolCall, {
            workerId: "worker-1",
            siteId: "site-1",
            nowISO: "2026-06-08T12:00:00.000Z",
            sourceComment: "Worker Name : Test transcript",
            originalAudioUrl: "https://ut.test.ufs.sh/f/worker-voice.ogg",
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

    it("ignores unrelated tools", () => {
        const toolCall = {
            name: "another_tool",
            args: { userId: "wrong-user", siteId: "wrong-site" },
        };

        const injected = injectSiteManagerToolCallContext(toolCall, {
            sourceComment: "Manager Name : Test transcript",
            userId: "user-1",
            siteId: "site-1",
        });

        expect(injected).toBe(false);
        expect(toolCall.args).toEqual({ userId: "wrong-user", siteId: "wrong-site" });
    });

    it("returns false when the site diary tool call has no arguments", () => {
        const injected = injectSiteManagerToolCallContext(
            { name: "save_to_database" },
            {
                sourceComment: "Manager Name : Test transcript",
                userId: "user-1",
                siteId: "site-1",
            },
        );

        expect(injected).toBe(false);
    });

    it("formats site diary save tool result with count, record IDs, and failure reason", () => {
        expect(
            formatSiteDiarySaveToolResult(
                { ok: true, count: 2, recordIds: ["record-1", "record-2"] },
                3,
            ),
        ).toBe("Saved 2 site diary record(s) successfully. Record IDs: record-1, record-2.");

        expect(
            formatSiteDiarySaveToolResult({ ok: false, message: "No records to insert" }, 0),
        ).toBe("Failed to save site diary entry. Reason: No records to insert");
    });
});
