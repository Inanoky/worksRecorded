const mockSendMessage = jest.fn();
const mockHandleProjectSelector = jest.fn();
const mockHandleImage = jest.fn();
const mockHandleAudio = jest.fn();
const mockHandleText = jest.fn();
const mockTalkToWhatsappAgent = jest.fn();
const mockFindSettings = jest.fn();
const mockGetOrganizationLanguageByUserId = jest.fn();
const mockGetProcessingAcknowledgement = jest.fn(
  (language?: string) => `Processing:${language ?? "missing"}`,
);
const mockGetPhotoSaveSummary = jest.fn(
  (savedCount: number, totalCount: number, language?: string) =>
    `Saved:${savedCount}/${totalCount}:${language ?? "missing"}`,
);

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/projectSelector", () => ({
  handleProjectSelector: (...args: unknown[]) =>
    mockHandleProjectSelector(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/handleImage", () => ({
  handleImage: (...args: unknown[]) => mockHandleImage(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/handleAudio", () => ({
  handleAudio: (...args: unknown[]) => mockHandleAudio(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/handleText", () => ({
  handleText: (...args: unknown[]) => mockHandleText(...args),
}));
jest.mock(
  "@/flows/default-construction/backend/site-manager-agent/agent",
  () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockTalkToWhatsappAgent(...args),
  }),
);
jest.mock("@/lib/utils/db", () => ({
  prisma: {
    sitediarysettings: {
      findUnique: (...args: unknown[]) => mockFindSettings(...args),
    },
  },
}));
jest.mock("@/server/actions/whatsapp-actions", () => ({
  getUserFirstNameById: jest.fn().mockResolvedValue("Anna"),
}));
jest.mock("@/server/actions/shared-actions", () => ({
  getOrganizationLanguageByUserId: (...args: unknown[]) =>
    mockGetOrganizationLanguageByUserId(...args),
}));
jest.mock("@/server/actions/META/RoutingHandlers/metaImageHandler", () => ({
  processMaterialDocumentImageFromPublicUrl: jest.fn().mockResolvedValue(false),
}));
jest.mock(
  "@/flows/default-construction/backend/site-manager-acknowledgements",
  () => ({
    getRandomSiteManagerProcessingAcknowledgement: (language?: string) =>
      mockGetProcessingAcknowledgement(language),
    getSiteManagerPhotoSaveSummary: (
      savedCount: number,
      totalCount: number,
      language?: string,
    ) => mockGetPhotoSaveSummary(savedCount, totalCount, language),
  }),
);

import { handleSiteManagerRoute } from "./site-manager-route";
import { getSiteManagerAgentRunContext } from "./site-manager-agent/runContext";

