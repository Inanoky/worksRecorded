// scripts/create-kinde-user.ts
// Run with: node scripts/create-kinde-user.ts
// Node 18+ (fetch available)

const KINDE_DOMAIN = process.env.KINDE_DOMAIN; // buvconsultdeploy.kinde.com
const M2M_CLIENT_ID = process.env.KINDE_M2M_CLIENT_ID;
const M2M_CLIENT_SECRET = process.env.KINDE_M2M_CLIENT_SECRET;
const KINDE_AUDIENCE = process.env.KINDE_AUDIENCE || `https://${KINDE_DOMAIN}/api`;




if (!KINDE_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
  throw new Error("Missing KINDE_DOMAIN / KINDE_M2M_CLIENT_ID / KINDE_M2M_CLIENT_SECRET");
}

// =====================
// HARD-CODE USER HERE
// =====================
const USERNAME = "ivars_paeglis";
const PASSWORD = "Demo123!"; // will be bcrypt-hashed
const GIVEN_NAME = "Ivars";
const FAMILY_NAME = "Paeglis";

// =====================
// HELPERS
// =====================
async function getM2MToken(): Promise<string> {
  const res = await fetch(`https://${KINDE_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: M2M_CLIENT_ID!,
      client_secret: M2M_CLIENT_SECRET!,
      audience: KINDE_AUDIENCE,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || JSON.stringify(data));
  }
  return data.access_token;
}

async function bcryptHash(password: string): Promise<string> {
  const { hash } = await import("bcryptjs");
  return hash(password, 10);
}

// =====================
// MAIN
// =====================
async function main() {
  const token = await getM2MToken();

  // 1) Create user with username identity
  const createRes = await fetch(`https://${KINDE_DOMAIN}/api/v1/user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile: {
        given_name: GIVEN_NAME,
        family_name: FAMILY_NAME,
      },
      identities: [
        {
          type: "username",
          details: { username: USERNAME },
        },
      ],
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createData?.message || JSON.stringify(createData));
  }

  const userId = createData.id || createData.user_id;
  if (!userId) {
    throw new Error("User created but no user id returned");
  }

  // 2) Set password (hashed)
  const hashedPassword = await bcryptHash(PASSWORD);

  const pwdRes = await fetch(
    `https://${KINDE_DOMAIN}/api/v1/users/${userId}/password`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hashed_password: hashedPassword,
      }),
    }
  );

  if (!pwdRes.ok) {
    const err = await pwdRes.text();
    throw new Error(err);
  }

  console.log("✅ User created");
  console.log("Username:", USERNAME);
  console.log("Password:", PASSWORD);
  console.log("User ID:", userId);
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
