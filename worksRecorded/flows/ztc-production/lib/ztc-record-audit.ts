import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";

type AuditContext = {
  source: "whatsapp-worker" | "whatsapp-quality" | "manual" | "system";
  actorId?: string;
  correlationId?: string;
  messageId?: string;
  inputText?: string;
  details?: Record<string, unknown>;
};

const storage = new AsyncLocalStorage<AuditContext>();

export function withZtcRecordAudit<T>(context: AuditContext, run: () => T): T {
  return storage.run({ correlationId: randomUUID(), ...storage.getStore(), ...context }, run);
}

export function ztcMessageAuditContext(
  source: "whatsapp-worker" | "whatsapp-quality",
  workerId: string,
  formData: FormData,
): AuditContext {
  return {
    source,
    actorId: workerId,
    messageId: String(
      formData.get("MessageId") ?? formData.get("MessageSid") ?? "",
    ),
    inputText: String(formData.get("Body") ?? ""),
    details: { mediaCount: Number(formData.get("NumMedia") ?? 0) },
  };
}

export async function auditZtcMutation<T>(
  step: string,
  mutate: (tx: Prisma.TransactionClient) => Promise<T>,
  context?: Partial<AuditContext>,
): Promise<T> {
  const event = {
    source: "system",
    correlationId: randomUUID(),
    ...storage.getStore(),
    ...context,
    step,
  };
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.ztc_audit_context', ${JSON.stringify(event)}, true)`;
      return mutate(tx);
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
}
