import { handleProjectSelector } from "@/app/utils/Whatsapp/shared/projectSelector";


// 🔧 Mock prisma and sendMessage
jest.mock("@/app/utils/db", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));
jest.mock("@/app/utils/Whatsapp/shared/twillio", () => ({
  sendMessage: jest.fn(),
}));

import { prisma } from "@/app/utils/db";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio"

const mockUser = {
  id: "user-123",
  firstName: "Slava",
  Site: [
    { id: "site-1", name: "Strelnieku 4C" },
    { id: "site-2", name: "Mitau Prefab" },
  ],
  lastSelectedSiteIdforWhatsapp: null,
};

describe("handleProjectSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should clear selection when user sends 'change'", async () => {
    const result = await handleProjectSelector({
      user: { ...mockUser, lastSelectedSiteIdforWhatsapp: "site-1" },
      body: "change",
      to: "whatsapp:+371111111",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { lastSelectedSiteIdforWhatsapp: null },
    });
    expect(sendMessage).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should select valid project number", async () => {
    const result = await handleProjectSelector({
      user: mockUser,
      body: "2",
      to: "whatsapp:+371111111",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { lastSelectedSiteIdforWhatsapp: "site-2" },
    });
    expect(sendMessage).toHaveBeenCalledWith(
      "whatsapp:+371111111",
      expect.stringContaining("Mitau Prefab")
    );
    expect(result).toBe(true);
  });

  it("should send project list on invalid selection", async () => {
    const result = await handleProjectSelector({
      user: mockUser,
      body: "99",
      to: "whatsapp:+371111111",
    });

    expect(sendMessage).toHaveBeenCalledWith(
      "whatsapp:+371111111",
      expect.stringContaining("Hi Slava!")
    );
    expect(result).toBe(true);
  });

  it("should return false if user already has a project selected", async () => {
    const result = await handleProjectSelector({
      user: { ...mockUser, lastSelectedSiteIdforWhatsapp: "site-1" },
      body: "hello",
      to: "whatsapp:+371111111",
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
