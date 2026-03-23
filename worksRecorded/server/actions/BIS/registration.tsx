
import fetch from "node-fetch"; 

const url = "https://test.bis.gov.lv/services/auth/oauth2.0/registration";

const body = {
  client_name: "Buvconsult",
  client_description: "Buvconsult BIS Integration",
  person_code: "25129112961",
  redirect_uri: "https://localhost:3000/",
  scopes: "bis_case_documents:manage projects:manage logbooks:manage",
};

async function main() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:\n", text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();