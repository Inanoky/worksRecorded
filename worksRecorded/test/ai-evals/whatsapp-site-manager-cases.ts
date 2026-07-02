import { z } from "zod";

const ExpectedSavedRecordSchema = z.object({
  requiredTextSignals: z.array(z.string().min(1)).default([]),
  requiredAnswerSignals: z.array(z.string().min(1)).default([]),
  forbiddenAnswerSignals: z.array(z.string().min(1)).default([]),
  workersInvolved: z.number().positive().nullable().optional(),
  timeInvolved: z.number().positive().optional(),
  minHeuristicScore: z.number().min(0).max(1).default(0.75),
});

export const WhatsAppSiteManagerEvalCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  intent: z.string().min(1),
  notes: z.string().optional(),
  webhook: z.record(z.any()),
  expected: ExpectedSavedRecordSchema,
});

export const WhatsAppSiteManagerEvalSuiteSchema = z
  .array(WhatsAppSiteManagerEvalCaseSchema)
  .min(1);

export type WhatsAppSiteManagerEvalCase = z.infer<
  typeof WhatsAppSiteManagerEvalCaseSchema
>;

function textWebhookFixture(args: {
  senderKey: string;
  body: string;
  timestamp: string;
}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "eval-waba",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "37127445304",
                phone_number_id: "eval-business-phone",
              },
              contacts: [
                {
                  profile: {
                    name: "Eval Site Manager",
                  },
                  wa_id: "37129391891",
                  user_id: `LV.${args.senderKey}`,
                },
              ],
              messages: [
                {
                  from: "37129391891",
                  from_user_id: `LV.${args.senderKey}`,
                  id: `wamid.${args.senderKey}`,
                  timestamp: args.timestamp,
                  text: {
                    body: args.body,
                  },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

export const whatsappSiteManagerEvalCases: WhatsAppSiteManagerEvalCase[] =
  WhatsAppSiteManagerEvalSuiteSchema.parse([
    {
      id: "latvian-floor-work-text",
      intent:
        "Verify a Latvian Meta text webhook from a site manager is saved as a structured site diary record.",
      notes:
        "Based on a real received Meta webhook, with phone, business ID, and message ID sanitized by the runner.",
      webhook: textWebhookFixture({
        senderKey: "eval-site-manager-text",
        body: "Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
        timestamp: "1782197575",
      }),
      expected: {
        requiredTextSignals: ["grīd", "3", "stāv"],
        workersInvolved: 2,
        timeInvolved: 3,
        minHeuristicScore: 0.75,
      },
    },
    {
      id: "latvian-wall-plaster-hours-without-workers",
      intent:
        "Verify a Latvian site-manager text webhook leaves workers empty when work and hours are reported without an explicit worker count.",
      notes:
        "Covers nullable worker counts for normal site diary rows when the source does not state a count.",
      webhook: textWebhookFixture({
        senderKey: "eval-site-manager-without-workers",
        body: "Šodien apmestas sienas 2 stāvā, 4h",
        timestamp: "1782197585",
      }),
      expected: {
        requiredTextSignals: ["apmest", "sien", "2", "stāv"],
        workersInvolved: null,
        timeInvolved: 4,
        minHeuristicScore: 0.75,
      },
    },
    {
      id: "latvian-multiple-works-total-hours-no-split",
      intent:
        "Verify multiple mentioned works with one total duration stay as one site diary record when the duration cannot be safely split.",
      notes:
        "Protects against duplicating or arbitrarily splitting total hours across pipes, sewer, and radiator work.",
      webhook: textWebhookFixture({
        senderKey: "eval-site-manager-total-hours-no-split",
        body: "Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
        timestamp: "1782197595",
      }),
      expected: {
        requiredTextSignals: ["ūdens", "kanaliz", "radiator"],
        workersInvolved: null,
        timeInvolved: 12,
        minHeuristicScore: 0.75,
      },
    },
    {
      id: "ambigious-bis-mention-in-task-decritpion",
      intent:
        "Verify a BIS-mentioned WhatsApp request with real work details is saved as a normal site diary record while explaining BIS submission must be done in the web app.",
      notes:
        "Regression for a production ambiguity where the assistant treated a BIS mention as only guidance instead of saving the described cleaning work.",
      webhook: textWebhookFixture({
        senderKey: "eval-site-manager-bis-cleaning-ambiguous",
        body: "izveido ierakstu priekš BIS sistēmas par to, ka tiek veikti objekta uzkopšans darbi",
        timestamp: "1782197615",
      }),
      expected: {
        requiredTextSignals: ["uzkopš", "objekt"],
        requiredAnswerSignals: ["saglab", "bis", "worksrecorded|pārlūk|portāl"],
        forbiddenAnswerSignals: [
          "nosūtīts uz bis",
          "pievienots bis",
          "bis ieraksts izveidots",
          "submitted to bis",
        ],
        workersInvolved: null,
        minHeuristicScore: 0.75,
      },
    },
    {
      id: "latvian-word-number-workers",
      intent:
        "Verify Latvian word-number worker counts are extracted into the structured worker field.",
      notes:
        "Covers non-digit worker extraction from phrases like trīs strādnieki.",
      webhook: textWebhookFixture({
        senderKey: "eval-site-manager-word-number-workers",
        body: "Šodien montēti pārseguma paneļi 1 stāvā, trīs strādnieki, 6h",
        timestamp: "1782197605",
      }),
      expected: {
        requiredTextSignals: ["pārseg", "paneļ", "1", "stāv"],
        workersInvolved: 3,
        timeInvolved: 6,
        minHeuristicScore: 0.75,
      },
    },
  ]);
