//All our server actions

"use server";


import {redirect} from "next/navigation";
import {parseWithZod} from '@conform-to/zod'
import {PostSchema, SiteCreationSchema} from "@/app/utils/zodSchemas";
import {prisma} from "@/app/utils/db";

import {requireUser} from "@/app/utils/requireUser";
import {stripe} from "@/app/utils/stripe";
import gptResponse from "@/componentsFrontend/AI/SQL/ExtractorGptForInvoices";
import gptInvoiceSchema from "@/componentsFrontend/AI/SQL/ExtractorGptForInvoices"
import OpenAI from "openai";
import { chunk } from "lodash";
import gptDocumentsResponse from "@/componentsFrontend/AI/RAG/ExtractorGptForDocuments";
import {LoadEmbeddings} from "@/componentsFrontend/AI/RAG/loadEmbeddings";
import { Pinecone } from '@pinecone-database/pinecone'
import { isLikelyScannedPdf } from "../utils/actions/helpers/isLikelyScannedPdf";



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
//nothing
//nothing
export async function CreateSiteAction(prevState: unknown,formData: FormData){

    const user = await requireUser();



    //09:43 - subscription validation

    const [subStatus, sites] = await Promise.all([

        prisma.subscription.findUnique({
            where:{
                userId: user.id,
            },
            select:{

                status:true,

            },
        }),
        prisma.site.findMany({
            where: {
                userId: user.id,
            }
        })
    ])



    if(!subStatus || subStatus.status !== "active" ){

        if(sites.length < 1){
            //Allow creating a site
           await createSite()

        } else {
            //user already has one site don't allow
            return redirect("/dashboard/pricing")
        }

    } else if (subStatus.status === "active"){
        //user has an active plan he can create sites
        await createSite()
    }

    async function createSite(){

    const submission = await parseWithZod(formData, {
        schema: SiteCreationSchema(),
        //This below also old validation, I think not needed
        //     {
        //     async isSubdirectoryUnique(){
        //         const existingSubDirectory = await prisma.site.findUnique({
        //             where: {
        //                 subdirectory :formData.get('subdirectory') as string,
        //
        //             }
        //         });
        //         return !existingSubDirectory;
        //     }
        // }),
        async: true,
    });

    if (submission.status !== "success" ){
        return submission.reply();
    }

    await prisma.site.create({

        data : {
            description: submission.value.description,
            name: submission.value.name,
            subdirectory:submission.value.subdirectory,
            userId: user.id,
        }

    });


        }
     return redirect("/dashboard/sites")
}


export async function CreatePostAction(prevState: unknown,formData : FormData){

    const user = await requireUser(); //user validation

    const submission = parseWithZod(formData,{

        schema: PostSchema, //zod schema validation

    });

    if(submission.status !== "success"){
        return submission.reply();
    }

    await prisma.post.create({ //this is databse mutation
        data : {
            title: submission.value.title,
            smallDescription :submission.value.smallDescription,
            slug :submission.value.slug,
            articleContent: JSON.parse(submission.value.articleContent),  //here interesting, some sheaningas with JSON.
            image: submission.value.coverImage,
            userId: user.id,
            siteId: formData.get("siteId") as string,
        },
    })

    return redirect(`/dashboard/sites/${formData.get("siteId")}`)
}


//this is for article edit. 05:24
export async function EditPostActions(prevState: unknown, formData: FormData){

    const user = await requireUser()

    const submission = parseWithZod(formData, { //this can yield 2 results, successful or not
        schema : PostSchema,
    })

    if(submission.status !== "success"){
        return submission.reply();

    }

    await prisma.post.update({
        where: {
            userId: user.id,
            id: formData.get('articleId') as string,
        },
        data : {
            title: submission.value.title,
            smallDescription: submission.value.smallDescription,
            slug: submission.value.slug,
            articleContent: JSON.parse(submission.value.articleContent), //Stored in database as JSON object.
            image: submission.value.coverImage,


        },

    });

    return redirect(`/dashboard/sites/${formData.get("siteId")}`)
}


//this is for article delete 05:45

export async function DeletePost(formData: FormData){

    const user = await requireUser();

    await prisma.post.delete({

        where: {
            userId: user.id,
            id: formData.get('articleId') as string,
        },


    })

    return redirect(`/dashboard/sites/${formData.get("siteId")}`)
}

