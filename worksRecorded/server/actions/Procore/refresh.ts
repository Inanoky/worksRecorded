const response = await fetch(
  "https://login-sandbox.procore.com/oauth/token",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "HVGlnvcHoKriVNHa4tJbdaVI1FUJTN48wRS_u3wFt58",
      client_secret: "UE1euteXQmT2P_-d9nGIsLvdBzjztfZyagDG-wgz5CM",
      refresh_token: "GErHTn4LbwadclrMxGLs9BfsBYQgvUh4ZyaKqjKasM8",
    }),
  }
);

const data = await response.json();

console.log("Status:", response.status);
console.log("Token response:", data);