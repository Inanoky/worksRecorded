# WhatsApp Webhook Routing (Twilio + Meta)

This document explains how incoming WhatsApp messages are handled in this codebase for both providers:

- **Twilio webhook**: `app/api/webhook/whatsapp/route.ts`
- **Meta webhook**: `app/api/webhook/meta/webhook/route.ts`

It also explains how outbound replies are chosen between Twilio and Meta in:

- `lib/utils/whatsapp-helpers/shared/twillio.ts`

---

## 1) High-level architecture

Both webhook routes eventually delegate user messages into the same role-based handlers:

- Worker: `handleWorkerRoute(...)`
- Project manager: `handleProjectManagerRoute(...)`
- Site manager: `handleSiteManagerRoute(...)`

Those handlers rely on shared helper logic (`handleText`, `handleAudio`, `handleImage`, `projectSelector`, etc.) and call a shared `sendMessage(...)` helper for outbound replies.

---

## 2) Twilio route flow

File: `app/api/webhook/whatsapp/route.ts`

### 2.1 Request format

Twilio sends webhook payload as `FormData`.

Important fields read by this route include:

- `SmsStatus`
- `From`
- `WaId`
- `Body`
- `NumMedia`
- `MessageSid`/`SmsMessageSid`

### 2.2 Processing steps

1. Parse incoming `FormData`.
2. Ignore statuses other than `received`.
3. Normalize the sender phone via `normalizePhone(waId, from)`.
4. For text-only messages (`NumMedia === 0`), acquire a DB lock (`whatsappTextLock`) to avoid concurrent handling.
5. Resolve sender role:
   - `workers` table first
   - then `user` table with role lookup
6. Dispatch to role handler:
   - worker route
   - project manager route
   - site manager route (default)
7. Release lock in `finally`.

### 2.3 Twilio typing indicator

The Twilio route sends typing indicator events using Twilio’s typing indicator endpoint before full processing.

---

## 3) Meta route flow

File: `app/api/webhook/meta/webhook/route.ts`

### 3.1 GET verification

`GET` handles Meta webhook verification (`hub.mode`, `hub.verify_token`, `hub.challenge`).

### 3.2 POST processing

1. Parse JSON payload:
   - `entry[0].changes[0].value.messages[0]` for incoming message
   - `entry[0].changes[0].value.metadata.phone_number_id` for business number id
2. Send Meta typing indicator early for `text`, `image`, `audio` messages (`status: read` + `typing_indicator` payload).
3. Keep existing Meta-specific flows:
   - booking session flow (`book`, then service/date/time steps)
   - site-manager image messages are uploaded, classified with OpenAI, and either extracted into material records or saved as normal site photos
4. Run role-based WhatsApp routing (`runWhatsappRoutingForMeta`) for supported message types.
5. Mark message as read (read receipt call).

### 3.3 Twilio-like adapter in Meta route

Role handlers expect a Twilio-like `FormData` shape.  
Meta route builds that shape with `toTwilioLikeFormData(...)`:

- `From` => `whatsapp:+<meta_from>`
- `WaId` => `<meta_from>`
- `Body` => text body (if present)
- `MessageSid` => Meta message id
- `NumMedia` => `0` for text, `1` otherwise

This lets existing role handlers run without duplicating business logic.

For image messages, Meta route first resolves media metadata (`/{media-id}`) to obtain a temporary media URL and MIME type, then maps those into:

- `MediaUrl0`
- `MediaContentType0`
- `MediaProvider0 = "meta"` (so shared media downloader uses Meta bearer auth)

This allows shared image handlers to upload the photo once. Site-manager images are then classified: material documents are extracted into material records, while regular photos continue to be stored with the usual ✅ confirmation reply.

### 3.4 DB lock behavior in Meta route

Meta text messages use the same `whatsappTextLock` pattern:

- cleanup stale lock
- acquire lock for text
- release in `finally`

So rapid duplicate text events do not process concurrently.

---

## 4) Outbound reply routing (Twilio vs Meta)

File: `lib/utils/whatsapp-helpers/shared/twillio.ts`

### 4.1 Shared send helper

`sendMessage(to, message)` is used throughout role handlers.

### 4.2 Meta context

When Meta route invokes role processing, it wraps dispatch with:

- `runWithMetaReplyContext({ businessPhoneNumberId }, async () => ...)`

Inside that context, shared `sendMessage(...)` sends via Meta Graph API (`sendMetaMessage(...)`) to the incoming user.

Outside that context, `sendMessage(...)` defaults to Twilio:

- `from: SENDER_NUMBER`
- `client.messages.create(...)`

### 4.3 Practical outcome

- Message enters via **Meta webhook** -> replies are sent via **Meta number**.
- Message enters via **Twilio webhook** -> replies are sent via **Twilio number**.

---

## 5) Role handler entry points

Main role route files:

- `lib/utils/whatsapp-helpers/handling-roles-routes/worker.ts`
- `lib/utils/whatsapp-helpers/handling-roles-routes/project-manager-route.ts`
- `lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route.ts`

Worker core logic:

- `lib/utils/whatsapp-helpers/handling-roles-routes/worker-route.ts`

Shared processing helpers:

- `lib/utils/whatsapp-helpers/shared/handleText.ts`
- `lib/utils/whatsapp-helpers/shared/handleAudio.ts`
- `lib/utils/whatsapp-helpers/shared/handleImage.ts`
- `lib/utils/whatsapp-helpers/shared/projectSelector.ts`
- `lib/utils/whatsapp-helpers/shared/helpers.ts`

---

## 6) Notes / caveats

1. File name `twillio.ts` is intentionally kept as-is to match current imports.
2. Meta media payloads differ from Twilio media payloads; the adapter allows shared routing, but media handling details still depend on the helper implementations and message type data available in each provider payload.
3. If adding new provider-specific behavior, keep the role handlers provider-agnostic and contain protocol specifics in webhook routes + shared send context.
