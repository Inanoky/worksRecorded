// download_media.js

import { wrapOpenAI } from "langsmith/wrappers/openai";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";
import {
  metaMaterialImageClassifierModel,
  metaMaterialImageClassifierTemperature,
} from "@/server/ai-flows/ai-models-settings";


//-------------------------------------Utilities--------------------------------

const TOKEN = process.env.META_ACCESS_TOKEN

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const tracedClient = wrapOpenAI(client);

const utapi = new UTApi();

//This we use for just when we have no acess to IP.
export const mockupCategories = [
  {
    id: '2195',
    material_kind: 'Flīzes',
    measurement: '12',
    measurement_unit: 'gab.'
  },
  {
    id: '2204',
    material_kind: 'Mūras bloki',
    measurement: '12',
    measurement_unit: 'gab.'
  },
  {
    id: '2230',
    material_kind: 'stiegrojums',
    measurement: '42',
    measurement_unit: 't'
  },
  {
    id: '2231',
    material_kind: 'Transportbetons',
    measurement: '25',
    measurement_unit: 'm3'
  },
  {
    id: '2232',
    material_kind: 'Concrete grout',
    measurement: '62',
    measurement_unit: 'kg'
  }
]



//And this we use to download and store photo from Meta message


// STEP 1 - download media from META
export async function downloadMetaMedia(mediaId: string) {
    const GRAPH_VERSION = "v20.0";

    const metaResp = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
        {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        }
    );

    const metaJson = await metaResp.json();

    const fileResp = await fetch(metaJson.url, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    });

    const arrayBuffer = await fileResp.arrayBuffer();

    const extension = metaJson.mime_type.split("/")[1];

    const fileName = `whatsapp_${Date.now()}.${extension}`;

    const file = new File([arrayBuffer], fileName, { type: metaJson.mime_type });

    const uploaded = await utapi.uploadFiles([file]);

    const first = Array.isArray(uploaded) ? uploaded[0] : uploaded; //This I don't know what it is

    const publicUrl = getUploadThingFileUrl(first.data); //Get Upload URL

    if (!publicUrl) {
      throw new Error("UploadThing upload completed without a file URL");
    }


    console.log(publicUrl)

    return { publicUrl, file }

}

