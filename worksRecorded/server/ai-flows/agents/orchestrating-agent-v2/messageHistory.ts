import {
  prepareControlledModelMessages,
  type ControlledMemoryResult,
} from "@/server/ai-flows/controlled-memory";

export type DashboardSanitizationStats = ControlledMemoryResult["stats"];
export type DashboardPrepareResult = ControlledMemoryResult;

/**
 * Backward-compatible dashboard wrapper around the shared controlled-memory policy.
 */
export function prepareDashboardModelMessages(messages: any[]): DashboardPrepareResult {
  return prepareControlledModelMessages(messages);
}
