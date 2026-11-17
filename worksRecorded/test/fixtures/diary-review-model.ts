import {
  type AgentOutputItem,
  type AssistantMessageItem,
  type FunctionCallItem,
  type Model,
  type ModelRequest,
  type ModelResponse,
  type StreamEvent,
  Usage,
} from "@openai/agents";

export class ScriptedReviewModel implements Model {
  readonly calls: ModelRequest[] = [];
  constructor(private readonly steps: AgentOutputItem[][] = []) {}
  get firstCall() {
    return this.calls[0];
  }
  async getResponse(request: ModelRequest): Promise<ModelResponse> {
    this.calls.push(request);
    const output = this.steps.shift();
    if (!output) throw new Error("Unexpected model call");
    return { output, usage: new Usage({ requests: 1 }) };
  }
  async *getStreamedResponse(
    _request: ModelRequest,
  ): AsyncIterable<StreamEvent> {
    yield* [];
    throw new Error("Unexpected streamed call");
  }
  assertComplete() {
    if (this.steps.length) throw new Error("Unconsumed model steps");
  }
}

export function reviewAssistantMessage(text: string): AssistantMessageItem {
  return {
    type: "message",
    role: "assistant",
    status: "completed",
    content: [{ type: "output_text", text }],
  };
}

export function reviewFunctionCall(
  name: string,
  args: object,
  options: { callId: string },
): FunctionCallItem {
  return {
    type: "function_call",
    name,
    arguments: JSON.stringify(args),
    callId: options.callId,
  };
}
