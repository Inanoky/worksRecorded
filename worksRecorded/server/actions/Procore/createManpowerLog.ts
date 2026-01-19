const ACCESS_TOKEN = process.env.PROCORE_ACCESS_TOKEN
const COMPANY_ID = 4280289;
const PROJECT_ID = 312805;

const url = `https://sandbox.procore.com/rest/v1.0/projects/${PROJECT_ID}/manpower_logs`;

const body = {
  manpower_log: {
    datetime: "2026-01-12T08:00:00Z",
    notes: "Manpower log via Bun fetch",
    num_workers: 5,
    num_hours: "8",
  },
};

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "Procore-Company-Id": COMPANY_ID.toString(),
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const data = await response.json();

console.log("Status:", response.status);
console.log("Response:", data);
