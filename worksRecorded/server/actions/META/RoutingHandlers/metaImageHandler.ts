// download_media.js

import { Type } from "lucide-react";
import { UTApi } from "uploadthing/server";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { gptExtractorForDocumentsModel, } from "@/server/ai-flows/ai-models-settings";
import { prisma } from "@/lib/utils/db";
import { refreshToken } from "../../BIS/Auth/refreshToken";
import { savePhoto } from "../../site-diary-actions";


//-------------------------------------Utilities--------------------------------

const TOKEN = process.env.META_ACCESS_TOKEN

const MEDIA_ID = "26074750412178653"

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


const utapi = new UTApi();


//And this we use to download and store photo from Meta message


// STEP 1 - download media from META
export async function downloadMetaMedia(mediaId) {

    
    const userId = "kp_d9afeea81ab6410c83507bd957997476"
    const orgId = "b43abb39-2ab6-4df4-8b1e-6a010b7dec70"
    const siteId = "5364389a-3d0b-4a0d-ab75-11f9118daa63"


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

    const publicUrl = first.data.ufsUrl ?? first.data.url; //Get Upload URL

    
    //Here I also need to save this to the correct siteId. 

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


    console.dir(data, { depth: null });


    return (data); //I mean it probably I need to convert to array of string of cases or something I dunno


}



export async function sendToGpt(mediaId) {

    const { publicUrl, file } = await downloadMetaMedia(mediaId)

    const categories = await getBisCategories_12I7_075()

    const ids = [...categories.map(m => m.id), "no_match"];






    const responseSchema = z.object({

        items: z.array(z.object({

            name: z.string(),
            quantity: z.number().describe(`Each item convert to the measurement from corresponding measurement_unit`),
            construction_material_id: z.enum(ids)
        }))



    })








    const gptDocumentResponse = await client.responses.create({
        model: "gpt-5.1",
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
- name (English)
- quantity
- construction_material_id

Available categories:

${categories.map(c =>
                            `${c.id} | ${c.material_kind} | unit: ${c.measurement_unit}`
                        ).join("\n")}

Rules:

1. Match each invoice item to the best material_kind.
2. If nothing matches, return "no_match".
3. Quantity MUST be converted to the unit of the selected category.
4. If the invoice unit is "gabals", "iepakojums", "pack", "bag", etc, extract the real weight or volume from the product name.

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
    });

    const payload = JSON.parse(gptDocumentResponse.output_text)

    console.log(gptDocumentResponse.output_text)

    await saveBISMaterialPayloadToDatabase(payload,publicUrl)

    return gptDocumentResponse.output_text;






}

//Ok now need to save the response
export async function saveBISMaterialPayloadToDatabase(payload, publicURL) {


    const userId = "kp_d9afeea81ab6410c83507bd957997476"
    const orgId = "b43abb39-2ab6-4df4-8b1e-6a010b7dec70"
    const siteId = "5364389a-3d0b-4a0d-ab75-11f9118daa63"




    await prisma.BISmaterialRecords.createMany({

        data: payload.items.map(item => ({

            name: item.name,
            quantity: item.quantity,
            category: item.construction_material_id,
            sourcePhoto: publicURL,
            siteId,
            orgId,
            userId



        }))
    })



}





// const URL = await downloadMetaMedia(MEDIA_ID)

// console.log(URL)

// getBisCategories_12I7_075()
// getBISMeasurments_12I7_061()

sendToGpt(MEDIA_ID)