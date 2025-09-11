import { handleProjectManagerRoute } from "@/app/utils/Whatsapp/routes/projectManager";

// 🔧 Mocks
jest.mock("@/app/utils/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/app/utils/Whatsapp/shared/twillio", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/helpers", () => ({
  getString: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/projectSelector", () => ({
  handleProjectSelector: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/handleAudio", () => ({
  handleAudio: jest.fn(),
}));

jest.mock("@/app/utils/Whatsapp/shared/handleText", () => ({
  handleText: jest.fn(),
}));

jest.mock("@/components/AI/ProjectDiary/agent", () => jest.fn());

import { prisma } from "@/app/utils/db";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio";
import { getString } from "@/app/utils/Whatsapp/shared/helpers";
import { handleProjectSelector } from "@/app/utils/Whatsapp/shared/projectSelector";
import { handleAudio } from "@/app/utils/Whatsapp/shared/handleAudio";
import { handleText } from "@/app/utils/Whatsapp/shared/handleText";
import talkToProjectDiaryAgent from "@/componentsFrontend/AI/ProjectDiary/agent";

describe("handleProjectManagerRoute", () => {
  const mockUser = { id: "u1", firstName: "Slava" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should exit early if handleProjectSelector returns true", async () => {
    (getString as jest.Mock).mockReturnValueOnce("body");
    (handleProjectSelector as jest.Mock).mockResolvedValue(true);

    await handleProjectManagerRoute({ from: "whatsapp:+371111", formData: {} as any, user: mockUser });

    expect(handleProjectSelector).toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(handleAudio).not.toHaveBeenCalled();
    expect(handleText).not.toHaveBeenCalled();
  });

  it("should call handleAudio when NumMedia > 0 and it returns true", async () => {
    (getString as jest.Mock)
      .mockReturnValueOnce("some text") // Body
      .mockReturnValueOnce("1");        // NumMedia
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ lastSelectedSiteIdforWhatsapp: "site1" });
    (handleAudio as jest.Mock).mockResolvedValue(true);

    await handleProjectManagerRoute({ from: "whatsapp:+371111", formData: {} as any, user: mockUser });

    expect(handleAudio).toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("should send default message if handleAudio returns false", async () => {
    (getString as jest.Mock)
      .mockReturnValueOnce("some text")
      .mockReturnValueOnce("1");
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ lastSelectedSiteIdforWhatsapp: "site1" });
    (handleAudio as jest.Mock).mockResolvedValue(false);

    await handleProjectManagerRoute({ from: "whatsapp:+371111", formData: {} as any, user: mockUser });

    expect(sendMessage).toHaveBeenCalledWith("whatsapp:+371111", "Received your message!");
  });

  it("should call handleText when no media is attached", async () => {
    (getString as jest.Mock)
      .mockReturnValueOnce("hello world") // Body
      .mockReturnValueOnce("0");          // NumMedia
    (handleProjectSelector as jest.Mock).mockResolvedValue(false);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ lastSelectedSiteIdforWhatsapp: "site1" });

    await handleProjectManagerRoute({ from: "whatsapp:+371111", formData: {} as any, user: mockUser });

    expect(handleText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "hello world",
        user: mockUser,
        to: "whatsapp:+371111",
      })
    );
  });
});