describe("default-construction site-manager image captions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleProjectSelector.mockResolvedValue(false);
    mockFindSettings.mockResolvedValue({ schema: { fields: [] } });
    mockHandleAudio.mockResolvedValue(false);
    mockHandleText.mockResolvedValue(true);
    mockGetOrganizationLanguageByUserId.mockResolvedValue("en");
  });

  it("sends a saved image caption through the site-manager text agent path", async () => {
    mockHandleImage.mockResolvedValue({
      outcome: "photo_saved",
      savedPhoto: { id: "photo-1" },
    });
    const formData = new FormData();
    formData.set("Body", "Pabeigta sienu montāža");
    formData.set("NumMedia", "1");
    formData.set("MediaContentType0", "image/jpeg");
    const user = {
      id: "user-1",
      phone: "37100000000",
      firstName: "Anna",
      lastName: "Bērziņa",
      lastSelectedSiteIdforWhatsapp: "site-1",
    };

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user,
    });

    expect(mockHandleImage).toHaveBeenCalledWith(
      expect.objectContaining({ acknowledgeSavedPhoto: false }),
    );
    expect(mockHandleText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Pabeigta sienu montāža",
        user,
        to: "whatsapp:+37100000000",
        agent: expect.any(Function),
      }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "Processing:en",
    );
    expect(mockGetOrganizationLanguageByUserId).toHaveBeenCalledWith("user-1");
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "✅",
    );
  });

  it("runs the site-manager agent with sender trace context", async () => {
    mockHandleImage.mockResolvedValue(false);
    mockHandleText.mockImplementationOnce(async ({ body, user, agent }) => {
      await agent(body, user.lastSelectedSiteIdforWhatsapp, user.id);
      return true;
    });
    mockTalkToWhatsappAgent.mockImplementationOnce(async () => {
      expect(getSiteManagerAgentRunContext()).toEqual(
        expect.objectContaining({
          senderName: "Anna Bērziņa",
          senderInitials: "AB",
          senderLabel: "Anna Bērziņa",
        }),
      );
      return "Saglabāts";
    });

    const formData = new FormData();
    formData.set("Body", "Pabeigta sienu montāža");
    formData.set("NumMedia", "0");

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user: {
        id: "user-1",
        firstName: "Anna",
        lastName: "Bērziņa",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    });

    expect(mockTalkToWhatsappAgent).toHaveBeenCalledWith(
      "Pabeigta sienu montāža",
      "site-1",
      "user-1",
      undefined,
    );
  });

  it("uses the organization's Latvian language for text acknowledgements", async () => {
    mockGetOrganizationLanguageByUserId.mockResolvedValue("lv");
    const formData = new FormData();
    formData.set("Body", "Pabeigta sienu montāža");
    formData.set("NumMedia", "0");

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user: {
        id: "user-1",
        firstName: "Anna",
        lastName: "Bērziņa",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    });

    expect(mockGetOrganizationLanguageByUserId).toHaveBeenCalledWith("user-1");
    expect(mockGetProcessingAcknowledgement).toHaveBeenCalledWith("lv");
    expect(mockSendMessage).toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "Processing:lv",
    );
  });

  it("acknowledges a saved image without a caption without invoking the agent", async () => {
    mockHandleImage.mockResolvedValue({
      outcome: "photo_saved",
      savedPhoto: { id: "photo-1" },
    });
    const formData = new FormData();
    formData.set("Body", "");
    formData.set("NumMedia", "1");
    formData.set("MediaContentType0", "image/jpeg");

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user: {
        id: "user-1",
        firstName: "Anna",
        lastName: "Bērziņa",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    });

    expect(mockHandleText).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith("whatsapp:+37100000000", "✅");
  });

  it("saves a collected image batch and sends one localized count", async () => {
    mockHandleImage
      .mockResolvedValueOnce({
        outcome: "photo_saved",
        savedPhoto: { id: "photo-1" },
      })
      .mockResolvedValueOnce({
        outcome: "photo_saved",
        savedPhoto: { id: "photo-2" },
      })
      .mockResolvedValueOnce({
        outcome: "photo_saved",
        savedPhoto: { id: "photo-3" },
      });
    mockGetOrganizationLanguageByUserId.mockResolvedValue("lv");

    const formData = new FormData();
    formData.set("Body", "Otrā stāva sienas");
    formData.set("NumMedia", "3");
    formData.set("MetaBatchSize", "3");
    for (let index = 0; index < 3; index += 1) {
      formData.set(`MediaUrl${index}`, `https://meta.example.com/${index}`);
      formData.set(`MediaContentType${index}`, "image/jpeg");
      formData.set(`MediaMessageId${index}`, `message-${index}`);
      formData.set(`MediaBody${index}`, "");
    }
    formData.set("MediaBody1", "Otrā stāva sienas");

    const user = {
      id: "user-1",
      phone: "37100000000",
      firstName: "Anna",
      lastName: "Bērziņa",
      lastSelectedSiteIdforWhatsapp: "site-1",
    };

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user,
    });

    expect(mockHandleImage).toHaveBeenCalledTimes(3);
    expect(mockHandleImage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ imageIndex: 0, body: "" }),
    );
    expect(mockHandleImage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ imageIndex: 1, body: "Otrā stāva sienas" }),
    );
    expect(mockHandleImage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ imageIndex: 2, body: "" }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "Saved:3/3:lv",
    );
    expect(mockHandleText).toHaveBeenCalledTimes(1);
    expect(mockHandleText).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Otrā stāva sienas" }),
    );
  });

  it("does not send a photo save summary for a material-only image batch", async () => {
    mockHandleImage
      .mockResolvedValueOnce({ outcome: "handled_after_upload" })
      .mockResolvedValueOnce({ outcome: "handled_after_upload" });
    mockGetOrganizationLanguageByUserId.mockResolvedValue("lv");

    const formData = new FormData();
    formData.set("Body", "Rēķini");
    formData.set("NumMedia", "2");
    formData.set("MetaBatchSize", "2");
    for (let index = 0; index < 2; index += 1) {
      formData.set(`MediaUrl${index}`, `https://meta.example.com/invoice-${index}`);
      formData.set(`MediaContentType${index}`, "image/jpeg");
      formData.set(`MediaMessageId${index}`, `invoice-message-${index}`);
      formData.set(`MediaBody${index}`, "");
    }

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user: {
        id: "user-1",
        phone: "37100000000",
        firstName: "Anna",
        lastName: "Bērziņa",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    });

    expect(mockHandleImage).toHaveBeenCalledTimes(2);
    expect(mockGetPhotoSaveSummary).not.toHaveBeenCalled();
    expect(mockHandleText).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      expect.stringContaining("Saved:"),
    );
  });

  it("excludes handled material documents from a mixed image batch photo summary", async () => {
    mockHandleImage
      .mockResolvedValueOnce({
        outcome: "photo_saved",
        savedPhoto: { id: "photo-1" },
      })
      .mockResolvedValueOnce({ outcome: "handled_after_upload" })
      .mockResolvedValueOnce({
        outcome: "photo_saved",
        savedPhoto: { id: "photo-2" },
      });
    mockGetOrganizationLanguageByUserId.mockResolvedValue("lv");

    const formData = new FormData();
    formData.set("Body", "Otrā stāva sienas");
    formData.set("NumMedia", "3");
    formData.set("MetaBatchSize", "3");
    for (let index = 0; index < 3; index += 1) {
      formData.set(`MediaUrl${index}`, `https://meta.example.com/mixed-${index}`);
      formData.set(`MediaContentType${index}`, "image/jpeg");
      formData.set(`MediaMessageId${index}`, `mixed-message-${index}`);
      formData.set(`MediaBody${index}`, "");
    }
    formData.set("MediaBody0", "Otrā stāva sienas");
    formData.set("MediaBody2", "Trešā stāva griesti");

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user: {
        id: "user-1",
        phone: "37100000000",
        firstName: "Anna",
        lastName: "Bērziņa",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "Saved:2/2:lv",
    );
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "Saved:2/3:lv",
    );
    expect(mockHandleText).toHaveBeenCalledTimes(2);
    expect(mockHandleText).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ body: "Otrā stāva sienas" }),
    );
    expect(mockHandleText).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ body: "Trešā stāva griesti" }),
    );
  });

  it("does not send a material document caption to the site diary agent", async () => {
    mockHandleImage.mockResolvedValue({ outcome: "handled_after_upload" });
    const formData = new FormData();
    formData.set("Body", "Invoice 123");
    formData.set("NumMedia", "1");
    formData.set("MediaContentType0", "image/jpeg");

    await handleSiteManagerRoute({
      from: "whatsapp:+37100000000",
      formData,
      user: {
        id: "user-1",
        firstName: "Anna",
        lastName: "Bērziņa",
        lastSelectedSiteIdforWhatsapp: "site-1",
      },
    });

    expect(mockHandleText).not.toHaveBeenCalled();
  });
});
