import OpenAI from "openai";

const openai = new OpenAI();

async function main() {
  const file = await openai.files.content("file-4AgQRThgU6pDKE8CbZso36");

  console.log(file);
}

main();