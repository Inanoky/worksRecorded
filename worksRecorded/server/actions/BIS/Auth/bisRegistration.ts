// register-bis-app.ts
// Send BIS OAuth app registration request

const BIS_BASE_URL = "https://bis.gov.lv"; // change to test env if needed

async function main() {
  const url = `${BIS_BASE_URL}/services/auth/oauth2.0/registration`;

  const payload = {
    client_name: "Buvconsult",
    client_description: "Buvconsult app",
    person_code: "25129112961",
    redirect_uri: "https://worksrecorded.com/api/bis/callback",
    scopes: "bis_case_documents:read bis_case_documents:manage logbooks:read logbooks:manage"
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();

    console.log("Status:", res.status);
    console.log("Response:");
    console.log(text);

  } catch (err) {
    console.error("Error:", err);
  }
}

main();
