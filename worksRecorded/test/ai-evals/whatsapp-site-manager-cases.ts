import { z } from "zod";

const ExpectedSavedRecordSchema = z.object({
  requiredTextSignals: z.array(z.string().min(1)).default([]),
  workersInvolved: z.number().positive().optional(),
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
      id: "latvian-wall-plaster-hours-implied-one-worker",
      intent:
        "Verify a Latvian site-manager text webhook infers one worker when work and hours are reported without an explicit worker count.",
      notes:
        "Covers the default worker-count policy for normal site diary rows: completed work implies one worker unless the source says otherwise.",
      webhook: textWebhookFixture({
        senderKey: "eval-site-manager-implied-one-worker",
        body: "Šodien apmestas sienas 2 stāvā, 4h",
        timestamp: "1782197585",
      }),
      expected: {
        requiredTextSignals: ["apmest", "sien", "2", "stāv"],
        workersInvolved: 1,
        timeInvolved: 4,
        minHeuristicScore: 0.75,
      },
    },
  ]);
