import { z } from "zod";

const ExpectedWorkerResultSchema = z.object({
	clockInCardSent: z.boolean().optional(),
	clockOutClosed: z.boolean().optional(),
	workerIsClockedIn: z.boolean().optional(),
	workerDiaryRecordCreated: z.boolean().optional(),
	noUserDiaryRecord: z.boolean().default(true),
	noTimelogCreated: z.boolean().optional(),
	requiredDiaryTextSignals: z.array(z.string().min(1)).default([]),
	minHeuristicScore: z.number().min(0).max(1).default(0.75),
	warningValidators: z.array(z.string().min(1)).default([]),
});

export const WhatsAppWorkerEvalCaseSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	intent: z.string().min(1),
	notes: z.string().optional(),
	tags: z.array(z.string().min(1)).default([]),
	tier: z.enum(["smoke", "regression", "extended"]).default("regression"),
	priority: z.enum(["critical", "standard", "extended"]).default("standard"),
	setup: z
		.object({
			workerClockedIn: z.boolean().default(false),
			seedOpenTimelog: z.boolean().default(false),
		})
		.default({}),
	webhook: z.record(z.any()),
	expected: ExpectedWorkerResultSchema,
});

export const WhatsAppWorkerEvalSuiteSchema = z
	.array(WhatsAppWorkerEvalCaseSchema)
	.min(1);

export type WhatsAppWorkerEvalCase = z.infer<
	typeof WhatsAppWorkerEvalCaseSchema
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
										name: "Eval Worker",
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

export const whatsappWorkerEvalCases: WhatsAppWorkerEvalCase[] =
	WhatsAppWorkerEvalSuiteSchema.parse([
		{
			id: "worker-clock-in-card",
			intent:
				"Verify a worker clock-in request routes to the worker agent and sends a secure clock-in card without creating diary rows.",
			tags: ["clock-in", "card", "worker"],
			tier: "smoke",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-worker-clock-in",
				body: "clock in",
				timestamp: "1782197615",
			}),
			expected: {
				clockInCardSent: true,
				workerIsClockedIn: false,
				workerDiaryRecordCreated: false,
				noTimelogCreated: true,
			},
		},
		{
			id: "worker-clock-out",
			intent:
				"Verify a worker clock-out request closes the existing open timelog and does not create a site-manager diary row.",
			tags: ["clock-out", "timelog", "worker"],
			tier: "smoke",
			priority: "critical",
			setup: {
				workerClockedIn: true,
				seedOpenTimelog: true,
			},
			webhook: textWebhookFixture({
				senderKey: "eval-worker-clock-out",
				body: "clock out",
				timestamp: "1782197625",
			}),
			expected: {
				clockInCardSent: false,
				clockOutClosed: true,
				workerIsClockedIn: false,
				workerDiaryRecordCreated: false,
			},
		},
		{
			id: "worker-diary-text",
			intent:
				"Verify a worker work report is saved as a worker-owned site diary record, not as a site-manager record.",
			tags: ["diary", "save", "worker", "latvian"],
			tier: "smoke",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-worker-diary-text",
				body: "Šodien 2 stāvā montēju durvis, 5h",
				timestamp: "1782197635",
			}),
			expected: {
				clockInCardSent: false,
				workerDiaryRecordCreated: true,
				requiredDiaryTextSignals: ["durv", "2", "stāv", "5"],
			},
		},
		{
			id: "worker-ambiguous-latvian",
			intent:
				"Verify an ambiguous Latvian worker message does not incorrectly clock in, clock out, or save a diary row.",
			tags: ["ambiguity", "no-save", "worker", "latvian"],
			tier: "regression",
			webhook: textWebhookFixture({
				senderKey: "eval-worker-ambiguous-latvian",
				body: "Vai tas ir gatavs?",
				timestamp: "1782197645",
			}),
			expected: {
				clockInCardSent: false,
				workerDiaryRecordCreated: false,
				noTimelogCreated: true,
			},
		},
		{
			id: "worker-latvian-clock-in-card",
			intent:
				"Verify a Latvian worker clock-in request sends the same secure clock-in card without creating diary rows.",
			tags: ["clock-in", "card", "worker", "latvian"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-worker-latvian-clock-in",
				body: "Sākt darbu",
				timestamp: "1782197655",
			}),
			expected: {
				clockInCardSent: true,
				workerIsClockedIn: false,
				workerDiaryRecordCreated: false,
				noTimelogCreated: true,
			},
		},
		{
			id: "worker-latvian-clock-out",
			intent:
				"Verify a Latvian worker clock-out request closes the existing open timelog.",
			tags: ["clock-out", "timelog", "worker", "latvian"],
			tier: "regression",
			priority: "critical",
			setup: {
				workerClockedIn: true,
				seedOpenTimelog: true,
			},
			webhook: textWebhookFixture({
				senderKey: "eval-worker-latvian-clock-out",
				body: "Beigt darbu",
				timestamp: "1782197665",
			}),
			expected: {
				clockInCardSent: false,
				clockOutClosed: true,
				workerIsClockedIn: false,
				workerDiaryRecordCreated: false,
			},
		},
	]);
