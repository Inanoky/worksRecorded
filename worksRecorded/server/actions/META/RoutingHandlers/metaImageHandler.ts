// download_media.js

import { ChatOpenAI } from "@langchain/openai";
import { uuid7 } from "langsmith";
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

const utapi = new UTApi();

//This we use for just when we have no access to IP.
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

function buildLangChainRunConfig(args: {
  name: MetaMaterialLangSmithRunName
  model: string
  publicUrl: string
  context?: MetaMaterialContext | null
}) {
  const extra = buildMetaMaterialLangSmithExtra(args)
  return {
    runId: uuid7(),
    runName: extra.name,
    tags: extra.tags,
    metadata: extra.metadata,
  }
}

function buildImageMessage(args: {
  publicUrl: string
  prompt: string
}) {
  return [
    {
      role: "user" as const,
      content: [
        {
          type: "text",
          text: args.prompt,
        },
        {
          type: "image_url",
          image_url: {
            url: args.publicUrl,
          },
        },
      ],
    },
  ]
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
  const llm = new ChatOpenAI({
    model: metaMaterialImageClassifierModel,
    temperature: metaMaterialImageClassifierTemperature,
    useResponsesApi: true,
  });
  const classifier = llm.withStructuredOutput(materialImageClassificationSchema, {
    name: "material_image_classification",
    method: "jsonSchema",
    strict: true,
  });

  return classifier.invoke(
    buildImageMessage({
      publicUrl,
      prompt: `You are routing WhatsApp images for a construction site diary.

Task:
Decide whether this image should go to construction-material invoice extraction.

Return isMaterialDocument=true only when all of these are true:
1. The image is readable enough to inspect text.
2. It is a document-like source, such as an invoice, receipt, delivery note, bill of lading, purchase order, product label, price table, or supplier document.
3. It contains construction material or product line items, quantities, units, prices, invoice numbers, delivery references, or similar purchasing details.

Return isMaterialDocument=false for:
- normal site progress photos
- progress report images, site diary notes, work summaries, or instructions to save completed work
- selfies or people photos
- equipment-only photos
- drawings/plans without material purchase rows
- screenshots or chat messages without material line items
- unreadable, cropped, or blurry images
- documents that are not about construction materials

Confidence guidance:
- 0.90-1.00: clear material invoice/receipt/delivery note with readable rows
- 0.70-0.89: likely material document, but some fields are partly unclear
- 0.40-0.69: document-like image, but material rows are uncertain
- 0.00-0.39: not a material document or not readable

Be conservative. If material line items are not visible, return false.`,
    }),
    buildLangChainRunConfig({
      name: "MetaMaterialImageClassification",
      model: metaMaterialImageClassifierModel,
      publicUrl,
      context,
    }),
  );
}

function buildMaterialExtractionSchema(ids: string[]) {
  return z.object({
    items: z.array(z.object({
      name: z.string().describe("Invoice line name exactly as written in the document. Do not translate."),
      cost: z.number().describe("Line total cost for this invoice row. Use 0 only when no price or line total is visible."),
      invoiceNr : z.string().describe("Invoice, receipt, delivery note, or document number. Use an empty string if not visible."),
      invoiceDate : z.string().nullable().describe("Document date as an ISO string, for example 2025-12-04T00:00:00Z. Use null if not visible."),
      costCode: z.string().describe("Visible cost/project code. If no code is visible, generate a stable row code in order: CC-1001, CC-1002, CC-1003, ..."),
      quantity: z.number().describe("Quantity for this invoice row. Prefer the row quantity visible in the document; do not multiply by package size unless the document explicitly provides only package count and package size as the usable quantity."),
      construction_material_id: z.enum(ids as [string, ...string[]]).describe("Best matching category id from the allowed category list, or no_match.")
    }))
  })
}

type MaterialExtractionPayload = z.infer<ReturnType<typeof buildMaterialExtractionSchema>>