//This we use to get a list of measurements from BIS.
export async function getBISMeasurments_12I7_061() {
    const baseUrl = "https://test.bis.gov.lv";

    let page = 1;
    let all: any[] = [];

    const row = await prisma.bisToken.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { accessToken: true },
    });

    const accessToken = row?.accessToken;

    while (true) {
        const res = await fetch(
            `${baseUrl}/bisp/api/portal/classifiers?filter[typ_eq]=character_measures&page[number]=${page}`,
            {
                headers: {
                    Accept: "application/vnd.api+json",
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const json = await res.json();

        if (!json.data?.length) break;

        all.push(...json.data);
        page++;
    }

    console.dir(all)

    return all;
}


export async function getBisCategories_12I7_075() {

    const BISCase = "384792"
    //   const BISCase = "46351"
    const baseUrl = "https://test.bis.gov.lv"


    const row = await prisma.bisToken.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true, accessToken: true },
    });

    const accessToken = row?.accessToken

    const res = await fetch(
        `${baseUrl}/bisp/api/portal/bis_cases/${BISCase}/logbook/construction_materials?page[number]=1&page[size]=200`,
        {
            headers: {
                Accept: "application/vnd.api+json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    const _data = await res.json(); //This I think does something to response body

    //Now we manipulate data a bit to get array of what we need (id, name, measuremnt)

    let data = _data.data.map((x) => ({

        id: x.id,
        material_kind: x.attributes.material_kind,
        measurement: x.attributes.measurement,
    }))


    //Here I think we also need to convert measurement to something readable.


    // We create a Map
    const map = new Map()

    // Get measurements

    const measurements = await getBISMeasurments_12I7_061()

    //Creata map

    for (const item of measurements) {

        const code = item.attributes.code;
        const unit = item.attributes.name;

        map.set(code, unit)


    }

    // Here we enrich data

    data = data.map((category) => ({


        ...category, //we leave as it is what we don't care
        measurement_unit: map.get(category.measurement) //so we enrich this category



    }))

    console.log(`-------------------------------------------------------------`)
    console.dir(data, { depth: null });


    return (data); //I mean it probably I need to convert to array of string of cases or something I dunno


}



type MetaMaterialContext = {
  userId: string
  orgId: string | null
  siteId: string | null
}

type MetaMaterialLangSmithRunName =
  | "MetaMaterialImageClassification"
  | "MetaMaterialInvoiceExtraction"

function describeImageForTrace(publicUrl: string) {
  try {
    return new URL(publicUrl).hostname
  } catch {
    return null
  }
}

function buildMetaMaterialLangSmithExtra(args: {
  name: MetaMaterialLangSmithRunName
  model: string
  publicUrl: string
  context?: MetaMaterialContext | null
}) {
  return {
    name: args.name,
    tags: [
      "whatsapp-site-manager",
      "meta-image",
      "material-document",
      args.name === "MetaMaterialInvoiceExtraction"
        ? "invoice-extraction"
        : "image-classification",
    ],
    metadata: {
      source: "meta-image-handler",
      model: args.model,
      imageHost: describeImageForTrace(args.publicUrl),
      siteId: args.context?.siteId ?? null,
      userId: args.context?.userId ?? null,
      orgId: args.context?.orgId ?? null,
    },
  }
}

type TracedOpenAIResponse = {
  output_text: string
}

type TracedOpenAIResponsesCreate = (
  payload: unknown,
  options: {
    langsmithExtra: ReturnType<typeof buildMetaMaterialLangSmithExtra>
  },
) => Promise<TracedOpenAIResponse>

function createTracedOpenAIResponse(
  payload: unknown,
  langsmithExtra: ReturnType<typeof buildMetaMaterialLangSmithExtra>,
) {
  const createResponse =
    tracedClient.responses.create as unknown as TracedOpenAIResponsesCreate
  return createResponse(payload, { langsmithExtra })
}

async function resolveMetaMaterialContext(senderPhone?: string | null): Promise<MetaMaterialContext | null> {
  if (!senderPhone) return null

  const candidates = Array.from(
    new Set([
      senderPhone,
      `+${senderPhone}`,
      `whatsapp:+${senderPhone}`,
    ]),
  )

  const user = await prisma.user.findFirst({
    where: {
      phone: { in: candidates },
    },
    select: {
      id: true,
      organizationId: true,
      lastSelectedSiteIdforWhatsapp: true,
      siteManagerSelectIdforWhatsapp: true,
    },
  })

  if (!user) return null

  return {
    userId: user.id,
    orgId: user.organizationId ?? null,
    siteId:
      user.lastSelectedSiteIdforWhatsapp ??
      user.siteManagerSelectIdforWhatsapp ??
      null,
  }
}


const materialImageClassificationSchema = z.object({
  isMaterialDocument: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export async function classifyMaterialDocumentImage(
  publicUrl: string,
  context?: MetaMaterialContext | null,
) {
  const response = await createTracedOpenAIResponse(
    {
      model: metaMaterialImageClassifierModel,
      temperature: metaMaterialImageClassifierTemperature,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: publicUrl,
            },
            {
              type: "input_text",
              text: `Classify this WhatsApp image for a construction site diary workflow.

Return isMaterialDocument=true only when the image is a readable document, receipt, delivery note, invoice, label, or table that lists construction materials/products/quantities/costs.

Return false for normal progress photos, selfies, site photos, equipment photos, drawings without material line items, or blurry/unreadable images.

Be conservative: if you cannot see material line items or document-like text, return false.`,
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(materialImageClassificationSchema, "material_image_classification"),
      },
    },
    buildMetaMaterialLangSmithExtra({
      name: "MetaMaterialImageClassification",
      model: metaMaterialImageClassifierModel,
      publicUrl,
      context,
    }),
  );

  return materialImageClassificationSchema.parse(JSON.parse(response.output_text));
}

export async function processMaterialDocumentImageFromPublicUrl(args: {
  publicUrl: string;
  senderPhone?: string | null;
}) {
  const context = await resolveMetaMaterialContext(args.senderPhone);
  const classification = await classifyMaterialDocumentImage(args.publicUrl, context);

  console.log("Meta material image classification", classification);

  if (!classification.isMaterialDocument || classification.confidence < 0.65) {
    return false;
  }

  await extractAndSaveBISMaterialsFromPublicUrl(args.publicUrl, args.senderPhone, context);
  return true;
}

export async function sendToGpt(mediaId: string, senderPhone?: string) {

    const { publicUrl, file } = await downloadMetaMedia(mediaId)
    void file

    return extractAndSaveBISMaterialsFromPublicUrl(publicUrl, senderPhone);
}

export async function extractAndSaveBISMaterialsFromPublicUrl(
  publicUrl: string,
  senderPhone?: string | null,
  resolvedContext?: MetaMaterialContext | null,
) {
    const context = resolvedContext ?? await resolveMetaMaterialContext(senderPhone)

    // const categories = await getBisCategories_12I7_075() <---- uncomment when have access to IP


    const categories = mockupCategories

    // Create map of categories by id
        const categoryMap = new Map(
        categories.map(c => [c.id, c])
        )

    const ids = [...categories.map(m => m.id), "no_match"];






    const responseSchema = z.object({

        items: z.array(z.object({

            name: z.string(),
            cost: z.number(),
            invoiceNr : z.string(),
            invoiceDate : z.coerce.date().nullable().optional(),
            costCode: z.string(),
            quantity: z.number().describe(`Extract quantity for every invoice line. When category matched convert to measurement_unit; when no_match keep the original invoice quantity`),
            construction_material_id: z.enum(ids as [string, ...string[]])
        }))



    })








    const extractionModel = "gpt-5.4";
    const gptDocumentResponse = await createTracedOpenAIResponse(
      {
        model: extractionModel,
        temperature: 0,
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_image",
                        image_url: publicUrl
                    },
                    {
                        type: "input_text",
                        text: `
Extract construction invoice line items from the image.

Return:
- name (original language from the document, do NOT translate)
- quantity
- invoice Nr
- invoice Nr
- cost code (just make it up)
- cost
- construction_material_id

Available categories:

${categories.map(c =>
                            `${c.id} | ${c.material_kind} | unit: ${c.measurement_unit}`
                        ).join("\n")}

Rules:

1. Match each invoice item to the best material_kind.
2. If nothing matches, return "no_match".
3. Quantity MUST always be extracted, even if no category match is found.
4. If a category is selected, convert quantity to that category unit.
5. If construction_material_id is "no_match", keep quantity in original invoice unit (do not skip quantity).
6. If the invoice unit is "gabals", "iepakojums", "pack", "bag", etc, extract the real weight or volume from the product name.
7. Keep extracted textual values in the original document language. Never translate names.

Important:
Packaging size is often written in the product name.

Examples:
"25kg grout bag" → 25 kg per bag
"5kg plaster pack" → 5 kg per pack
"1m3 concrete" → 1 m3

If invoice says:
80 bags × 25 kg → quantity = 2000 kg

Always output the converted quantity.
`
                    }
                ]
            }
        ],
        text: {
            format: zodTextFormat(responseSchema, "event"),
        },
      },
      buildMetaMaterialLangSmithExtra({
            name: "MetaMaterialInvoiceExtraction",
            model: extractionModel,
            publicUrl,
            context,
        }),
    );

    const payload = JSON.parse(gptDocumentResponse.output_text)

        payload.items = payload.items.map(item => {
        if (item.construction_material_id === "no_match") {
            return {
            ...item,
            measurementId: null,
            measurementUnit: null,
            categoryName: null
            }
        }

        const category = categoryMap.get(item.construction_material_id)

        return {
            ...item,
            measurementId: category?.measurement ?? null,
            measurementUnit: category?.measurement_unit ?? null,
            categoryName: category?.material_kind ?? null
        }
        })



    //Here we need to enrich this payload with

    console.log(`THis is GPT output : ${gptDocumentResponse.output_text}`)
    console.log(`And this are categories : ${categories}`)


    await saveBISMaterialPayloadToDatabase(payload, publicUrl, context)

    return gptDocumentResponse.output_text;






}

//Ok now need to save the response
export async function saveBISMaterialPayloadToDatabase(
  payload: { items: Array<any> },
  publicURL: string,
  context: MetaMaterialContext | null,
) {
    if (!context?.siteId) {
      console.warn("Skipping BIS material payload save because no selected site was found for sender")
      return
    }

    await prisma.bISmaterialRecords.createMany({
  data: payload.items.map(item => ({
    name: item.name,
    quantity: item.quantity,
    invoiceDate :  item.invoiceDate,
    invoiceNr : item.invoiceNr,
    cost : item.cost,
    costCode : item.costCode,
    categoryId: item.construction_material_id,
    measurementUnitId: item.measurementId,
    measurementUnit: item.measurementUnit,
    categoryName: item.categoryName,

    sourcePhoto: publicURL,
    siteId: context.siteId,
    orgId: context.orgId,
    userId: context.userId,
  }))
})


}





// const URL = await downloadMetaMedia(MEDIA_ID)

// console.log(URL)

// getBisCategories_12I7_075()
// getBISMeasurments_12I7_061()

// sendToGpt(MEDIA_ID)
