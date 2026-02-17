
const BASE_URL = "https://test.bis.gov.lv";
const APP_ID =
  "8210d144c34ffabaa6f949a7773b050edf168970e32f1281e1ab82761b791cc4";

const ACCESS_TOKEN = process.env.BIS_TOKEN;

async function deleteApp() {
  const res = await fetch(
    `${BASE_URL}/bisp/api/auth/oauth2.0/registration/${APP_ID}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

deleteApp();