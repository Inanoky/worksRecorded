// server/actions/BIS/getPerformedWorksRaw.ts

const BASE_URL = "https://test.bis.gov.lv";
const ACCESS_TOKEN =
  "7a4920b3ecd40a4073b0970e7e80a7cc85fdaa9740f03922d0432d699dc1b6be";

const CASE_ID = 384792;

async function main() {
  let page = 1;
  const pageSize = 100;
  const all: any[] = [];

  while (true) {
    const url =
      `${BASE_URL}/bisp/api/portal/bis_cases/${CASE_ID}/logbook/performed_works`

    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });

    if (!res.ok) {
      console.error("BIS error:", res.status, await res.text());
      return;
    }

    const json = await res.json();
    const data = json.data || [];
    all.push(...data);

    if (data.length < pageSize) break;
    page++;
  }

  // ✅ print FULL BIS response
  console.log(JSON.stringify(all, null, 2));
}

main();