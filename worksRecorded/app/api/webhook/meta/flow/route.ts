import crypto from "crypto";

const PRIVATE_KEY = (process.env.PRIVATE_KEY || "").replace(/\\n/g, "\n");
const PASSPHRASE = process.env.PASSPHRASE || "";

const TAG_LENGTH = 16;

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();

  const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(
    body,
    PRIVATE_KEY
  );

  const { screen, version, action } = decryptedBody;

  const responsePayload =
    action === "ping"
      ? { version: version || "3.0", data: { status: "active" } }
      : { screen: screen || "SUCCESS", data: { status: "ok" } };

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

function decryptRequest(body: any, privatePem: string) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: crypto.createPrivateKey({
        key: privatePem,
        passphrase: PASSPHRASE,
      }),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted_aes_key, "base64")
  );

  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const encryptedBody = flowDataBuffer.subarray(
    0,
    flowDataBuffer.length - TAG_LENGTH
  );
  const tag = flowDataBuffer.subarray(flowDataBuffer.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(
    "aes-128-gcm",
    decryptedAesKey,
    initialVectorBuffer
  );
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

function encryptResponse(
  response: any,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
) {
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