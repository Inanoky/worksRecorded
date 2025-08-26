// tests/server-actions.test.ts
import {
  CreateSiteAction,
  CreatePostAction,
  EditPostActions,
  DeletePost,
  UpdateImage,
  DeleteSite,
  CreateSubscription,
  saveInvoiceToDB,
  GetInvoicesFromDB,
  GetInvoiceItemsFromDB,
  deleteInvoice,
  updateInvoice,
  bulkSetIsInvoice,
  updateInvoiceItem,
  deleteInvoiceItem,
  askInvoiceGpt,
  updateSiteAction,
  getProjectNameBySiteId,
  saveDocumentsToDB,
  GetDocumentsFromDB,
  deleteDocuments,
  updateDocuments
} from "@/app/actions/actions";
import { mockPrisma } from "@/tests/mocks";
import { redirect } from "next/navigation";

// 1. Define all mock functions first
const mockGptResponse = jest.fn().mockResolvedValue(JSON.stringify({
  items: [{
    invoiceNumber: "INV-001",
    sellerName: "Test Seller",
    items: [{ item: "Test Item", quantity: 1 }]
  }]
}));

const mockGptDocumentsResponse = jest.fn().mockResolvedValue(JSON.stringify({
  title: "Test Document",
  content: "Test Content"
}));

const mockLoadEmbeddings = jest.fn().mockResolvedValue(true);

// 2. Set up all the mocks
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: { content: "GPT response" }
          }]
        })
      }
    }
  }))
}));

jest.mock("@/components/AI/SQL/ExtractorGptForInvoices", () => ({
  __esModule: true,
  default: mockGptResponse
}));

jest.mock("@/components/AI/RAG/ExtractorGptForDocuments", () => ({
  __esModule: true,
  default: mockGptDocumentsResponse
}));

jest.mock("@/components/AI/RAG/loadEmbeddings", () => ({
  __esModule: true,
  LoadEmbeddings: mockLoadEmbeddings
}));

jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          records: {
            "doc-1": {
              metadata: { chunkCount: 3 }
            }
          }
        }),
        deleteMany: jest.fn()
      })
    })
  }))
}));

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: "cust_123" })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: "https://stripe.com/checkout" })
      }
    }
  }))
}));