//Update image from settings, 06:09
export async function UpdateImage(formData: FormData){

     const user = await requireUser();

     await prisma.site.update({

         where: {

             userId: user.id,
             id: formData.get("siteId") as string,
         },
         data: {

             imageUrl: formData.get("imageUrl") as string,

         }

     })

    return redirect(`/dashboard/sites`)


}

//Delete site, 06:17

export async function DeleteSite(formData: FormData){

    const user = await requireUser();


    await prisma.site.delete({
        where: {
            userId: user.id,
            id: formData.get('siteId') as string,

        },
    })
    return redirect("/dashboard/sites")
}

//Stipe 08:40

export async function CreateSubscription(){

    const user = await requireUser();

      let stripeUserId = await prisma.user.findUnique({
        where: {
            id: user.id,
        },
        select: {
            customerId: true,
            email: true,
            firstName : true,
        },
    });


    if(!stripeUserId?.customerId){
        const stripeCustomer = await stripe.customers.create({
            email: stripeUserId?.email,
            name: stripeUserId?.firstName,


        });
        stripeUserId = await prisma.user.update({
            where: {
                id: user.id,
            },
            data:{
                customerId: stripeCustomer.id,
            },
        })
    }

    const session = await stripe.checkout.sessions.create({

        customer: stripeUserId.customerId as string,
        mode: 'subscription',
        billing_address_collection: 'auto',
        payment_method_types: ['card'],
        customer_update: {
            address: 'auto',
            name: "auto"
        },
        success_url: process.env.NODE_ENV === 'production'
         ? "https://buvconsult.com/dashboard/payment/success"
        : "http://localhost:3000/dashboard/payment/success",

        cancel_url: process.env.NODE_ENV === 'production'
        ? "https://buvconsult.com/dashboard/payment/cancelled"
        : "http://localhost:3000/dashboard/payment/cancelled",

        line_items: [{price: process.env.STRIPE_PRICE_ID, quantity: 1}]
    });

    return redirect(session.url as string)


}

//Saving fileUploads to database




