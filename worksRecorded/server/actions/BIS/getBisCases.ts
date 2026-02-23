const BASE_URL = "https://test.bis.gov.lv";
const ACCESS_TOKEN =
  "3bebeb0339a816b77f8e7bfdfef16d8f91a1158f1ce53f9d1402fdd067e0ff98";

async function main() {
  let page = 1;
  const pageSize = 100;
  const all: any[] = [];

  while (true) {
    const url =
      `${BASE_URL}/bisp/api/portal/bis_cases` +
      `?page[number]=${page}&page[size]=${pageSize}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const json = await res.json();
    const data = json.data || [];
    all.push(...data);

    if (data.length < pageSize) break;
    page++;
  }

  console.log(
    JSON.stringify(
      all.map((x) => ({
        id: x.id,
        number: x.attributes?.bis_case_number,
        name: x.attributes?.bis_case_name,
        stage: x.attributes?.stage_name,
        board: x.attributes?.construction_board_name,
        intention_date: x.attributes?.intention_date,
      })),
      null,
      2
    )
  );
}

main();
