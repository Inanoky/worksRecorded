//All our server actions

"use server";


import {redirect} from "next/navigation";
import {parseWithZod} from '@conform-to/zod'
import { SiteCreationSchema} from "@/lib/utils/zodSchemas";
import {prisma} from "@/lib/utils/db";
import {requireUser} from "@/lib/utils/requireUser";
import {stripe} from "@/lib/utils/stripe";
import { defaultProgram } from "@/lib/utils/DefaultProgram";





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
  const geofencePolygonRaw = (formData.get("geofencePolygon") as string) || "";
  const geofenceMapLink = (formData.get("geofenceMapLink") as string) || "";

  console.log("[updateSiteAction] incoming payload", {
    siteId,
    hasName: Boolean(name),
    hasDescription: Boolean(description),
    hasSubdirectory: Boolean(subdirectory),
    geofencePolygonRawLength: geofencePolygonRaw.length,
    geofenceMapLink,
  });

  if (!siteId || !name || !description || !subdirectory) {
    return { success: false, message: "Missing required fields" };
  }

  let geofencePolygon: unknown = null;

  if (geofencePolygonRaw.trim().length > 0) {
    try {
      geofencePolygon = JSON.parse(geofencePolygonRaw);
      console.log("[updateSiteAction] parsed geofence polygon", geofencePolygon);
    } catch {
      return { success: false, message: "Invalid geofence polygon format." };
    }
  }

  try {
    await prisma.site.update({
      where: { id: siteId },
      data: {
        name,
        description,
        subdirectory,
        geofencePolygon: geofencePolygon as any,
        geofenceMapLink,
      },
    });

    console.log("[updateSiteAction] update success", { siteId });

    return { success: true };
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





export async function getUserEmailByUserId(userId: string): Promise<string | null> {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return user.email ?? null;
}


export async function getOrganizationIdByWorkerId(workerId: string): Promise<string | null> {
  const worker = await prisma.workers.findUnique({
    where: { id: workerId },
    select: { organizationId: true },
  });
  return worker?.organizationId ?? null;
}




export async function saveUserPhone(formData: FormData) {
  const user = await requireUser();
  let phone = String(formData.get("phone") ?? "").trim();

  // allow only digits
  phone = phone.replace(/[^\d]/g, "");

  if (!phone) {
    throw new Error("Invalid phone number");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone,
      role: "site manager",
    },
  });
}




export async function updateOrganizationLanguage(language: "en" | "lv") {
  const user = await requireUser();
  const organizationId = await getOrganizationIdByUserId(user.id);

  if (!organizationId) {
    return { ok: false, message: "Organization not found" };
  }

  const nextLanguage = language === "lv" ? "lv" : "en";

  await prisma.organization.update({
    where: { id: organizationId },
    data: { orgLanguage: nextLanguage },
  });

  return { ok: true };
}

export async function getOrganizationLanguageByUserId(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organization: {
        select: {
          orgLanguage: true,
        },
      },
    },
  });

  return u?.organization?.orgLanguage ?? "en";
}

export async function getOrganizationLanguageByWorkerId(workerId: string) {
  const worker = await prisma.workers.findUnique({
    where: { id: workerId },
    select: {
      organization: {
        select: {
          orgLanguage: true,
        },
      },
    },
  });

  return worker?.organization?.orgLanguage ?? "en";
}
