// worksRecorded\app\api\webhook\meta\flow\route.ts

import crypto from "crypto";

export const runtime = "nodejs"; // IMPORTANT on Vercel (needs Node crypto)

const PRIVATE_KEY_PEM = Buffer.from(process.env.PRIVATE_KEY || "", "base64").toString("utf8");
const PASSPHRASE = process.env.PASSPHRASE || "";

const TAG_LENGTH = 16;

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();



  const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(
    body,
    PRIVATE_KEY_PEM,
    PASSPHRASE
  );

    console.log("========== META DECRYPTED BODY ==========");
  console.dir(decryptedBody, { depth: null });
  console.log("=========================================");


  const { screen, version, action } = decryptedBody;

  const responsePayload =
    action === "ping"
      ? { version: version || "3.0", data: { status: "active" } }
      : { screen: "SUCCESS", data: { status: "ok" } };

  const encrypted = encryptResponse(
    responsePayload,
    aesKeyBuffer,
    initialVectorBuffer
  );

  return new Response(encrypted, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

function decryptRequest(body: any, privatePem: string, passphrase: string) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const privateKeyObj = crypto.createPrivateKey({
    key: privatePem,
    format: "pem",
    passphrase,
  });

  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: privateKeyObj,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted_aes_key, "base64")
  );

  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const encryptedBody = flowDataBuffer.subarray(0, flowDataBuffer.length - TAG_LENGTH);
  const tag = flowDataBuffer.subarray(flowDataBuffer.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-128-gcm", decryptedAesKey, initialVectorBuffer);
  decipher.setAuthTag(tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encryptedBody),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
}

function encryptResponse(response: any, aesKeyBuffer: Buffer, initialVectorBuffer: Buffer) {
  const flippedIv = Buffer.alloc(initialVectorBuffer.length);
  for (let i = 0; i < initialVectorBuffer.length; i++) {
    flippedIv[i] = (~initialVectorBuffer[i]) & 0xff;
  }

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKeyBuffer, flippedIv);

  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();
  return Buffer.concat([ciphertext, tag]).toString("base64");
}