export const saveInvoiceToDB = async (_: unknown, formData: FormData) => {

  


  const user = await requireUser();
  const siteId = formData.get("siteId") as string;
  const urls = JSON.parse(formData.get("fileUrls") as string) as string[];


  //Here we have all fields names from invoices which we also copy ot invoiceItems for later agentic
    //analysis

const INVOICE_FIELDS_TO_COPY = [
  "invoiceNumber",
  "sellerName",
  "invoiceDate",
  // "invoiceTotalSumWithVat",
  // "buyerName",
  "invoiceDate",
  "paymentDate",
];



  // Split URLs into batches of 15
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
              },
            });
            if (Array.isArray(items) && items.length > 0) {
              await prisma.invoiceItems.createMany({
                data: items.map(item => ({
                  ...item,
                  invoiceId: savedInvoice.id,
                  siteId: siteId,

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





export async function GetInvoicesFromDB(siteId: string){

  function serializeDate(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

    const user = await requireUser();

    const invoices = await prisma.invoices.findMany({

        where: {
            userId: user.id,
            SiteId: siteId,
        }
    })
     return invoices.map(inv => ({
    ...inv,
    invoiceDate: serializeDate(inv.invoiceDate),
    paymentDate: serializeDate(inv.paymentDate),

      }));

}


export async function GetInvoiceItemsFromDB(siteId: string) {
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
  await prisma.invoices.update({
    where: { id },
    data,
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
  await prisma.invoiceItems.update({
    where: { id },
    data,
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

///Settings


export async function updateSiteAction(formData: FormData) {
  const siteId = formData.get("siteId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const subdirectory = formData.get("subdirectory") as string;

  if (!siteId || !name || !description || !subdirectory) {
    return { success: false, message: "Missing required fields" };
  }

  try {
    await prisma.site.update({
      where: { id: siteId },
      data: {
        name,
        description,
        subdirectory,
      },
    });

    // Redirect to refresh the page (adjust path as needed)
    redirect(`/dashboard/sites`);
  } catch (err: any) {
    return { success: false, message: err.message || "Update failed." };
  }
}


export async function getProjectNameBySiteId(siteId: string): Promise<string | null> {
  if (!siteId) return null;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { name: true },
  });

  return site?.name ?? null;
}
//nothing

// ---------------------------------------Documents-----------------------------------------------


export const saveDocumentsToDB = async (_: unknown, formData: FormData) => {
  const user = await requireUser();
  const siteId = formData.get("siteId") as string;
  const urls = JSON.parse((formData.get("fileUrls") as string) ?? "[]") as string[];

  let total = urls.length;
  let accepted = 0;

  console.log(`Those are URLs ${urls}`);

  // Split URLs into batches of 15
  const urlBatches = chunk(urls, 15);

  for (const batch of urlBatches) {
    // 0️⃣ Filter out scanned PDFs first (quietly skip), in parallel
    const checks = await Promise.all(
      batch.map(async (url) => {
        const scanned = await isLikelyScannedPdf(url);
        if (scanned) {
          console.log(`🟡 Skipping scanned (image-only) PDF: ${url}`);
          return null;
        }
        return url;
      })
    );

    const cleanUrls = checks.filter((u): u is string => Boolean(u));
     accepted += cleanUrls.length;
    if (cleanUrls.length === 0) {
      console.log("ℹ️ No text-based PDFs in this batch, moving on.");
      continue;
    }

    // 1️⃣ GPT extraction for each remaining URL in parallel
    const gptResults = await Promise.all(
      cleanUrls.map(async (url) => {
        try {
          const gptRaw = await gptDocumentsResponse(url);
          const gptResp = typeof gptRaw === "string" ? JSON.parse(gptRaw) : gptRaw;
          console.log(`This is a GPT response ${JSON.stringify(gptResp)}`);
          return { url, gptResp };
        } catch (err) {
          console.log(`🔶 GPT failed for ${url}, skipping.`, err);
          return null; // quietly skip if GPT fails
        }
      })
    );

    const validGpt = gptResults.filter((r): r is { url: string; gptResp: any } => Boolean(r));
    if (validGpt.length === 0) {
      console.log("ℹ️ No valid GPT results in this batch, moving on.");
      continue;
    }

    // 2️⃣ Save documents to DB in parallel
    await Promise.all(
      validGpt.map(async ({ url, gptResp }) => {
        try {
          await prisma.documents.create({
            data: {
              ...gptResp, // or pick specific fields
              url,
              userId: user.id,
              siteId,
            },
          });
        } catch (err) {
          console.log(`🔶 DB save failed for ${url}, skipping.`, err);
        }
      })
    );

    // 3️⃣ Generate embeddings in parallel (only for successfully processed URLs)
    await Promise.all(
      validGpt.map(async ({ url }) => {
        try {
          await LoadEmbeddings(url, siteId);
        } catch (err) {
          console.log(`🔶 Embeddings failed for ${url}, skipping.`, err);
        }
      })
    );
  }

  return { accepted,total};
};

export async function GetDocumentsFromDB(siteId: string){

    const user = await requireUser();

    const documents = await prisma.documents.findMany({

        where: {
            userId: user.id,
            siteId: siteId,
        }
    })
    return documents

}

export async function deleteDocuments(documentId: string, siteId: string) {



  console.log(`DoucumentId passed : ${documentId}`)
    console.log(`siteId passed : ${siteId}`)



  const pc = new Pinecone()




  const index = pc.index("documents")
  const ns = index.namespace(siteId)

    const fetchResult = await index.namespace(siteId).fetch([documentId])
    const chunkCount = fetchResult.records[documentId].metadata.chunkCount
    console.log(fetchResult.records[documentId].metadata.chunkCount)
    const deletedId = []

    deletedId.push(`${documentId}`)

    for (let i = 1; i <= chunkCount; i++ ){
        deletedId.push(`${documentId}-${i}`)
    }

    await ns.deleteMany(deletedId)


 await prisma.documents.delete({ where: { id: documentId } });
  return { ok: true };
}

export async function updateDocuments(id: string, data: any) {
  await prisma.documents.update({
    where: { id },
    data,
  });
  return { ok: true };
}



export const saveInvoiceToFromGmailDB = async (_: unknown, formData: FormData) => {
  console.log("🟨 saveInvoiceToFromGmailDB called");

  const siteId = formData.get("siteId") as string;
  const userId = (formData.get("userId") as string) || null;            // ⬅️ NEW
  const urls = JSON.parse((formData.get("fileUrls") as string) ?? "[]") as string[];

  const health = ((formData.get("health") as string) ?? "").trim();
  const auditSummary = ((formData.get("auditSummary") as string) ?? "").trim();

  console.log("🧭 siteId:", siteId);
  console.log("👤 userId:", userId);
  console.log("🔗 fileUrls count:", urls.length);
  console.log("🩺 health (string):", health || "(empty)");
  console.log("📝 auditSummary:", auditSummary ? `${auditSummary.slice(0, 140)}…` : "(empty)");

  if (!urls.length) {
    console.warn("⚠️ No URLs provided — nothing to process.");
    return;
  }

  const INVOICE_FIELDS_TO_COPY = [
    "invoiceNumber",
    "sellerName",
    "invoiceDate",
    "paymentDate",
  ] as const;

  let totalUrls = urls.length;
  let totalGptOk = 0;
  let totalInvoicesSaved = 0;
  let totalItemsSaved = 0;

  const urlBatches = chunk(urls, 15);
  console.log(`📦 Batching ${totalUrls} URL(s) into ${urlBatches.length} batch(es)`);

  for (let bIndex = 0; bIndex < urlBatches.length; bIndex++) {
    const batch = urlBatches[bIndex];
    console.log(`\n🧩 Processing batch ${bIndex + 1}/${urlBatches.length} (size=${batch.length})`);
    console.log("🔗 Batch URLs:", batch);

    const gptResults = await Promise.all(
      batch.map(async (url) => {
        console.log("🤖 Calling gptResponse for URL:", url);
        try {
          const gptRaw = await gptResponse(url);
          const gptResp = typeof gptRaw === "string" ? JSON.parse(gptRaw) : gptRaw;
          totalGptOk += 1;
          console.log("✅ GPT ok for URL:", url);
          return { url, gptResp, error: null as any };
        } catch (error) {
          console.error("❌ GPT failed for URL:", url, error);
          return { url, gptResp: null as any, error };
        }
      })
    );

    await Promise.all(
      gptResults.map(async ({ url, gptResp, error }) => {
        if (error) {
          console.warn("⏭️ Skipping save due to GPT error for URL:", url);
          return;
        }
        if (!Array.isArray(gptResp?.items)) {
          console.warn("⏭️ No items array in GPT response — URL:", url);
          return;
        }

        console.log(`💾 Saving ${gptResp.items.length} invoice(s) parsed from URL:`, url);

        await Promise.all(
          gptResp.items.map(async (inv: any, i: number) => {
            try {
              const { items, ...invoiceData } = inv;

              console.log(`   🧾 [${i + 1}/${gptResp.items.length}] Creating invoice…`);

              const savedInvoice = await prisma.invoices.create({
                data: {
                  ...invoiceData,
                  url,
                  userId,                 // ⬅️ NOW STORED ON THE INVOICE
                  SiteId: siteId,
                  health: health || null,
                  auditSummary: auditSummary || null,
                },
              });

              totalInvoicesSaved += 1;
              console.log("   ✅ Invoice saved. id:", savedInvoice.id);

              if (Array.isArray(items) && items.length > 0) {
                const res = await prisma.invoiceItems.createMany({
                  data: items.map((item: any) => ({
                    ...item,
                    invoiceId: savedInvoice.id,
                    siteId: siteId,
                    // Copy selected invoice fields to invoiceItems
                    ...INVOICE_FIELDS_TO_COPY.reduce((acc: Record<string, any>, field) => {
                      acc[field] = (savedInvoice as any)[field];
                      return acc;
                    }, {}),
                  })),
                });
                totalItemsSaved += res.count ?? items.length;
                console.log(`   ✅ invoiceItems saved:`, res);
              } else {
                console.log("   ℹ️ No items to save for this invoice.");
              }
            } catch (err) {
              console.error("   ❌ Failed saving invoice or items:", err);
            }
          })
        );
      })
    );

    console.log(`📊 Batch ${bIndex + 1} done.`);
  }

  console.log("\n================ SUMMARY ================ ");
  console.log("🌐 Total URLs:", totalUrls);
  console.log("🤖 GPT successes:", totalGptOk);
  console.log("🧾 Invoices saved:", totalInvoicesSaved);
  console.log("📥 Items saved:", totalItemsSaved);
  console.log("=========================================\n");
};


