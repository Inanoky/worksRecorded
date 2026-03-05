// worksRecorded\server\actions\BIS\uploadImage.ts

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

  console.log(JSON.stringify(json, null, 2))

  return json?.data?.attributes?.temp_uuid
}

const photoUrl = "https://reect1noxp.ufs.sh/f/HPU3nx2LdstJVqK4itDFPti24r7JovzAjSqYOb6QWV0MaCk9"
const accessToken = "1179f65ff0b7edc0db06f3fb763439457af0aa47457682729c2dc7e58d1ae17b"

uploadPhotoToBis(photoUrl, accessToken)