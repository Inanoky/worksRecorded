//All our server actions

"use server";


import {redirect} from "next/navigation";
import {parseWithZod} from '@conform-to/zod'
import { SiteCreationSchema} from "@/lib/utils/zodSchemas";
import {prisma} from "@/lib/utils/db";
import {requireUser} from "@/lib/utils/requireUser";
import {stripe} from "@/lib/utils/stripe";
import gptResponse from "@/server/ai-flows/agents/extractors/gpt-extractor-for-invoices";
import { defaultProgram } from "@/lib/utils/DefaultProgram";


import { chunk } from "lodash";


export async function getOrganizationIdByUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  return user?.organizationId ?? null;
}



export async function orgCheck (userId, paramSiteId){

  const org = await getOrganizationIdByUserId(userId)

  const site = await prisma.site.findFirst({

    where: {
      id: paramSiteId,
      organizationId: org // <-- key security check
    },
    select: { id: true, name: true },
  });

    if (!site) {
    return false; // site not found or not in user's org
  }

  return site; // site exists and belongs to org
}


//Action to create a construction project

export async function CreateSiteAction(prevState: unknown,formData: FormData){

    const user = await requireUser();    
    const org = await getOrganizationIdByUserId(user.id)

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
            
           await createSite()

        } else {
            
            return redirect("/dashboard/pricing")
        }

    } else if (subStatus.status === "active"){
        
        await createSite()
    }

    async function createSite(){

    const submission = await parseWithZod(formData, {
        schema: SiteCreationSchema(),
       
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
            organizationId: org,
            sitediarysettings: {
            create: {
            userId: user.id,
            organizationId: org,
            // schema column is String? → store stringified JSON
            schema: JSON.stringify(defaultProgram),
            // fileUrl can remain null for now
          },
        },
        }

    });


        }
     return redirect("/dashboard/sites")
}



export async function UpdateImage(formData: FormData){

     const user = await requireUser();

     await prisma.site.update({

         where: {

            //  userId: user.id,
             id: formData.get("siteId") as string,
         },
         data: {

             imageUrl: formData.get("imageUrl") as string,

         }

     })

    return redirect(`/dashboard/sites`)


}



export async function DeleteSite(formData: FormData){

    const user = await requireUser();


    await prisma.site.delete({
        where: {
            // userId: user.id,
            id: formData.get('siteId') as string,

        },
    })
    return redirect("/dashboard/sites")
}



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


export const saveInvoiceToFromGmailDB = async (_: unknown, formData: FormData) => {
  console.log("🟨 saveInvoiceToFromGmailDB called");

  const siteId = formData.get("siteId") as string;
  const userId = (formData.get("userId") as string)            // ⬅️ NEW
  const org = await getOrganizationIdByUserId(userId)
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
    "isInvoice"
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
                  organizationId : org
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
                    organizationId : org,
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


export async function getUserEmailByUserId(userId: string): Promise<string | null> {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return user.email ?? null;
}