export async function extractBISMaterialsFromPublicUrl(args: {
  publicUrl: string
  context?: MetaMaterialContext | null
  categories?: typeof mockupCategories
}) {
  const categories = args.categories ?? mockupCategories
  const ids = [...categories.map(m => m.id), "no_match"];
  const responseSchema = buildMaterialExtractionSchema(ids)
  const extractionModel = "gpt-5.4";
  const llm = new ChatOpenAI({
    model: extractionModel,
    temperature: 0,
    useResponsesApi: true,
  });
  const extractor = llm.withStructuredOutput(responseSchema, {
    name: "material_invoice_extraction",
    method: "jsonSchema",
    strict: true,
  });

  return extractor.invoke(
    buildImageMessage({
      publicUrl: args.publicUrl,
      prompt: `You are extracting construction material purchases from one WhatsApp image.

Goal:
Return an object with an items array. Each item represents one invoice line that should be tracked from a construction material/spend invoice.

Include:
- construction materials and products
- tools, equipment, lighting, fixtures, consumables, pallets, packaging, deposits, and delivery/transport service rows when they are invoice lines related to the material purchase
- rows that do not match a BIS material category, using construction_material_id = no_match

Ignore only:
- VAT/tax-only rows
- totals, subtotals, balance due, payment rows, and discount summary rows
- unreadable rows

Allowed material categories:
${categories.map(c =>
                            `- ${c.id}: ${c.material_kind}; target_unit=${c.measurement_unit}`
                        ).join("\n")}

Output fields:
- name: copy the product/material name from the document in the original language. Do not translate or normalize brand names.
- invoiceNr: copy the invoice, receipt, delivery note, waybill, or document number. Use an empty string if no document number is visible.
- invoiceDate: use the document date when visible. If multiple dates exist, prefer invoice/receipt issue date over due date or delivery date. Return an ISO string at midnight UTC, for example 2025-12-04T00:00:00Z. Use null if no date is visible.
- costCode: copy a visible project/cost code from the document. If no row cost code is visible, generate a stable row code in invoice order: CC-1001, CC-1002, CC-1003, and so on.
- cost: use the line total for that material row, excluding VAT when both net and gross are visible. If only gross total is visible, use it. If only unit price is visible, multiply by the extracted invoice quantity. Use 0 only when no price is visible.
- construction_material_id: select the best id from the allowed material categories. Use no_match when none fits confidently.
- quantity: return the numeric quantity for the row.

Quantity rules:
1. Prefer the row quantity printed in the invoice table.
2. Preserve decimals. Convert comma decimals to dot decimals.
3. Do not multiply quantity by package size when the invoice already has a row quantity.
4. Use package size from the product name only when the printed row quantity is not directly usable.
5. If a category unit is tonnes and the visible row quantity is kilograms, convert kilograms to tonnes.
6. If the row unit is unclear, keep the visible numeric row quantity.

Category matching rules:
1. Match by material meaning, not by supplier or brand.
2. Prefer the most specific category that clearly matches the line item.
3. Do not force a category when the material kind is ambiguous.
4. Never output a category id that is not in the allowed list.

Examples:
- "80 maisi x Cements 25 kg" matched to a unit category means quantity = 80, the total amount can be calculated by user later.
- "5 gab. Grunts 10 L" matched to a unit category means quantity = 5.
- "Armatūra 12 mm, 120 m" matched to a meter category means quantity = 120.
- "1 palete bloki, 48 gab." matched to a piece category means quantity = 48.
- "10 kg Siešanas stieple" matched to a tonne category means quantity = 0.01.

Quality rules:
- Extract only facts visible in the image.
- If a row is unreadable, skip it.
- Do not merge distinct material rows unless the document itself groups them as one line.
- Return an empty items array if no material line item is readable.`,
    }),
    buildLangChainRunConfig({
      name: "MetaMaterialInvoiceExtraction",
      model: extractionModel,
      publicUrl: args.publicUrl,
      context: args.context,
    }),
  );
}

export function enrichBISMaterialPayload(
  payload: MaterialExtractionPayload,
  categories: typeof mockupCategories = mockupCategories,
) {
  const categoryMap = new Map(
    categories.map(c => [c.id, c])
  )

  return {
    items: payload.items.map(item => {
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
  }
}

export async function extractAndEnrichBISMaterialsFromPublicUrl(args: {
  publicUrl: string
  context?: MetaMaterialContext | null
  categories?: typeof mockupCategories
}) {
  const categories = args.categories ?? mockupCategories
  const payload = await extractBISMaterialsFromPublicUrl({
    publicUrl: args.publicUrl,
    context: args.context,
    categories,
  })

  return enrichBISMaterialPayload(payload, categories)
}

export async function processMaterialDocumentImageFromPublicUrl(args: {
  publicUrl: string;
  senderPhone?: string | null;
}) {
  if (
    process.env.RUN_AI_EVALS === "true" &&
    process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER === "true"
  ) {
    console.log("Meta material image classification skipped for AI eval image route");
    return false;
  }

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
    const payload = await extractAndEnrichBISMaterialsFromPublicUrl({
      publicUrl,
      context,
    })

    console.log(`THis is GPT output : ${JSON.stringify(payload)}`)
    console.log(`And this are categories : ${mockupCategories}`)

    await saveBISMaterialPayloadToDatabase(payload, publicUrl, context)

    return JSON.stringify(payload);
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
