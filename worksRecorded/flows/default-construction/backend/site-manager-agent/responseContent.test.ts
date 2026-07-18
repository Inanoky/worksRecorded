/**
 * @jest-environment node
 */

import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { getFinalAssistantResponse } from "./responseContent";

describe("site-manager final response extraction", () => {
  it("extracts Responses API text blocks instead of the preceding tool result", () => {
    const toolMessage = new ToolMessage({
      content: "[HISTORICAL TOOL RESULT] get_bis_connection_status: internal result",
      name: "get_bis_connection_status",
      tool_call_id: "call-1",
    });
    const assistantMessage = new AIMessage({
      content: [{ type: "text", text: "BIS pašlaik nav pieslēgts." }],
    });

    expect(getFinalAssistantResponse([toolMessage, assistantMessage])).toEqual({
      message: assistantMessage,
      content: "BIS pašlaik nav pieslēgts.",
    });
  });

  it("continues to support Chat Completions string content", () => {
    const assistantMessage = new AIMessage("Saglabāts.");

    expect(getFinalAssistantResponse([assistantMessage])?.content).toBe("Saglabāts.");
  });

  it("never returns a tool message as a user-visible response", () => {
    const toolMessage = new ToolMessage({
      content: "[HISTORICAL TOOL RESULT] save_to_database: internal result",
      name: "save_to_database",
      tool_call_id: "call-2",
    });

    expect(getFinalAssistantResponse([toolMessage])).toBeNull();
  });

  it("rejects an internal tool-history marker even if it appears in an assistant message", () => {
    const assistantMessage = new AIMessage(
      "[HISTORICAL TOOL RESULT] get_bis_connection_status: internal result",
    );

    expect(getFinalAssistantResponse([assistantMessage])).toBeNull();
  });

  it("does not fall back to a stale assistant reply when the latest assistant turn has no text", () => {
    const previousReply = new AIMessage("Previous reply");
    const latestToolCall = new AIMessage({
      content: [],
      tool_calls: [{ name: "get_bis_connection_status", args: {}, id: "call-3" }],
    });

    expect(getFinalAssistantResponse([previousReply, latestToolCall])).toBeNull();
  });
});
