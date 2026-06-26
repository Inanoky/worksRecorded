/**
 * @jest-environment node
 */

import { AIMessage, HumanMessage, RemoveMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import {
  buildControlledMemoryMessagesUpdate,
  prepareControlledModelMessages,
  summarizeSqlRowsForTool,
  summarizeToolOutput,
} from "./controlled-memory";

describe("controlled memory", () => {
  it("keeps the latest system prompt and drops invalid tool chains", () => {
    const result = prepareControlledModelMessages([
      new SystemMessage("old system"),
      new HumanMessage("hello"),
      new ToolMessage({
        content: "orphan",
        name: "orphan_tool",
        tool_call_id: "orphan",
      }),
      new AIMessage({
        content: "",
        tool_calls: [{ name: "missing_tool", args: {}, id: "call_missing" }],
      }),
      new SystemMessage("latest system"),
      new HumanMessage("current question"),
    ]);

    expect(result.messages.map((message: any) => message.content)).toEqual([
      "hello",
      "latest system",
      "current question",
    ]);
    expect(result.stats.droppedOlderSystemMessages).toBe(1);
    expect(result.stats.droppedOrphanToolMessages).toBe(1);
    expect(result.stats.droppedDanglingAssistantToolCalls).toBe(1);
  });

  it("compacts old large tool outputs and preserves current trailing tool output", () => {
    const messages: any[] = [
      new SystemMessage("system"),
      new AIMessage({
        content: "",
        tool_calls: [{ name: "postreSQL_site_diary_records_database_query_tool", args: {}, id: "old_call" }],
      }),
      new ToolMessage({
        content: JSON.stringify(
          Array.from({ length: 500 }, (_, idx) => ({
            id: idx,
            date: "2026-06-26",
            comment: "A".repeat(80),
          })),
        ),
        name: "postreSQL_site_diary_records_database_query_tool",
        tool_call_id: "old_call",
      }),
    ];

    for (let i = 0; i < 16; i += 1) {
      messages.push(new HumanMessage(`turn ${i}`));
      messages.push(new AIMessage(`answer ${i}`));
    }

    messages.push(
      new AIMessage({
        content: "",
        tool_calls: [{ name: "current_tool", args: {}, id: "current_call" }],
      }),
      new ToolMessage({
        content: "X".repeat(50_000),
        name: "current_tool",
        tool_call_id: "current_call",
      }),
    );

    const result = prepareControlledModelMessages(messages);

    expect(result.stats.compactedCount).toBe(1);
    expect(result.stats.compactedByTool.postreSQL_site_diary_records_database_query_tool).toBe(1);
    expect(String(result.messages[2].content)).toContain("[TOOL OUTPUT COMPACTED]");
    expect(String(result.messages[result.messages.length - 1].content)).toBe("X".repeat(50_000));
  });

  it("builds a replace-all update that can normalize checkpoint state", () => {
    const response = new AIMessage("done");
    const update = buildControlledMemoryMessagesUpdate([new HumanMessage("question")], response);

    expect(update[0]).toBeInstanceOf(RemoveMessage);
    expect((update[0] as RemoveMessage).id).toBe("__remove_all__");
    expect(update.at(-1)).toBe(response);
  });

  it("summarizes SQL rows for bounded tool persistence", () => {
    const summary = summarizeSqlRowsForTool(
      Array.from({ length: 500 }, (_, idx) => ({
        id: idx,
        date: "2026-06-26",
        comment: "A".repeat(80),
      })),
      "timesheets_records_postgreSQL_database_query_tool",
      1_000,
    );

    expect(summary).toContain("[BOUNDED SQL TOOL RESULT]");
    expect(summary).toContain("Row Count: 500");
    expect(summary).toContain("Columns: id, date, comment");
    expect(summary).toContain("Exactness Policy");
  });

  it("preserves useful web/python links in generic summaries", () => {
    const summary = summarizeToolOutput(
      "thePythonTool",
      `Created file at https://example.com/report.xlsx\n${"A".repeat(10_000)}`,
    );

    expect(summary).toContain("https://example.com/report.xlsx");
    expect(summary).toContain("Re-run the relevant read tool");
  });
});
