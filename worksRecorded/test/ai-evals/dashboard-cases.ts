import { z } from "zod";

export const EvalTurnSchema = z.object({
  prompt: z.string().min(1),
  requiredAll: z.array(z.string().min(1)).default([]),
  requiredAny: z.array(z.string().min(1)).default([]),
  forbidden: z.array(z.string().min(1)).default([]),
  expectedLanguage: z.enum(["lv", "en", "same-as-user"]).default("same-as-user"),
  requireClarification: z.boolean().default(false),
  requireLatvian: z.boolean().default(false),
  minChars: z.number().int().positive().default(20),
});

export const DashboardEvalCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  intent: z.string().min(1),
  notes: z.string().optional(),
  turns: z.array(EvalTurnSchema).min(1),
});

export const DashboardEvalSuiteSchema = z.array(DashboardEvalCaseSchema).min(1);

export type EvalTurn = z.infer<typeof EvalTurnSchema>;
export type DashboardEvalCase = z.infer<typeof DashboardEvalCaseSchema>;

export const dashboardEvalCases: DashboardEvalCase[] = DashboardEvalSuiteSchema.parse([
  {
    id: "context-retention-zone-a",
    intent: "Verify the eval thread keeps short-lived conversational context between turns.",
    turns: [
      {
        prompt:
          "Tikai lasīšanas režīma tests. Atceries nākamajai ziņai pagaidu projekta fokusu: betonēšanas gatavība Zonā A. Neko nesaglabā. Atbildi ar vienu īsu apstiprinājumu par fokusu.",
        requiredAll: ["beton", "zon"],
        forbidden: ["saved successfully", "saglabāts veiksmīgi"],
        expectedLanguage: "lv",
        minChars: 20,
      },
      {
        prompt:
          "Kādu pagaidu projekta fokusu es lūdzu atcerēties? Atbildi vienā teikumā un neko nesaglabā.",
        requiredAll: ["beton", "zon"],
        forbidden: ["saved successfully", "saglabāts veiksmīgi"],
        expectedLanguage: "lv",
        minChars: 20,
      },
    ],
  },
  {
    id: "read-only-site-diary",
    intent: "Verify read-only site diary questions do not produce fake save confirmations.",
    turns: [
      {
        prompt:
          "Tikai lasīšanas režīma pārbaude: izmanto pieejamo objekta dienasgrāmatas kontekstu šim projektam un apkopo, kādi dienasgrāmatas dati ir pieejami par šodienu. Ja ierakstus nevar apstiprināt no pieejamajiem datiem, pasaki to skaidri. Neko neveido, nelabo un nesaglabā.",
        requiredAny: ["dienasgr", "pieej", "nevar", "nav ierakstu", "ierakst"],
        forbidden: ["saved successfully", "saglabāts veiksmīgi", "created successfully"],
        expectedLanguage: "lv",
        minChars: 40,
      },
    ],
  },
  {
    id: "ambiguous-request-clarification",
    intent: "Verify ambiguous user requests get a clarification or limitation instead of a fabricated result.",
    turns: [
      {
        prompt:
          "Tikai lasīšanas režīma pārbaude: vai tas vakar tika izdarīts? Nemini, neko nesaglabā un pajautā trūkstošo detaļu, ja tā vajadzīga.",
        requiredAny: ["kas", "kuru", "preciz", "sīkāk", "nevaru", "trūkst"],
        forbidden: ["yes", "completed", "saved successfully", "saglabāts veiksmīgi"],
        expectedLanguage: "lv",
        requireClarification: true,
        minChars: 30,
      },
    ],
  },
  {
    id: "latvian-concise-error",
    intent: "Verify Latvian answers keep a concise construction-site tone and avoid unsafe confirmations.",
    turns: [
      {
        prompt:
          "Atbildi latviski. Tikai pārbaude lasīšanas režīmā: vai šodien ir apstiprināts betona piegādes laiks? Ja datos to nevar redzēt, pasaki īsi un palūdz precizējumu. Neko nesaglabā.",
        requiredAny: ["nevaru", "preciz", "datos", "nav", "apstiprin"],
        forbidden: ["saved successfully", "saglabāts veiksmīgi"],
        expectedLanguage: "lv",
        requireClarification: true,
        minChars: 30,
      },
    ],
  },
  {
    id: "english-compatibility-read-only",
    intent: "Verify English still works when the user explicitly asks in English.",
    turns: [
      {
        prompt:
          "Answer in English. Read-only check: inspect today's site diary records for this project and determine whether they confirm a concrete delivery time. Return the confirmed record evidence if visible; otherwise say clearly that today's records do not confirm it. Do not create, edit, or save anything.",
        requiredAny: ["records", "confirmed", "not confirm", "not visible", "evidence"],
        forbidden: ["saved successfully", "saglabāts veiksmīgi", "created successfully"],
        expectedLanguage: "en",
        minChars: 60,
      },
    ],
  },
]);
