const ACCESS_TOKEN = "eyJhbGciOiJFUzUxMiJ9.eyJhbXIiOltdLCJhaWQiOiJIVkdsbnZjSG9LcmlWTkhhNHRKYmRhVkkxRlVKVE40OHdSU191M3dGdDU4IiwiYW91aWQiOm51bGwsImFvdXVpZCI6bnVsbCwiZXhwIjoxNzY4MjM5MjI0LCJzaWF0IjpudWxsLCJ1aWQiOjE3MTM2MSwidXVpZCI6IjllNGI2MWIzLThhODctNGZjMi1hMGI1LTM4YjAxZTk4MWM3MyIsImxhc3RfbWZhX2NoZWNrIjoxNzY4MjI5MzQ0fQ.AMkY_eR2R8JCylo3vPhgsedh1eLcfJyc8EvW28kOV7OgtbxGGYyiiNQop4l9c5XWZgEV0Qi27feSISebm5u9kxwsACNzJQE1jsJlfx3y2QF2YtTVZT9_Txtur_ovr9iNs7Cmzl5kVuKvZq9sxDyuKa1dHON-0YJnDZv8p1EJ_0UCSek5";
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
