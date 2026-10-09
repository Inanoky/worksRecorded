/** @jest-environment node */
const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import {
  auditZtcMutation,
  withZtcRecordAudit,
  ztcMessageAuditContext,
} from "./ztc-record-audit";
import { withZtcMessageRecoveryContext } from "@/flows/ztc-production/backend/message-recovery-context";

describe("ZTC record audit context", () => {
  it("keeps message identity when adding an audio transcript", async () => {
    await withZtcRecordAudit({ source: "whatsapp-worker", actorId: "worker", messageId: "audio-message" }, async () => {
      await auditZtcMutation("received", async () => null);
      await withZtcRecordAudit({ source: "whatsapp-worker", inputText: "One piece" },
        () => auditZtcMutation("transcribed", async () => null));
    });
    const [first, second] = mockQuery.mock.calls.map((call) => JSON.parse(call[1]));
    expect(second).toEqual(expect.objectContaining({
      actorId: "worker", messageId: "audio-message", inputText: "One piece", correlationId: first.correlationId,
    }));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue([]);
    mockTransaction.mockImplementation((run) => run({ $queryRaw: mockQuery }));
  });

  it("sets transaction-local context before the write and returns its result", async () => {
    const mutate = jest.fn(async () => {
      expect(mockQuery).toHaveBeenCalledTimes(1);
      return { id: "record" };
    });
    const result = await withZtcRecordAudit(
      { source: "whatsapp-worker", actorId: "worker", messageId: "message" },
      () => auditZtcMutation("complete", mutate),
    );
    expect(result).toEqual({ id: "record" });
    expect(JSON.parse(mockQuery.mock.calls[0][1])).toEqual(
      expect.objectContaining({
        source: "whatsapp-worker",
        actorId: "worker",
        messageId: "message",
        step: "complete",
      }),
    );
    expect(mockQuery.mock.calls[0][0].join("?")).toContain(", true)");
  });

  it("isolates concurrent actors and uses one correlation id per message", async () => {
    await Promise.all(
      ["a", "b"].map((actorId) =>
        withZtcRecordAudit({ source: "whatsapp-worker", actorId }, async () => {
          await Promise.resolve();
          await auditZtcMutation("start", async () => null);
          await auditZtcMutation("finish", async () => null);
        }),
      ),
    );
    const events = mockQuery.mock.calls.map((call) => JSON.parse(call[1]));
    for (const actor of ["a", "b"]) {
      const rows = events.filter((event) => event.actorId === actor);
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((event) => event.correlationId)).size).toBe(1);
    }
    expect(new Set(events.map((event) => event.correlationId)).size).toBe(2);
    await auditZtcMutation("outside", async () => null);
    expect(JSON.parse(mockQuery.mock.calls[4][1]).actorId).toBeUndefined();
  });

  it("does not perform a write when audit context setup fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection failed"));
    const mutate = jest.fn();
    await expect(auditZtcMutation("save", mutate)).rejects.toThrow(
      "connection failed",
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("prevents new business writes after the ZTC fallback deadline", async () => {
    const mutate = jest.fn();
    await expect(withZtcMessageRecoveryContext({
      workerId: "worker", messageIds: ["message"], deadline: Date.now() + 10_000,
      stopped: true, awaitingBatch: false,
    }, () => auditZtcMutation("late_save", mutate))).rejects.toThrow("ZTC message processing deadline exceeded");
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("rechecks the deadline after waiting for the transaction context", async () => {
    const context = {
      workerId: "worker", messageIds: ["message"], deadline: Date.now() + 10_000,
      stopped: false, awaitingBatch: false,
    };
    mockQuery.mockImplementationOnce(async () => { context.stopped = true; return []; });
    const mutate = jest.fn();
    await expect(withZtcMessageRecoveryContext(context, () => auditZtcMutation("late_save", mutate)))
      .rejects.toThrow("ZTC message processing deadline exceeded");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("propagates write failures to the transaction instead of suppressing them", async () => {
    await expect(
      auditZtcMutation("save", async () => {
        throw new Error("save failed");
      }),
    ).rejects.toThrow("save failed");
  });

  it("records source text and message identity without storing credentials or phone numbers", () => {
    const form = new FormData();
    form.set("Body", "Papilddarbs 1 gab");
    form.set("MessageId", "message");
    form.set("From", "+37100000000");
    form.set("token", "secret");
    expect(ztcMessageAuditContext("whatsapp-worker", "worker", form)).toEqual({
      source: "whatsapp-worker",
      actorId: "worker",
      messageId: "message",
      inputText: "Papilddarbs 1 gab",
      details: { mediaCount: 0 },
    });
  });
});
