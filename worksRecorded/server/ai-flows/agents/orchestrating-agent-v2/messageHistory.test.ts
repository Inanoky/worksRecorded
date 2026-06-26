/**
 * @jest-environment node
 */

import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { prepareDashboardModelMessages } from "./messageHistory";

describe("Dashboard Message History Sanitation and Compaction", () => {
  it("removes older duplicate system prompts and keeps only the latest", () => {
    const messages = [
      new SystemMessage("first system prompt"),
      new HumanMessage("hello"),
      new SystemMessage("latest system prompt"),
      new HumanMessage("how are you?"),
    ];

    const result = prepareDashboardModelMessages(messages);
    expect(result.messages.length).toBe(3);
    expect(result.messages[0]).toBeInstanceOf(HumanMessage);
    expect(result.messages[1]).toBeInstanceOf(SystemMessage);
    expect(result.messages[1].content).toBe("latest system prompt");
    expect(result.messages[2]).toBeInstanceOf(HumanMessage);
  });

  it("drops dangling assistant tool calls and orphaned tool messages", () => {
    // AIMessage has a tool call but no matching ToolMessage
    const messages = [
      new SystemMessage("system prompt"),
      new HumanMessage("query"),
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "get_diary",
            args: { id: "1" },
            id: "call_123",
          },
        ],
      }),
    ];

    const result = prepareDashboardModelMessages(messages);
    // Since the tool call is dangling (no matching ToolMessage), it should be dropped by sanitizeCheckpointHistory
    expect(result.messages.length).toBe(2);
    expect(result.messages[0]).toBeInstanceOf(SystemMessage);
    expect(result.messages[1]).toBeInstanceOf(HumanMessage);
  });

  it("preserves valid tool-call and tool-result pairs", () => {
    const messages = [
      new SystemMessage("system prompt"),
      new HumanMessage("query"),
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "get_diary",
            args: { id: "1" },
            id: "call_123",
          },
        ],
      }),
      new ToolMessage({
        content: "diary content",
        name: "get_diary",
        tool_call_id: "call_123",
      }),
    ];

    const result = prepareDashboardModelMessages(messages);
    expect(result.messages.length).toBe(4);
    expect(result.messages[2]).toBeInstanceOf(AIMessage);
    expect(result.messages[3]).toBeInstanceOf(ToolMessage);
  });

  it("leaves recent tool messages untouched (last 10 messages)", () => {
    // Generate a long conversation containing a very large ToolMessage in the last 10 messages
    const messages: any[] = [new SystemMessage("system prompt")];
    for (let i = 0; i < 6; i++) {
      messages.push(new HumanMessage(`user turn ${i}`));
      messages.push(new AIMessage(`assistant response ${i}`));
    }

    // Now append a large ToolMessage that is within the last 10 messages
    // Message count is 1 (system) + 12 (turns) = 13
    // We add an AIMessage tool call + matching ToolMessage
    messages.push(
      new AIMessage({
        content: "",
        tool_calls: [{ name: "large_tool", args: {}, id: "call_large" }],
      })
    );
    messages.push(
      new ToolMessage({
        content: "A".repeat(15000), // 15,000 chars (over 8000 threshold)
        name: "large_tool",
        tool_call_id: "call_large",
      })
    );

    // Total messages = 15. The large ToolMessage is the last one (index 14, within the last 10)
    const result = prepareDashboardModelMessages(messages);
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg.content).toBe("A".repeat(15000));
    expect(result.stats.compactedCount).toBe(0);
  });

  it("never compacts the current run's trailing tool results even if history is long", () => {
    const messages: any[] = [new SystemMessage("system prompt")];
    // Push 20 human/assistant messages to move the index far back
    for (let i = 0; i < 10; i++) {
      messages.push(new HumanMessage(`user turn ${i}`));
      messages.push(new AIMessage(`assistant response ${i}`));
    }

    // Now make a tool call + response at the end. Even if we have a huge response
    messages.push(
      new AIMessage({
        content: "",
        tool_calls: [{ name: "large_tool", args: {}, id: "call_large" }],
      })
    );
    messages.push(
      new ToolMessage({
        content: "B".repeat(20000),
        name: "large_tool",
        tool_call_id: "call_large",
      })
    );

    const result = prepareDashboardModelMessages(messages);
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg.content).toBe("B".repeat(20000));
    expect(result.stats.compactedCount).toBe(0);
  });

  it("compacts old large tool messages over threshold based on how old they are", () => {
    const messages: any[] = [new SystemMessage("system prompt")];

    // Tool call 1: Old tool message (index around 2, way outside last 20 limit)
    // Threshold for older: 2000 chars. We will make it 3000 chars.
    messages.push(
      new AIMessage({
        content: "",
        tool_calls: [{ name: "old_tool", args: {}, id: "call_old" }],
      })
    );
    messages.push(
      new ToolMessage({
        content: "C".repeat(3000),
        name: "old_tool",
        tool_call_id: "call_old",
      })
    );

    // Tool call 2: Recent but not untouched tool message (index inside last 20, but outside last 10)
    // Let's add many messages to push the older one out of last 20
    for (let i = 0; i < 6; i++) {
      messages.push(new HumanMessage(`user turn ${i}`));
      messages.push(new AIMessage(`assistant response ${i}`));
    }
    // Now at index 15. We add a tool message of length 9000 (threshold for recent is 8000)
    messages.push(
      new AIMessage({
        content: "",
        tool_calls: [{ name: "recent_tool", args: {}, id: "call_recent" }],
      })
    );
    messages.push(
      new ToolMessage({
        content: "D".repeat(9000),
        name: "recent_tool",
        tool_call_id: "call_recent",
      })
    );

    // Add another 15 messages to make the total list 15 + 2 + 15 = 32 messages.
    // This puts Tool 1 (index 2) in the "older" range (< L - 20) and Tool 2 (index 16) in the "recent-but-not-untouched" range (L - 20 <= index < L - 10)
    for (let i = 6; i < 13; i++) {
      messages.push(new HumanMessage(`user turn ${i}`));
      messages.push(new AIMessage(`assistant response ${i}`));
    }
    messages.push(new HumanMessage("final user question"));

    const result = prepareDashboardModelMessages(messages);

    expect(result.stats.compactedCount).toBe(2);
    expect(result.stats.originalCount).toBe(32);

    // Tool 1 should be compacted (original size 3000, threshold 2000)
    const compactedTool1 = result.messages[2];
    expect(compactedTool1.content).toContain("[TOOL OUTPUT COMPACTED]");
    expect(compactedTool1.content).toContain("Tool Name: old_tool");
    expect(compactedTool1.content).toContain("Original Size: ~3000");

    // Tool 2 should also be compacted (original size 9000, threshold 8000)
    const compactedTool2 = result.messages[16];
    expect(compactedTool2.content).toContain("[TOOL OUTPUT COMPACTED]");
    expect(compactedTool2.content).toContain("Tool Name: recent_tool");
    expect(compactedTool2.content).toContain("Original Size: ~9000");

    // Let's verify stats structure
    expect(result.stats.beforeChars).toBeGreaterThan(12000);
    expect(result.stats.afterChars).toBeLessThan(4000);
    expect(result.stats.beforeTokens).toBe(Math.ceil(result.stats.beforeChars / 4));
    expect(result.stats.afterTokens).toBe(Math.ceil(result.stats.afterChars / 4));
  });

  it("handles plain object representation of messages correctly", () => {
    const messages = [
      { type: "system", content: "system prompt" },
      { type: "human", content: "hello" },
      {
        type: "ai",
        content: "",
        tool_calls: [{ name: "my_tool", args: {}, id: "my_call" }],
      },
      {
        type: "tool",
        content: "E".repeat(5000),
        name: "my_tool",
        tool_call_id: "my_call",
      },
      // add trailing messages to push the tool message out of untouched window (L - 10)
      { type: "human", content: "1" },
      { type: "ai", content: "1" },
      { type: "human", content: "2" },
      { type: "ai", content: "2" },
      { type: "human", content: "3" },
      { type: "ai", content: "3" },
      { type: "human", content: "4" },
      { type: "ai", content: "4" },
      { type: "human", content: "5" },
      { type: "ai", content: "5" },
      { type: "human", content: "6" },
    ];

    // Total length = 15. Tool message is index 3.
    // L = 15, untouched window starts at L - 10 = 5.
    // Tool message is at index 3 (< 5), so it is not in the untouched window.
    // Index 3 >= L - 20 (15 - 20 = -5), so it's "recent" -> threshold is 8000.
    // Size is 5000, which is < 8000, so it should NOT be compacted!
    let result = prepareDashboardModelMessages(messages);
    expect(result.stats.compactedCount).toBe(0);
    expect(result.messages[3].content).toBe("E".repeat(5000));

    // Now let's test if the tool message is older (index < L - 20).
    // Let's add 15 more messages to make it older.
    const olderMessages = [...messages];
    for (let i = 0; i < 15; i++) {
      olderMessages.push({ type: "human", content: `msg ${i}` });
    }
    // L = 30, untouched starts at 20. Tool message is at index 3.
    // Index 3 < L - 20 (30 - 20 = 10). So it is "older".
    // Threshold is 2000. Content size is 5000 (> 2000), so it SHOULD be compacted!
    result = prepareDashboardModelMessages(olderMessages);
    expect(result.stats.compactedCount).toBe(1);
    expect(result.messages[3].content).toContain("[TOOL OUTPUT COMPACTED]");
  });

  it("compacts a 20k token (80,000 char) tool result, tracks exact token savings, and preserves the main question/structure", () => {
    const messages: any[] = [
      new SystemMessage("Core orchestrator prompt instructions"),
    ];

    // Add a huge ToolMessage at index 2 (older index, threshold 2,000)
    messages.push(
      new AIMessage({
        content: "",
        tool_calls: [{ name: "massive_database_dump", args: {}, id: "call_massive" }],
      })
    );
    
    // 20k tokens is roughly 80,000 characters.
    // Let's create an 80,000 character tool response containing some specific target data.
    const keyDetail = "Target details: Secret Passcode is ANTIGRAVITY-RULES.";
    const massiveContent = "A".repeat(40000) + `\n${keyDetail}\n` + "B".repeat(40000);
    
    messages.push(
      new ToolMessage({
        content: massiveContent,
        name: "massive_database_dump",
        tool_call_id: "call_massive",
      })
    );

    // Push 15 additional human/assistant turns (30 messages) to push the tool message outside the untouched window (L - 10)
    for (let i = 0; i < 15; i++) {
      messages.push(new HumanMessage(`What is the status of task ${i}?`));
      messages.push(new AIMessage(`Status of task ${i} is active.`));
    }

    // The final question (the main question)
    const mainQuestion = "Verify the latest status update from today's reports.";
    messages.push(new HumanMessage(mainQuestion));

    // L = 1 + 2 + 30 + 1 = 34 messages.
    // The massive tool output is at index 2. Since 2 < 34 - 10 = 24, it is eligible for compaction.
    // It's also at index 2 < 34 - 20 = 14, so it's "older", threshold is 2000 chars.
    // 80,050 chars is well above 2000, so it will compact.
    const result = prepareDashboardModelMessages(messages);

    // Verify compaction occurred
    expect(result.stats.compactedCount).toBe(1);
    expect(result.stats.originalCount).toBe(34);

    // Verify token savings tracking
    expect(result.stats.beforeChars).toBeGreaterThan(80000);
    expect(result.stats.afterChars).toBeLessThan(5000); // compacted message is tiny
    
    const tokensSaved = result.stats.beforeTokens - result.stats.afterTokens;
    expect(tokensSaved).toBeGreaterThan(19000); // saved over 19k tokens

    // Verify structure is preserved (dangling nodes check)
    // The AIMessage at index 1 and compacted ToolMessage at index 2 are still present as a pair.
    expect(result.messages[1]).toBeInstanceOf(AIMessage);
    expect(result.messages[2]).toBeInstanceOf(ToolMessage);
    expect(result.messages[2].content).toContain("[TOOL OUTPUT COMPACTED]");
    expect(result.messages[2].content).toContain("massive_database_dump");
    expect(result.messages[2].content).not.toContain("ANTIGRAVITY-RULES");

    // Verify the latest system message and the final user question are preserved untouched
    const systemMsg = result.messages.find(m => m instanceof SystemMessage);
    expect(systemMsg?.content).toBe("Core orchestrator prompt instructions");
    
    const lastMsg = result.messages[result.messages.length - 1];
    expect(lastMsg).toBeInstanceOf(HumanMessage);
    expect(lastMsg.content).toBe(mainQuestion);
  });
});
