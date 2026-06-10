export type PerfValue = string | number | boolean | null | undefined;
export type PerfFields = Record<string, PerfValue>;

type PerfTraceArgs = {
  route: string;
  requestId?: string | null;
  userId?: string | null;
  siteId?: string | null;
};

type FinishArgs = {
  status: number;
  extra?: PerfFields;
};

type PerfEventArgs = {
  route: string;
  requestId?: string | null;
  userId?: string | null;
  siteId?: string | null;
  status?: number;
  totalMs?: number;
  extra?: PerfFields;
  error?: unknown;
};

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function roundPerfMs(value: number) {
  return Math.round(value * 10) / 10;
}

export function makePerfRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isPerfLogsEnabled() {
  if (process.env.PERF_LOGS_ENABLED) {
    return process.env.PERF_LOGS_ENABLED !== "false";
  }

  return process.env.NODE_ENV !== "test";
}

export function getSafePerfError(error: unknown): PerfFields {
  if (!error || typeof error !== "object") {
    return { errorName: "UnknownError" };
  }

  const record = error as { name?: unknown; code?: unknown; status?: unknown };
  return {
    errorName: typeof record.name === "string" ? record.name : "Error",
    errorCode: typeof record.code === "string" || typeof record.code === "number" ? record.code : undefined,
    errorStatus: typeof record.status === "number" ? record.status : undefined,
  };
}

export function writePerfLog(payload: PerfFields & { route: string }) {
  if (!isPerfLogsEnabled()) return;

  console.log(`[perf] ${JSON.stringify(payload)}`);
}

export function logPerfEvent({
  route,
  requestId,
  userId,
  siteId,
  status,
  totalMs,
  extra,
  error,
}: PerfEventArgs) {
  writePerfLog({
    route,
    requestId: requestId || makePerfRequestId(),
    userId: userId ?? undefined,
    siteId: siteId ?? undefined,
    status,
    totalMs: typeof totalMs === "number" ? roundPerfMs(totalMs) : undefined,
    ...(extra ?? {}),
    ...(error ? getSafePerfError(error) : {}),
  });
}

export function createPerfTrace({ route, requestId, userId, siteId }: PerfTraceArgs) {
  const startedAt = nowMs();
  const timings: Record<string, number> = {};
  let finished = false;

  async function measure<T>(phase: string, task: () => T | Promise<T>): Promise<T> {
    const phaseStartedAt = nowMs();
    try {
      return await task();
    } finally {
      timings[`${phase}Ms`] = roundPerfMs(nowMs() - phaseStartedAt);
    }
  }

  function write(status: number, extra?: PerfFields) {
    if (finished) return;
    finished = true;

    writePerfLog({
      route,
      requestId: requestId || makePerfRequestId(),
      userId: userId ?? undefined,
      siteId: siteId ?? undefined,
      status,
      totalMs: roundPerfMs(nowMs() - startedAt),
      ...timings,
      ...(extra ?? {}),
    });
  }

  return {
    measure,
    end({ status, extra }: FinishArgs) {
      write(status, extra);
    },
    fail(error: unknown, { status, extra }: FinishArgs) {
      write(status, {
        ...(extra ?? {}),
        ...getSafePerfError(error),
      });
    },
  };
}
