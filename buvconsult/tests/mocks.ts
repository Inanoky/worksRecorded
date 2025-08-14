// test/mocks.ts
// 1) next/server.after → run immediately
jest.mock("next/server", () => ({
  after: (fn: Function) => fn(),
}));

// 2) Prisma - Expanded to include all needed methods
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  site: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  post: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  invoiceItems: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  documents: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
};
jest.mock("@/app/utils/db", () => ({ prisma: mockPrisma }));

// 3) Twilio
const mockCreate = jest.fn();
const mockTwilioClient = { messages: { create: mockCreate } };
jest.mock("twilio", () => () => mockTwilioClient);

// 4) UploadThing
const mockUploadFiles = jest.fn();
jest.mock("uploadthing/server", () => ({
  UTApi: function UTApi() {
    return { uploadFiles: mockUploadFiles };
  },
}));

// 5) OpenAI (only if you hit audio flow in tests)
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: function OpenAI() {
      return {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue({ text: "transcribed text" }),
          },
        },
      };
    },
    toFile: async (buf: Buffer, name: string) => new File([buf], name),
  };
});

// 6) AI agent
const mockTalkToWhatsappAgent = jest.fn();
jest.mock("@/components/AI/Whatsapp/agent", () => ({
  __esModule: true,
  default: (...args: any[]) => mockTalkToWhatsappAgent(...args),
}));

// 7) Photo save
const mockSavePhoto = jest.fn();
jest.mock("@/app/photoActions", () => ({
  savePhoto: (...args: any[]) => mockSavePhoto(...args),
}));

export {
  mockPrisma,
  mockCreate,
  mockUploadFiles,
  mockTalkToWhatsappAgent,
  mockSavePhoto,
  mockTwilioClient,
};
