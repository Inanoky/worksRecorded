// server/actions/BIS/createPerformedWork.ts
// bun run server/actions/BIS/createPerformedWork.ts

const BASE_URL = "https://test.bis.gov.lv";
const ACCESS_TOKEN =
  "2a1b3fd37e45589af83253d869221b908fb6d1b12861d369c22c2e24909c4d36";

const CASE_ID = 384792;

async function main() {
  const url =
    `${BASE_URL}/bisp/api/portal/bis_cases/${CASE_ID}/logbook/performed_works`;

  const payload = {
    data: {
      type: "performed_work",
      attributes: {
        event_date: "24.02.2025",
        case_construction_round_id: null,
        event_time_from: "13:00",
        responsible_person_id: 2759822,
        responsible_person_type: "construction_member",
        description: "Record with attachment",
        project_document_ids: [],
      },
      relationships: {
        detail: {
          data: {
            type: "performed_work",
            attributes: {
              employees: 1,
              quantity: 1,
              measurement: 12,
            },
          },
        },
          attachments: { // (optional)
                "data": [
                    { type: "shared_attachments", uuid: "0cb38aa2-e8dc-4ea8-bc76-46f1246bac36"}
               
                ]
            },
       
       
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("BIS error:", res.status, await res.text());
    return;
  }

  const json = await res.json();

  console.log("✅ Created performed work:");
  console.log(JSON.stringify(json, null, 2));
}

main();