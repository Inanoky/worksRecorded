const ACCESS_TOKEN = process.env.PROCORE_ACCESS_TOKEN
const COMPANY_ID = 4280289;
const PROJECT_ID = 312805;

const res = await fetch(`https://sandbox.procore.com/rest/v1.0/projects/${PROJECT_ID}/locations`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Procore-Company-Id": COMPANY_ID.toString(),
  },
});

console.log("Status:", res.status);
console.log(await res.json());