describe("Server Actions", () => {
  function createFormData(data: Record<string, any>) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    return formData;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      customerId: null,
      email: "test@example.com",
      firstName: "Test"
    });

    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.site.findMany.mockResolvedValue([]);
    mockPrisma.site.create.mockResolvedValue({});
    mockPrisma.post.create.mockResolvedValue({});
    mockPrisma.invoices.create.mockResolvedValue({ id: "inv-1" });
    mockPrisma.invoiceItems.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.documents.create.mockResolvedValue({ id: "doc-1" });
    mockPrisma.site.findUnique.mockResolvedValue({ name: "Test Site" });
  });

  describe("Site Actions", () => {
    test("CreateSiteAction - creates site when user has no subscription but no sites", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.site.findMany.mockResolvedValue([]);

      const formData = createFormData({
        name: "Test Site",
        description: "Test Description",
        subdirectory: "test-site"
      });

      await CreateSiteAction({}, formData);

      expect(mockPrisma.site.create).toHaveBeenCalledWith({
        data: {
          description: "Test Description",
          name: "Test Site",
          subdirectory: "test-site",
          userId: "user-1"
        }
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/sites");
    });

    test("CreateSiteAction - redirects to pricing when user has no subscription but already has a site", async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.site.findMany.mockResolvedValue([{ id: "site-1" }]);

      const formData = createFormData({
        name: "Test Site",
        description: "Test Description",
        subdirectory: "test-site"
      });

      await CreateSiteAction({}, formData);

      expect(redirect).toHaveBeenCalledWith("/dashboard/pricing");
    });

    test("DeleteSite - deletes site", async () => {
      const formData = createFormData({
        siteId: "site-1"
      });

      await DeleteSite(formData);

      expect(mockPrisma.site.delete).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          id: "site-1"
        }
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/sites");
    });

    test("updateSiteAction - updates site", async () => {
      const formData = createFormData({
        siteId: "site-1",
        name: "Updated Site",
        description: "Updated Description",
        subdirectory: "updated-site"
      });

      await updateSiteAction(formData);

      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: "site-1" },
        data: {
          name: "Updated Site",
          description: "Updated Description",
          subdirectory: "updated-site"
        }
      });
    });

    test("getProjectNameBySiteId - returns site name", async () => {
      mockPrisma.site.findUnique.mockResolvedValue({
        name: "Test Site"
      });

      const result = await getProjectNameBySiteId("site-1");
      expect(result).toBe("Test Site");
    });
  });

  describe("Post Actions", () => {
    test("CreatePostAction - creates post", async () => {
      const formData = createFormData({
        title: "Test Post",
        smallDescription: "Test Description",
        slug: "test-post",
        articleContent: JSON.stringify({ blocks: [] }),
        coverImage: "image.jpg",
        siteId: "site-1"
      });

      await CreatePostAction({}, formData);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: {
          title: "Test Post",
          smallDescription: "Test Description",
          slug: "test-post",
          articleContent: { blocks: [] },
          image: "image.jpg",
          userId: "user-1",
          siteId: "site-1"
        }
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/sites/site-1");
    });

    test("EditPostActions - updates post", async () => {
      const formData = createFormData({
        title: "Updated Post",
        smallDescription: "Updated Description",
        slug: "updated-post",
        articleContent: JSON.stringify({ blocks: [] }),
        coverImage: "updated.jpg",
        siteId: "site-1",
        articleId: "post-1"
      });

      await EditPostActions({}, formData);

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          id: "post-1"
        },
        data: {
          title: "Updated Post",
          smallDescription: "Updated Description",
          slug: "updated-post",
          articleContent: { blocks: [] },
          image: "updated.jpg"
        }
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/sites/site-1");
    });

    test("DeletePost - deletes post", async () => {
      const formData = createFormData({
        articleId: "post-1",
        siteId: "site-1"
      });

      await DeletePost(formData);

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          id: "post-1"
        }
      });
      expect(redirect).toHaveBeenCalledWith("/dashboard/sites/site-1");
    });
  });

  describe("Invoice Actions", () => {
    test("saveInvoiceToDB - saves invoices and items", async () => {
      const formData = createFormData({
        siteId: "site-1",
        fileUrls: ["url1", "url2"]
      });

      await saveInvoiceToDB({}, formData);

      expect(mockGptResponse).toHaveBeenCalledTimes(2);
      expect(mockPrisma.invoices.create).toHaveBeenCalled();
      expect(mockPrisma.invoiceItems.createMany).toHaveBeenCalled();
    });

    test("GetInvoicesFromDB - retrieves invoices", async () => {
      mockPrisma.invoices.findMany.mockResolvedValue([{ id: "inv-1" }]);
      
      const result = await GetInvoicesFromDB("site-1");
      expect(result).toEqual([{ id: "inv-1" }]);
    });

    test("GetInvoiceItemsFromDB - retrieves invoice items", async () => {
      mockPrisma.invoiceItems.findMany.mockResolvedValue([{ id: "item-1" }]);
      
      const result = await GetInvoiceItemsFromDB("site-1");
      expect(result).toEqual([{ id: "item-1" }]);
    });

    test("deleteInvoice - deletes invoice", async () => {
      await deleteInvoice("inv-1");
      expect(mockPrisma.invoices.delete).toHaveBeenCalledWith({
        where: { id: "inv-1" }
      });
    });

    test("askInvoiceGpt - returns GPT response", async () => {
      mockPrisma.invoices.findMany.mockResolvedValue([{ id: "inv-1" }]);
      mockPrisma.invoiceItems.findMany.mockResolvedValue([{ id: "item-1" }]);
      
      const result = await askInvoiceGpt("site-1", "Test question");
      expect(result).toBe("GPT response");
    });
  });

  describe("Document Actions", () => {
    test("saveDocumentsToDB - saves documents", async () => {
      const formData = createFormData({
        siteId: "site-1",
        fileUrls: ["url1", "url2"]
      });

      await saveDocumentsToDB({}, formData);

      expect(mockGptDocumentsResponse).toHaveBeenCalledTimes(2);
      expect(mockPrisma.documents.create).toHaveBeenCalled();
      expect(mockLoadEmbeddings).toHaveBeenCalled();
    });

    test("GetDocumentsFromDB - retrieves documents", async () => {
      mockPrisma.documents.findMany.mockResolvedValue([{ id: "doc-1" }]);
      
      const result = await GetDocumentsFromDB("site-1");
      expect(result).toEqual([{ id: "doc-1" }]);
    });

    test("deleteDocuments - deletes document and embeddings", async () => {
      await deleteDocuments("doc-1", "site-1");
      
      expect(mockPrisma.documents.delete).toHaveBeenCalledWith({
        where: { id: "doc-1" }
      });
      
      const mockPinecone = require('@pinecone-database/pinecone');
      const mockNamespace = mockPinecone().index().namespace("site-1");
      expect(mockNamespace.deleteMany).toHaveBeenCalledWith([
        "doc-1", "doc-1-1", "doc-1-2", "doc-1-3"
      ]);
    });
  });

  describe("Subscription Actions", () => {
    test("CreateSubscription - creates new customer and session", async () => {
      await CreateSubscription();
      
      const stripe = require("stripe")();
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test"
      });
      
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: "cust_123",
        mode: 'subscription',
        billing_address_collection: 'auto',
        payment_method_types: ['card'],
        customer_update: {
          address: 'auto',
          name: "auto"
        },
        success_url: expect.any(String),
        cancel_url: expect.any(String),
        line_items: [{price: process.env.STRIPE_PRICE_ID, quantity: 1}]
      });
      
      expect(redirect).toHaveBeenCalledWith("https://stripe.com/checkout");
    });
  });
});