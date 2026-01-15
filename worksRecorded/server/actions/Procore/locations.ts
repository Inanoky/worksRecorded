const ACCESS_TOKEN = "eyJhbGciOiJFUzUxMiJ9.eyJhbXIiOltdLCJhaWQiOiJIVkdsbnZjSG9LcmlWTkhhNHRKYmRhVkkxRlVKVE40OHdSU191M3dGdDU4IiwiYW91aWQiOm51bGwsImFvdXVpZCI6bnVsbCwiZXhwIjoxNzY4MjM5MjI0LCJzaWF0IjpudWxsLCJ1aWQiOjE3MTM2MSwidXVpZCI6IjllNGI2MWIzLThhODctNGZjMi1hMGI1LTM4YjAxZTk4MWM3MyIsImxhc3RfbWZhX2NoZWNrIjoxNzY4MjI5MzQ0fQ.AMkY_eR2R8JCylo3vPhgsedh1eLcfJyc8EvW28kOV7OgtbxGGYyiiNQop4l9c5XWZgEV0Qi27feSISebm5u9kxwsACNzJQE1jsJlfx3y2QF2YtTVZT9_Txtur_ovr9iNs7Cmzl5kVuKvZq9sxDyuKa1dHON-0YJnDZv8p1EJ_0UCSek5";
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