const mockUploadFiles = jest.fn();
const mockFetchWhatsAppMediaAsBuffer = jest.fn();
const mockSavePhoto = jest.fn();
const mockSendMessage = jest.fn();

jest.mock("uploadthing/server", () => ({
  UTApi: jest.fn().mockImplementation(() => ({ uploadFiles: mockUploadFiles })),
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => ({
  getString: (formData: FormData, key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : null;
  },
  fetchWhatsAppMediaAsBuffer: (...args: unknown[]) =>
    mockFetchWhatsAppMediaAsBuffer(...args),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
  savePhoto: (...args: unknown[]) => mockSavePhoto(...args),
}));

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

import { handleImage } from "./handleImage";

describe("handleImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchWhatsAppMediaAsBuffer.mockResolvedValue(Buffer.from("image"));
    mockUploadFiles.mockResolvedValue({
      data: { ufsUrl: "https://cdn.example.com/photo.jpg" },
    });
    mockSavePhoto.mockResolvedValue({ id: "photo-1" });
  });

  it("returns the saved photo so the caller can process its caption", async () => {
    const formData = new FormData();
    formData.set("MediaUrl0", "https://meta.example.com/image");
    formData.set("MediaContentType0", "image/jpeg");
    await expect(
      handleImage({
        formData,
        numMedia: 1,
        siteId: "site-1",
        userId: "user-1",
        to: "whatsapp:+37100000000",
        body: "Pabeigta sienu montāža",
        photographerName: "Site Manager",
        acknowledgeSavedPhoto: false,
      }),
    ).resolves.toEqual({
      outcome: "photo_saved",
      savedPhoto: { id: "photo-1" },
    });

    expect(mockSavePhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: "Site Manager : Pabeigta sienu montāža",
        siteId: "site-1",
        userId: "user-1",
      }),
    );
    expect(mockSendMessage).not.toHaveBeenCalledWith(
      "whatsapp:+37100000000",
      "✅",
    );
  });

  it("keeps the existing checkmark acknowledgement without a post-save handler", async () => {
    const formData = new FormData();
    formData.set("MediaUrl0", "https://meta.example.com/image");
    formData.set("MediaContentType0", "image/jpeg");

    await handleImage({
      formData,
      numMedia: 1,
      siteId: "site-1",
      userId: "user-1",
      to: "whatsapp:+37100000000",
      body: "",
    });

    expect(mockSendMessage).toHaveBeenCalledWith("whatsapp:+37100000000", "✅");
  });
});
