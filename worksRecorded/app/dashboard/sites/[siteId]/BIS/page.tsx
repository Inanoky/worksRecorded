import { prisma } from "@/lib/utils/db"
import MaterialsTableClient from "./Components/materials-table-client"

// Upload image to BIS
async function uploadPhotoToBis(photoUrl: string, accessToken: string) {
  const baseUrl = "https://test.bis.gov.lv"
  const BISCase = "384792"

  const imgResp = await fetch(photoUrl, { cache: "no-store" })
  const buffer = await imgResp.arrayBuffer()

  const blob = new Blob([buffer], {
    type: imgResp.headers.get("content-type") || "image/jpeg",
  })

  const form = new FormData()
  form.append("upload[file]", blob, "photo.jpg")
  form.append("upload[obj_id]", crypto.randomUUID())

  const res = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${BISCase}/logbook/received_construction_product_attachments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error("Failed to upload photo to BIS")
  }

  const json = await res.json()
  return json?.data?.attributes?.temp_uuid as string | undefined
}

// SERVER ACTION
export async function sendToBis(
  recordId: string,
  quantity: number,
  construction_material_id: string,
  sourcePhoto?: string
) {
  "use server"

  const row = await prisma.bisToken.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { accessToken: true },
  })

  const accessToken = row?.accessToken
  if (!accessToken) {
    throw new Error("No BIS access token found")
  }

  const baseUrl = "https://test.bis.gov.lv"
  const BISCase = "384792"

  const attachments: Array<{ type: string; uuid: string }> = []

  if (sourcePhoto) {
    const temp_uuid = await uploadPhotoToBis(sourcePhoto, accessToken)

    if (temp_uuid) {
      await new Promise((r) => setTimeout(r, 1000))

      attachments.push({
        type: "shared_attachments",
        uuid: temp_uuid,
      })
    }
  }

  const body = {
    data: {
      type: "received_construction_product",
      attributes: {
        event_date: "2024-04-01",
        event_time_from: "09:30",
      },
      relationships: {
        detail: {
          data: {
            type: "received_construction_product",
            attributes: {
              quantity,
              construction_material_id,
            },
          },
        },
        attachments: {
          data: attachments,
        },
      },
    },
  }

  const res = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${BISCase}/logbook/received_construction_products`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  )

  const json = await res.json()
  const bisId = json?.data?.id

  if (bisId) {
    await prisma.bISmaterialRecords.update({
      where: { id: recordId },
      data: { BISId: bisId },
    })
  }

  return json
}

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params

  const materials = await prisma.bISmaterialRecords.findMany({
    where: { siteId },
    orderBy: [{ invoiceDate: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      quantity: true,
      categoryId: true,
      categoryName: true,
      measurementUnitId: true,
      measurementUnit: true,
      cost: true,
      invoiceNr: true,
      invoiceDate: true,
      costCode: true,
      sourcePhoto: true,
      BISId: true,
    },
  })

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">BIS Materials</h1>
        <p className="text-sm text-muted-foreground">
          Review material records, filter them, and send missing entries to BIS.
        </p>
      </div>

      <MaterialsTableClient materials={materials} sendToBis={sendToBis} />
    </div>
  )
}