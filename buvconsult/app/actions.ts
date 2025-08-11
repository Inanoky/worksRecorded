//All our server actions

"use server";


import {redirect} from "next/navigation";
import {parseWithZod} from '@conform-to/zod'
import {PostSchema, SiteCreationSchema} from "@/app/utils/zodSchemas";
import {prisma} from "@/app/utils/db";

import {requireUser} from "@/app/utils/requireUser";
import {stripe} from "@/app/utils/stripe";
import gptResponse from "@/components/AI/SQL/ExtractorGptForInvoices";
import gptInvoiceSchema from "@/components/AI/SQL/ExtractorGptForInvoices"
import OpenAI from "openai";
import { chunk } from "lodash";
import gptDocumentsResponse from "@/components/AI/RAG/ExtractorGptForDocuments";
import {LoadEmbeddings} from "@/components/AI/RAG/loadEmbeddings";
import { Pinecone } from '@pinecone-database/pinecone'


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
         ? "https://buvconsult-deploy.vercel.app/dashboard/payment/success"
        : "http://localhost:3000/dashboard/payment/success",

        cancel_url: process.env.NODE_ENV === 'production'
        ? "https://buvconsult-deploy.vercel.app/dashboard/payment/cancelled"
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

    const user = await requireUser();

    const invoices = await prisma.invoices.findMany({

        where: {
            userId: user.id,
            SiteId: siteId,
        }
    })
    return invoices

}


export async function GetInvoiceItemsFromDB(siteId: string){



    const user = await requireUser();

    const invoiceItems = await prisma.invoiceItems.findMany({

        where: {

            siteId: siteId,
        },
        include: {
            invoice: true,
        }

    })
    return invoiceItems

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

// ---------------------------------------Documents-----------------------------------------------


export const saveDocumentsToDB = async (_: unknown, formData: FormData) => {

  const user = await requireUser();
  const siteId = formData.get("siteId") as string;
  const urls = JSON.parse(formData.get("fileUrls") as string) as string[];

  console.log(`Those are URLs ${urls}`)


  //Here we have all fields names from invoices which we also copy ot invoiceItems for later agentic
    //analysis





  // Split URLs into batches of 15
  const urlBatches = chunk(urls, 15);

  for (const batch of urlBatches) {
    // 1️⃣ GPT Extraction for each batch in parallel

      //What are GPT results ? array of strings (URLs)
    const gptResults = await Promise.all(
      batch.map(async (url) => {
        const gptRaw = await gptDocumentsResponse(url);
        const gptResp = typeof gptRaw === "string" ? JSON.parse(gptRaw) : gptRaw;

        console.log(`This is a GPT response ${JSON.stringify(gptResp)}`)

        return { url, gptResp };
      })
    );

    // 2️⃣ Save invoices/items for all GPT results in this batch, in parallel
    await Promise.all(
  gptResults.map(async ({ url, gptResp }) => {
    // Save one row per document
    await prisma.documents.create({
      data: {
        ...gptResp, // or just select the top-level fields you want
        url,
        userId: user.id,
        siteId: siteId,
      },
    });
  })
);
    await Promise.all(
    gptResults.map( async ({url}) => LoadEmbeddings(url, siteId))
        )
  }

  return;
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