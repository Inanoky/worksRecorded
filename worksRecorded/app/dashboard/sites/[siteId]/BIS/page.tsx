// worksRecorded\app\dashboard\sites\[siteId]\BIS\page.tsx

import { prisma } from "@/lib/utils/db"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"

import SendToBisButton from "./Components/send-to-bis-button"

const siteId = "5364389a-3d0b-4a0d-ab75-11f9118daa63"


// Upload image to BIS
async function uploadPhotoToBis(
  photoUrl: string,
  accessToken: string
) {

  const baseUrl = "https://test.bis.gov.lv"
  const BISCase = "384792"

  const imgResp = await fetch(photoUrl)
  const buffer = await imgResp.arrayBuffer()

  const blob = new Blob(
    [buffer],
    { type: imgResp.headers.get("content-type") || "image/jpeg" }
  )

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
    }
  )

  const json = await res.json()

  return json?.data?.attributes?.temp_uuid
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

  const baseUrl = "https://test.bis.gov.lv"
  const BISCase = "384792"

  let attachments: any[] = []

  if (sourcePhoto) {

    const temp_uuid = await uploadPhotoToBis(
      sourcePhoto,
      accessToken!
    )

    if (temp_uuid) {

      await new Promise(r => setTimeout(r, 1000))

      attachments.push({
        type: "shared_attachments",
        uuid: temp_uuid
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
          data: attachments
        }

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
    }
  )

  const json = await res.json()

  const bisId = json?.data?.id

  if (bisId) {

    await prisma.bISmaterialRecords.update({
      where: { id: recordId },
      data: { BISId: bisId }
    })

  }

  return json
}



export default async function MaterialsTable() {

  const materials = await prisma.bISmaterialRecords.findMany({
    where: { siteId },
  })

  return (
    <div className="rounded-xl border bg-white shadow-sm">

      <Table>

        <TableHeader>
          <TableRow>
            <TableHead>Photo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>

          {materials.map((r) => (

            <TableRow key={r.id}>

              <TableCell>

                {r.sourcePhoto && (
                  <img
                    src={r.sourcePhoto}
                    className="h-12 w-12 rounded object-cover border"
                  />
                )}

              </TableCell>

              <TableCell className="font-medium">
                {r.name}
              </TableCell>

              <TableCell>
                {r.quantity}
              </TableCell>

              <TableCell>
                {r.categoryName}
              </TableCell>

              <TableCell>
                {r.measurementUnit}
              </TableCell>

              <TableCell className="text-right">

                {!r.BISId ? (

                  <SendToBisButton
                    recordId={r.id}
                    quantity={r.quantity ?? 0}
                    categoryId={r.categoryId ?? ""}
                    sourcePhoto={r.sourcePhoto ?? ""}
                    action={sendToBis}
                  />

                ) : (

                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Approve
                  </Button>

                )}

              </TableCell>

            </TableRow>

          ))}

        </TableBody>

      </Table>

    </div>
  )
}