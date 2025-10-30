"use server"


import {prisma} from "@/lib/utils/db";
import {requireUser} from "@/lib/utils/requireUser";
import gptResponse from "../ai-flows/agents/extractors/gpt-extractor-for-invoices";
import { chunk } from "lodash";
import { getOrganizationIdByUserId } from "./shared-actions";





export const saveInvoiceToDB = async (_: unknown, formData: FormData) => {

  


  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id)
  const siteId = formData.get("siteId") as string;
  const urls = JSON.parse(formData.get("fileUrls") as string) as string[];



const INVOICE_FIELDS_TO_COPY = [
  "invoiceNumber",
  "sellerName",
  "invoiceDate",   
  "paymentDate",
  "isInvoice"
];



 
  const urlBatches = chunk(urls, 15);

  for (const batch of urlBatches) {
    // 1️⃣ GPT Extraction for each batch in parallel
    const gptResults = await Promise.all(
      batch.map(async (url) => {
        const gptRaw = await gptResponse(url);
        const gptResp = typeof gptRaw === "string" ? JSON.parse(gptRaw) : gptRaw;
        return { url, gptResp };
      })
    );

    // 2️⃣ Save invoices/items for all GPT results in this batch, in parallel
    await Promise.all(
      gptResults.map(async ({ url, gptResp }) => {
        if (!Array.isArray(gptResp.items)) return;
        await Promise.all(
          gptResp.items.map(async (inv) => {
            // destructure to drop `items`
            const { items, ...invoiceData } = inv;
            const savedInvoice = await prisma.invoices.create({
              data: {
                ...invoiceData,
                url,
                userId: user.id,
                SiteId: siteId,
                organizationId : org
              },
            });
            if (Array.isArray(items) && items.length > 0) {
              await prisma.invoiceItems.createMany({
                data: items.map(item => ({
                  ...item,
                  invoiceId: savedInvoice.id,
                  siteId: siteId,
                  organizationId : org,

                    //This acutally copies fileds from invoices to invoiceItems

                    ...INVOICE_FIELDS_TO_COPY.reduce((acc, field) => {
                    acc[field] = savedInvoice[field];
                    return acc;
                  }, {}),
                })),
              });
            }
          })
        );
      })
    );
  }

  return;
};


export async function getInvoicesFromDB(siteId: string){

  function serializeDate(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

    const user = await requireUser();

    const invoices = await prisma.invoices.findMany({

        where: {
            
            SiteId: siteId,
        }
    })
     return invoices.map(inv => ({
    ...inv,
    invoiceDate: serializeDate(inv.invoiceDate),
    paymentDate: serializeDate(inv.paymentDate),

      }));

}

export async function getInvoiceItemsFromDB(siteId: string) {
  
  const user = await requireUser();

  function serializeDate(d: Date | null): string | null {
    return d ? d.toISOString() : null;
  }

  const invoiceItems = await prisma.invoiceItems.findMany({
    where: { siteId },
    include: { invoice: true },
  });

  return invoiceItems.map(inv => ({
    ...inv,
    invoiceDate: serializeDate(inv.invoiceDate),
    paymentDate: serializeDate(inv.paymentDate),

    // also handle nested invoice if needed
    invoice: inv.invoice
      ? {
          ...inv.invoice,
          invoiceDate: serializeDate(inv.invoice.invoiceDate),
          paymentDate: serializeDate(inv.invoice.paymentDate),
        }
      : null,
  }));
}

export async function deleteInvoice(invoiceId: string) {
  await prisma.invoices.delete({ where: { id: invoiceId } });
  return { ok: true };
}

export async function updateInvoice(id: string, data: any) {


  const toNullableDate = (v: unknown) => {
    if (v === "" || v === null || v === undefined) return null;
    // Accept Date or string
    const d = v instanceof Date ? v : new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  };

  const toBool = (v: unknown) => {
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return Boolean(v);
  };

  await prisma.invoices.update({
    where: { id },
    data: {
      ...data,
      invoiceDate: toNullableDate(data.invoiceDate),
      paymentDate: toNullableDate(data.paymentDate),
      isInvoice: toBool(data.isInvoice),
    },
  });

  return { ok: true };
}

export async function bulkSetIsInvoice(ids: string[], value: boolean) {
  await prisma.invoices.updateMany({
    where: { id: { in: ids } },
    data: { isInvoice: value }
  });
}


export async function updateInvoiceItem(id: string, data: any) {
  const toNullableDate = (v: unknown) => {
    if (v === "" || v === null || v === undefined) return null;
    const d = v instanceof Date ? v : new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  };

  // Convert string numbers to actual numbers
  const toNumber = (v: unknown) => {
    if (v === "" || v === null || v === undefined) return null;
    const num = Number(v);
    return isNaN(num) ? null : num;
  };

  await prisma.invoiceItems.update({
    where: { id },
    data: {
      ...data,
      invoiceDate: toNullableDate(data.invoiceDate),
      quantity: toNumber(data.quantity),
      pricePerUnitOfMeasure: toNumber(data.pricePerUnitOfMeasure),
      sum: toNumber(data.sum),
    }
  });
  return { ok: true };
}

export async function deleteInvoiceItem(id: string) {
  await prisma.invoiceItems.delete({
    where: { id },
  });
  return { ok: true };
}

//I am not sure I am using this one anywhere
export async function askInvoiceGpt(siteId: string, question: string) {
  // 1. Fetch relevant data (summary for best results)
  const invoices = await prisma.invoices.findMany({
    where: { SiteId: siteId, isInvoice: true},
    select: {
      id: true, sellerName: true, invoiceNumber: true, invoiceDate: true,
      isInvoice: true, isCreditDebitProformaOrAdvanced: true
    }
  });

  const invoiceIds = invoices.map(inv => inv.id);

  const items = await prisma.invoiceItems.findMany({
    where: {
        siteId,
        invoiceId: {in: invoiceIds}


    },
    select: {
        invoiceId: true,
        item: true,
        quantity: true,
        unitOfMeasure: true,
        pricePerUnitOfMeasure: true,
        sum: true,
        // date: true,
        itemDescription:true
    }
  });

  // 2. (Optional) If you have a lot of data, summarize or limit it here!

  // 3. Build the prompt for GPT
  const context = [
    "Here is a summary of the invoices and invoice items from my project database.",
    `Invoices: ${JSON.stringify(invoices)}`,
    `InvoiceItems: ${JSON.stringify(items)}`,
    "InvoiceItems are extracted items from Invoices, related by invoiceId" +
    "Use the data to get helpful insight for the user. Deeply analyze data. If some spendings are not clear" +
    "you can make educated guesses " +
    "be concise and try to be specific",
    "",
    `User question: ${question}`
  ].join("\n");

  // 4. Call OpenAI
  const res = await openai.chat.completions.create({
    model: "gpt-4.1", // Or "gpt-4-turbo" or "gpt-4"
    messages: [
      { role: "system", content: "You are a helpful construction specialist" },
      { role: "user", content: context }
    ],
    max_tokens: 10000
  });

  return res.choices[0].message.content || "No answer";
}
