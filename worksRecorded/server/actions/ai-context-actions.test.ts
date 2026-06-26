const revalidatePathMock = jest.fn();
const notFoundMock = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

jest.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    workers: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    site: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock("@/lib/utils/requireUser", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/server/actions/shared-actions", () => ({
  orgCheck: jest.fn(),
}));

import { buildAiContextThreadCandidates } from "@/server/ai-flows/ai-context-thread-candidates";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { getDashboardAiContextInspection } from "./ai-context-actions";

describe("AI context diagnostics helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_CONTEXT_ALLOWED_USER_IDS = "user-1";
    process.env.SUPERADMIN = "super-1";
  });

  it("builds dashboard, WhatsApp, specialist, and worker checkpoint thread candidates", () => {
    const candidates = buildAiContextThreadCandidates("site-1", "user-1", [
      {
        id: "worker-1",
        name: "Janis",
        surname: "Berzins",
        phone: "+37111111111",
      },
      {
        id: "worker-2",
        name: null,
        surname: null,
        phone: "+37122222222",
      },
      {
        id: "worker-3",
        name: null,
        surname: null,
        phone: null,
      },
    ]);

    expect(candidates).toMatchObject([
      {
        id: "orchestrating-agent-v2:site-1:user-1",
        label: "Dashboard generic chat",
        flowName: "dashboard-chat",
        flow: "Dashboard chat",
        owner: "Current user",
        resettable: true,
        contextPolicy: {
          label: "Dashboard chat",
          memoryScope: "user-site",
          toolMode: "write-capable",
        },
      },
      {
        id: "siteManager:site-1:user-1",
        label: "WhatsApp site manager",
        flowName: "whatsapp-site-manager",
        flow: "WhatsApp site manager",
        owner: "Current user",
        resettable: true,
        contextPolicy: {
          memoryScope: "user-site",
          toolMode: "write-capable",
        },
      },
      {
        id: "site-1_SiteDiaryAgent",
        label: "Site diary read agent",
        flowName: "site-diary-agent",
        flow: "Specialist read agent",
        owner: "Project",
        resettable: true,
        contextPolicy: {
          memoryScope: "project",
          toolMode: "read-only",
        },
      },
      {
        id: "site-1_Timesheets-agent",
        label: "Timesheets read agent",
        flowName: "timesheets-agent",
        flow: "Specialist read agent",
        owner: "Project",
        resettable: true,
        contextPolicy: {
          memoryScope: "project",
          toolMode: "read-only",
        },
      },
      {
        id: "site-1_BisMaterialsAgent",
        label: "BIS materials read agent",
        flowName: "bis-materials-agent",
        flow: "Specialist read agent",
        owner: "Project",
        resettable: true,
        contextPolicy: {
          memoryScope: "project",
          toolMode: "read-only",
        },
      },
      {
        id: "worker-1",
        label: "Janis Berzins",
        flowName: "whatsapp-worker",
        flow: "WhatsApp worker",
        owner: "Worker",
        resettable: true,
        contextPolicy: {
          memoryScope: "worker",
          toolMode: "write-capable",
        },
      },
      {
        id: "worker-2",
        label: "+37122222222",
        flowName: "whatsapp-worker",
        flow: "WhatsApp worker",
        owner: "Worker",
        resettable: true,
        contextPolicy: {
          memoryScope: "worker",
          toolMode: "write-capable",
        },
      },
      {
        id: "worker-3",
        label: "worker-3",
        flowName: "whatsapp-worker",
        flow: "WhatsApp worker",
        owner: "Worker",
        resettable: true,
        contextPolicy: {
          memoryScope: "worker",
          toolMode: "write-capable",
        },
      },
    ]);
    expect(candidates.every((candidate) => candidate.contextPolicy.flow === candidate.flowName)).toBe(
      true,
    );
  });

  it("rejects unknown dashboard inspection thread IDs", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });
    (orgCheck as jest.Mock).mockResolvedValue({ id: "site-1", name: "Site 1" });
    (prisma.workers.findMany as jest.Mock).mockResolvedValue([]);

    await expect(getDashboardAiContextInspection("site-1", "unknown-thread")).rejects.toThrow(
      "This dashboard checkpoint thread is not inspectable for the current project.",
    );
  });

  it("returns dashboard context inspection data for the allowed dashboard thread", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });
    (orgCheck as jest.Mock).mockResolvedValue({ id: "site-1", name: "Site 1" });
    (prisma.workers.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([
        {
          threadId: "orchestrating-agent-v2:site-1:user-1",
          checkpointCount: 1,
          writeCount: 2,
          blobCount: 3,
          latestCheckpointId: "checkpoint-1",
          latestCheckpointTs: "2026-06-25T00:00:00.000Z",
          latestMetadata: {
            questionPreview: "Summarize today",
            promptChars: 120,
            attachmentCount: 0,
            nativeAttachmentCount: 0,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          checkpointId: "checkpoint-1",
          checkpointTs: "2026-06-25T00:00:00.000Z",
          metadata: {
            questionPreview: "Summarize today",
            promptChars: 120,
            attachmentCount: 0,
            nativeAttachmentCount: 0,
          },
          checkpoint: {
            channel_values: {
              messages: [
                { type: "system", content: "system" },
                { type: "human", content: "Summarize today" },
              ],
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          writeCount: 2,
          writeBytes: 1000,
          largestWriteBytes: 700,
        },
      ]);

    const inspection = await getDashboardAiContextInspection(
      "site-1",
      "orchestrating-agent-v2:site-1:user-1",
    );

    expect(inspection).toEqual(
      expect.objectContaining({
        threadId: "orchestrating-agent-v2:site-1:user-1",
        flowName: "dashboard-chat",
        checkpointCount: 1,
        writeCount: 2,
        blobCount: 3,
        latestCheckpointId: "checkpoint-1",
        layers: expect.arrayContaining([
          expect.objectContaining({ id: "system-prompt" }),
          expect.objectContaining({ id: "checkpoint-memory", count: 2 }),
          expect.objectContaining({ id: "tool-writes", chars: 1000 }),
        ]),
      }),
    );
    expect(JSON.stringify(inspection)).not.toContain("Summarize today</script>");
  });
});
