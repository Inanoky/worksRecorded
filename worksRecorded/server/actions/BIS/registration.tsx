
import fetch from "node-fetch"; 

const url = "https://bis.gov.lv/services/auth/oauth2.0/registration";

const body = {
  client_name: "Buvconsult",
  client_description: "Buvconsult BIS Integration",
  person_code: "251291-12961",
  redirect_uri: "http://buvconsult.com/api/webhook/bis/callback",
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