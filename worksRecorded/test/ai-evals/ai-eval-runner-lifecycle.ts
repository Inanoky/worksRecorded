import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";

export async function runWithLangSmithTraceFlush<T>(
  run: () => Promise<T>,
  flush: () => Promise<void> = awaitAllCallbacks,
) {
  try {
    return await run();
  } finally {
    await flush();
  }
}
