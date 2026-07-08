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

  it("keeps only the latest 5 user-visible turns for whatsapp legacy replay", () => {
    const messages: any[] = [new SystemMessage("old system"), new SystemMessage("latest system")];

    for (let i = 0; i < 7; i += 1) {
      messages.push(new HumanMessage(`question ${i}`));
      messages.push(new AIMessage(`answer ${i}`));
    }

    const result = prepareControlledModelMessages(messages, {
      profile: "whatsapp-legacy",
    });

    expect(result.messages.map((message: any) => message.content)).toEqual([
      "latest system",
      "question 2",
      "answer 2",
      "question 3",
      "answer 3",
      "question 4",
      "answer 4",
      "question 5",
      "answer 5",
      "question 6",
      "answer 6",
    ]);
    expect(result.stats.keptTurns).toBe(5);
    expect(result.stats.droppedTurns).toBe(2);
    expect(result.stats.droppedOlderMessages).toBe(4);
    expect(result.stats.profile).toBe("whatsapp-legacy");
  });

  it("compacts replayed tool outputs into short labels for whatsapp legacy replay", () => {
    const result = prepareControlledModelMessages([
      new SystemMessage("system"),
      new HumanMessage("save this"),
      new AIMessage({
        content: "",
        tool_calls: [{ name: "save_to_database", args: {}, id: "save_call" }],
      }),
      new ToolMessage({
        content: "Saved 2 site diary record(s) successfully.",
        name: "save_to_database",
        tool_call_id: "save_call",
      }),
      new AIMessage("saved"),
      new HumanMessage("what is BIS status?"),
      new AIMessage({
        content: "",
        tool_calls: [{ name: "read_site_diary_bis_statuses", args: {}, id: "bis_call" }],
      }),
      new ToolMessage({
        content: JSON.stringify([{ id: 1, bisStatus: "pending" }, { id: 2, bisStatus: "approved" }]),
        name: "read_site_diary_bis_statuses",
        tool_call_id: "bis_call",
      }),
    ], {
      profile: "whatsapp-legacy",
    });

    const toolMessages = result.messages.filter((message: any) => message.getType?.() === "tool");
    expect(toolMessages).toHaveLength(2);
    expect(String(toolMessages[0].content)).toBe(
      "[HISTORICAL TOOL RESULT] save_to_database: DB save successful (2 records). Exact payload omitted.",
    );
    expect(String(toolMessages[1].content)).toBe(
      "[HISTORICAL TOOL RESULT] read_site_diary_bis_statuses: Read completed (2 rows). Exact payload omitted.",
    );
    expect(result.stats.compactedCount).toBe(2);
  });
});
