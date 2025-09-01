import { handleSiteManagerRoute } from "@/app/utils/Whatsapp/routes/siteManager";

jest.mock("@/app/utils/db", () => ({
  prisma: {
    sitediarysettings: { findUnique: jest.fn() },
  },
}));

jest.mock("@/app/utils/Whatsapp/shared/twillio", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/projectSelector", () => ({
  handleProjectSelector: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/handleImage", () => ({
  handleImage: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/handleAudio", () => ({
  handleAudio: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/handleText", () => ({
  handleText: jest.fn(),
}));

import { prisma } from "@/app/utils/db";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio";
import { handleProjectSelector } from "@/app/utils/Whatsapp/shared/projectSelector";
import { handleImage } from "@/app/utils/Whatsapp/shared/handleImage";
import { handleAudio } from "@/app/utils/Whatsapp/shared/handleAudio";
import { handleText } from "@/app/utils/Whatsapp/shared/handleText";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    fd.append(k, v);
  }
  return fd;
}

describe("handleSiteManagerRoute", () => {
  const mockUser = {
    id: "u1",
    firstName: "Slava",
    lastSelectedSiteIdforWhatsapp: "site1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should exit early if project selector handled", async () => {
    (handleProjectSelector as jest.Mock).mockResolvedValue(true);

    await handleSiteManagerRoute({
      from: "whatsapp:+371111",
      formData: makeFormData({ Body: "hi", NumMedia: "0" }),
      user: mockUser,
    });

    expect(handleProjectSelector).toHaveBeenCalled();
    expect(prisma.sitediarysettings.findUnique).not.toHaveBeenCalled();
  });

  it("should ask to select a project if no site selected", async () => {
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);

    await handleSiteManagerRoute({
      from: "whatsapp:+371111",
      formData: makeFormData({ Body: "hi", NumMedia: "0" }),
      user: { ...mockUser, lastSelectedSiteIdforWhatsapp: null },
    });

    expect(sendMessage).toHaveBeenCalledWith(
      "whatsapp:+371111",
      expect.stringContaining("Please first select a project")
    );
  });

  it("should send schema missing message if site has no schema", async () => {
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.sitediarysettings.findUnique as jest.Mock).mockResolvedValue(null);

    await handleSiteManagerRoute({
      from: "whatsapp:+371111",
      formData: makeFormData({ Body: "hi", NumMedia: "0" }),
      user: mockUser,
    });

    expect(sendMessage).toHaveBeenCalledWith(
      "whatsapp:+371111",
      expect.stringContaining("Please first upload site schema")
    );
  });

  it("should call handleImage if media exists", async () => {
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.sitediarysettings.findUnique as jest.Mock).mockResolvedValue({
      schema: "some-schema",
    });
    (handleImage as jest.Mock).mockResolvedValue(true);

    await handleSiteManagerRoute({
      from: "whatsapp:+371111",
      formData: makeFormData({ Body: "pic", NumMedia: "1" }),
      user: mockUser,
    });

    expect(handleImage).toHaveBeenCalled();
  });

  it("should fallback to handleAudio if handleImage returns false", async () => {
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.sitediarysettings.findUnique as jest.Mock).mockResolvedValue({
      schema: "some-schema",
    });
    (handleImage as jest.Mock).mockResolvedValue(false);
    (handleAudio as jest.Mock).mockResolvedValue(true);

    await handleSiteManagerRoute({
      from: "whatsapp:+371111",
      formData: makeFormData({ Body: "audio", NumMedia: "1" }),
      user: mockUser,
    });

    expect(handleAudio).toHaveBeenCalled();
  });

  it("should call handleText when no media", async () => {
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.sitediarysettings.findUnique as jest.Mock).mockResolvedValue({
      schema: "some-schema",
    });

    await handleSiteManagerRoute({
      from: "whatsapp:+371111",
      formData: makeFormData({ Body: "hello", NumMedia: "0" }),
      user: mockUser,
    });

    expect(handleText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "hello",
        to: "whatsapp:+371111",
      })
    );
  });
});
