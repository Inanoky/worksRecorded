const mockSendMessage = jest.fn();
const mockHandleProjectSelector = jest.fn();
const mockHandleImage = jest.fn();
const mockHandleAudio = jest.fn();
const mockHandleText = jest.fn();
const mockTalkToWhatsappAgent = jest.fn();
const mockFindSettings = jest.fn();

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/projectSelector", () => ({
  handleProjectSelector: (...args: unknown[]) => mockHandleProjectSelector(...args),
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
jest.mock("@/flows/default-construction/backend/site-manager-agent/agent", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockTalkToWhatsappAgent(...args),
}));
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
jest.mock("@/server/actions/META/RoutingHandlers/metaImageHandler", () => ({
  processMaterialDocumentImageFromPublicUrl: jest.fn().mockResolvedValue(false),
}));
jest.mock("@/flows/default-construction/backend/site-manager-acknowledgements", () => ({
  getRandomSiteManagerProcessingAcknowledgement: () => "Processing",
}));

import { handleSiteManagerRoute } from "./site-manager-route";

describe("default-construction site-manager image captions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleProjectSelector.mockResolvedValue(false);
    mockFindSettings.mockResolvedValue({ schema: { fields: [] } });
    mockHandleAudio.mockResolvedValue(false);
    mockHandleText.mockResolvedValue(undefined);
  });

  it("sends a saved image caption through the site-manager text agent path", async () => {
    mockHandleImage.mockImplementation(async (args: any) => {
      await args.onSavedImage({ body: "Pabeigta sienu montāža" });
      return true;
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
      "Processing",
    );
  });
});
