export type ZtcAdditionalWorkOrigin =
  | "fresh_drawing"
  | "active_drawing"
  | "paused_drawing"
  | "standalone";

export type ZtcAdditionalWorkContext = {
  origin: ZtcAdditionalWorkOrigin;
  parentSessionId: string | null;
  parentWork: string | null;
  parentProject: string | null;
  parentElement: string | null;
};

type AdditionalWorkState = {
  hasDrawingContext: boolean;
  hasStartedWork: boolean;
  isPaused: boolean;
};

export function resolveZtcAdditionalWorkOrigin(
  state: AdditionalWorkState | null | undefined,
): ZtcAdditionalWorkOrigin {
  if (!state?.hasDrawingContext) return "standalone";
  if (!state.hasStartedWork) return "fresh_drawing";
  return state.isPaused ? "paused_drawing" : "active_drawing";
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function nullableString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function attachZtcAdditionalWorkContext(
  metadataValue: unknown,
  context: ZtcAdditionalWorkContext,
) {
  const metadata = parseJsonObject(metadataValue) ?? {
    type: "ztc_additional_work_context",
    version: 1,
  };

  return JSON.stringify({
    ...metadata,
    additionalWorkContext: context,
  });
}

export function readZtcAdditionalWorkContext(
  metadataValue: unknown,
): ZtcAdditionalWorkContext | null {
  const metadata = parseJsonObject(metadataValue);
  const raw = metadata?.additionalWorkContext;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const context = raw as Record<string, unknown>;
  const origin = context.origin;
  if (
    origin !== "fresh_drawing" &&
    origin !== "active_drawing" &&
    origin !== "paused_drawing" &&
    origin !== "standalone"
  ) {
    return null;
  }

  return {
    origin,
    parentSessionId: nullableString(context.parentSessionId),
    parentWork: nullableString(context.parentWork),
    parentProject: nullableString(context.parentProject),
    parentElement: nullableString(context.parentElement),
  };
}

export function isZtcAdditionalWorkAttachedToDrawing(
  context: ZtcAdditionalWorkContext | null | undefined,
) {
  return (
    context?.origin === "fresh_drawing" || context?.origin === "active_drawing"
  );
}

export function shouldReuseZtcDrawingContextFromAdditionalWork(
  context: ZtcAdditionalWorkContext | null | undefined,
) {
  return context?.origin === "fresh_drawing";
}
