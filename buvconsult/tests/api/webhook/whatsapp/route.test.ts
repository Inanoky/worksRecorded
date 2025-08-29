import { POST } from "@/app/api/webhook/whatsapp/route"; // adjust to match your file
import * as db from "@/app/utils/db";
import * as helpers from "@/app/utils/Whatsapp/shared/helpers";
import * as twillio from "@/app/utils/Whatsapp/shared/twillio";
import * as workerRoute from "@/app/utils/Whatsapp/routes/worker";
import * as projectManagerRoute from "@/app/utils/Whatsapp/routes/projectManager";
import * as siteManagerRoute from "@/app/utils/Whatsapp/routes/siteManager";

// --- Mocks ---
jest.mock("@/app/utils/db", () => ({
  prisma: {
    workers: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}));

jest.mock("@/app/utils/Whatsapp/shared/helpers", () => ({
  getString: jest.fn(),
  normalizePhone: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/twillio", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/routes/worker", () => ({
  handleWorkerRoute: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/routes/projectManager", () => ({
  handleProjectManagerRoute: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/routes/siteManager", () => ({
  handleSiteManagerRoute: jest.fn(),
}));

const { prisma } = db as any;
const { getString, normalizePhone } = helpers as any;
const { sendMessage } = twillio as any;
const { handleWorkerRoute } = workerRoute as any;
const { handleProjectManagerRoute } = projectManagerRoute as any;
const { handleSiteManagerRoute } = siteManagerRoute as any;

// Helper to build fake FormData
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    fd.append(k, v);
  }
  return fd;
}

describe("dispatch orchestration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should skip when SmsStatus != received", async () => {
    (getString as jest.Mock).mockImplementation((fd, key) =>
      key === "SmsStatus" ? "delivered" : null
    );

    const res = await POST(new Request("http://localhost", { method: "POST", body: makeFormData({}) }));
    expect(res.status).toBe(200);
    expect(handleWorkerRoute).not.toHaveBeenCalled();
    expect(handleProjectManagerRoute).not.toHaveBeenCalled();
    expect(handleSiteManagerRoute).not.toHaveBeenCalled();
  });

  it("should route to worker if worker exists", async () => {
    (getString as jest.Mock).mockReturnValue("received");
    (normalizePhone as jest.Mock).mockResolvedValue("123");
    prisma.workers.findFirst.mockResolvedValue({ id: "w1" });

    await POST(new Request("http://localhost", { method: "POST", body: makeFormData({ SmsStatus: "received" }) }));

    expect(handleWorkerRoute).toHaveBeenCalled();
  });

  it("should reject if no user found", async () => {
    (getString as jest.Mock).mockReturnValue("received");
    (normalizePhone as jest.Mock).mockResolvedValue("123");
    prisma.workers.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);

    await POST(new Request("http://localhost", { method: "POST", body: makeFormData({ SmsStatus: "received" }) }));

    expect(sendMessage).toHaveBeenCalledWith(
  expect.anything(),
  expect.stringContaining("not registered")
);
  });

  it("should route to project manager when role = project manager", async () => {
    (getString as jest.Mock).mockReturnValue("received");
    (normalizePhone as jest.Mock).mockResolvedValue("123");
    prisma.workers.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: "u1", role: "project manager", Site: [] });

    await POST(new Request("http://localhost", { method: "POST", body: makeFormData({ SmsStatus: "received" }) }));

    expect(handleProjectManagerRoute).toHaveBeenCalled();
  });

  it("should route to site manager by default", async () => {
    (getString as jest.Mock).mockReturnValue("received");
    (normalizePhone as jest.Mock).mockResolvedValue("123");
    prisma.workers.findFirst.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: "u1", role: "site manager", Site: [] });

    await POST(new Request("http://localhost", { method: "POST", body: makeFormData({ SmsStatus: "received" }) }));

    expect(handleSiteManagerRoute).toHaveBeenCalled();
  });
});
