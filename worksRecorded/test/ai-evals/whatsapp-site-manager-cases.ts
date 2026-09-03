import { z } from "zod";

const SiteDiaryRecordFieldSignalsSchema = z
	.record(z.array(z.string().min(1)))
	.default({});

const ExpectedSiteDiaryRecordSchema = z.object({
	requiredTextSignals: z.array(z.string().min(1)).default([]),
	requiredFieldSignals: SiteDiaryRecordFieldSignalsSchema,
	forbiddenFieldSignals: SiteDiaryRecordFieldSignalsSchema,
	workersInvolved: z.number().nonnegative().nullable().optional(),
	timeInvolved: z.number().nonnegative().nullable().optional(),
	amounts: z.number().nonnegative().nullable().optional(),
	units: z.string().min(1).optional(),
	nullNumericValuesCanBeZero: z.boolean().default(false),
});

const ExpectedSavedRecordSchema = z.object({
	shouldCreateRecord: z.boolean().default(true),
	expectedRecordCount: z.number().int().nonnegative().optional(),
	expectedPhotoCount: z.number().int().nonnegative().optional(),
	expectedPhotoPurpose: z.enum(["site_diary", "warehouse_invoice"]).optional(),
	expectedPhotoDateISO: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	expectedWarehousePhotoCount: z.number().int().nonnegative().optional(),
	materialRecords: z
		.object({
			expectedRecordCount: z.number().int().nonnegative().optional(),
			minRecordCount: z.number().int().nonnegative().default(1),
			invoiceNr: z.string().min(1).optional(),
			expectedInvoiceDateISO: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.optional(),
			forbiddenInvoiceDateISO: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.optional(),
			requiredNameSignals: z.array(z.string().min(1)).default([]),
		})
		.optional(),
	requiredTextSignals: z.array(z.string().min(1)).default([]),
	requiredAnswerSignals: z.array(z.string().min(1)).default([]),
	forbiddenAnswerSignals: z.array(z.string().min(1)).default([]),
	records: z.array(ExpectedSiteDiaryRecordSchema).default([]),
	workersInvolved: z.number().nonnegative().nullable().optional(),
	timeInvolved: z.number().positive().optional(),
	amounts: z.number().nullable().optional(),
	nullNumericValuesCanBeZero: z.boolean().default(false),
	expectedDateISO: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	maxAnswerSentences: z.number().int().positive().optional(),
	firstSentenceSignals: z.array(z.string().min(1)).default([]),
	minHeuristicScore: z.number().min(0).max(1).default(0.75),
	warningValidators: z.array(z.string().min(1)).default([]),
});

const CheckpointInspectionExpectationSchema = z.object({
	threadSource: z.literal("site-manager-selector"),
	maxCompactedEstimatedTokens: z.number().int().positive(),
	profile: z.literal("whatsapp-legacy"),
	missingHistoryBehavior: z.enum(["warn", "fail"]),
});

const BaseEvalCaseSchema = z.object({
	id: z.string().regex(/^[a-z0-9-]+$/),
	intent: z.string().min(1),
	notes: z.string().optional(),
	tags: z.array(z.string().min(1)).default([]),
	tier: z.enum(["smoke", "regression", "extended"]).default("regression"),
	priority: z.enum(["critical", "standard", "extended"]).default("standard"),
});

const WebhookWhatsAppSiteManagerEvalCaseSchema = BaseEvalCaseSchema.extend({
	mode: z.literal("webhook").default("webhook"),
	webhook: z.record(z.any()),
	imageBatch: z
		.array(
			z.object({
				caption: z.string(),
				timestamp: z.string().min(1),
				mediaId: z.string().min(1).optional(),
				mimeType: z.string().min(1).optional(),
			}),
		)
		.min(2)
		.optional(),
	expected: ExpectedSavedRecordSchema,
	followUp: z
		.object({
			body: z.string().min(1),
			expected: ExpectedSavedRecordSchema,
		})
		.optional(),
	simulatedBisConnection: z.enum(["not-connected", "ready"]).optional(),
});

const CheckpointInspectionWhatsAppSiteManagerEvalCaseSchema =
	BaseEvalCaseSchema.extend({
		mode: z.literal("checkpoint-inspection"),
		expectedCheckpointInspection: CheckpointInspectionExpectationSchema,
	});

export const WhatsAppSiteManagerEvalCaseSchema = z.union([
	WebhookWhatsAppSiteManagerEvalCaseSchema,
	CheckpointInspectionWhatsAppSiteManagerEvalCaseSchema,
]);

export const WhatsAppSiteManagerEvalSuiteSchema = z
	.array(WhatsAppSiteManagerEvalCaseSchema)
	.min(1);

export type WebhookWhatsAppSiteManagerEvalCase = z.infer<
	typeof WebhookWhatsAppSiteManagerEvalCaseSchema
>;
export type CheckpointInspectionWhatsAppSiteManagerEvalCase = z.infer<
	typeof CheckpointInspectionWhatsAppSiteManagerEvalCaseSchema
>;
export type WhatsAppSiteManagerEvalCase = z.infer<
	typeof WhatsAppSiteManagerEvalCaseSchema
>;

function textWebhookFixture(args: {
	senderKey: string;
	body: string;
	timestamp: string;
	contactName?: string;
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
										name: args.contactName ?? "Eval Site Manager",
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

function imageWebhookFixture(args: {
	senderKey: string;
	caption: string;
	timestamp: string;
	mediaId?: string;
	mimeType?: string;
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
									image: {
										id: args.mediaId ?? `eval-image-media-${args.senderKey}`,
										mime_type: args.mimeType ?? "image/jpeg",
										caption: args.caption,
									},
									type: "image",
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
			tags: ["save", "latvian", "worker-count", "hours"],
			tier: "smoke",
			priority: "critical",
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
			id: "latvian-image-caption-site-diary",
			intent:
				"Verify a Meta image webhook with a Latvian site diary caption saves the photo and creates a diary record from the caption.",
			notes:
				"The eval runner uses a real progress image fixture; image content is not extracted for diary text.",
			tags: ["save", "image", "photo", "latvian"],
			tier: "regression",
			webhook: imageWebhookFixture({
				senderKey: "eval-site-manager-image-caption",
				caption: "Šodien pabeidzām starpsienu montāžu 2. stāvā, 2 cilvēki, 3h.",
				timestamp: "1782197580",
				mediaId: "eval-image-media-progress-report-normal",
			}),
			expected: {
				expectedPhotoCount: 1,
				expectedPhotoPurpose: "site_diary",
				requiredTextSignals: ["starpsien", "montāž", "2", "stāv"],
				workersInvolved: 2,
				timeInvolved: 3,
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-image-caption-yesterday-photo-date",
			intent:
				"Verify a Meta image webhook with a Latvian date-placement caption saves the regular photo under yesterday without creating a diary record.",
			notes:
				"The caption only gives photo placement intent; image content is not extracted and no diary record is created.",
			tags: ["image", "photo", "date", "latvian"],
			tier: "regression",
			webhook: imageWebhookFixture({
				senderKey: "eval-site-manager-image-yesterday-date",
				caption: "Pievieno šo foto vakardienai",
				timestamp: "1782197581",
				mediaId: "eval-image-media-progress-yesterday-date",
			}),
			expected: {
				shouldCreateRecord: false,
				expectedPhotoCount: 1,
				expectedPhotoPurpose: "site_diary",
				expectedPhotoDateISO: "2026-06-22",
				minHeuristicScore: 1,
			},
		},
		{
			id: "latvian-image-batch-yesterday-photo-date",
			intent:
				"Verify a default-construction Meta image batch saves multiple regular photos under yesterday from the first caption's date-placement instruction.",
			notes:
				"The eval runner sends separate image webhooks concurrently so the real route builds the batch form data.",
			tags: ["image", "photo", "date", "latvian", "batch"],
			tier: "regression",
			webhook: imageWebhookFixture({
				senderKey: "eval-site-manager-image-batch-yesterday-date",
				caption: "Pievieno šos foto vakardienai",
				timestamp: "1782197581",
				mediaId: "eval-image-media-progress-batch-yesterday-date-1",
			}),
			imageBatch: [
				{
					caption: "Pievieno šos foto vakardienai",
					timestamp: "1782197581",
					mediaId: "eval-image-media-progress-batch-yesterday-date-1",
				},
				{
					caption: "",
					timestamp: "1782197582",
					mediaId: "eval-image-media-progress-batch-yesterday-date-2",
				},
			],
			expected: {
				shouldCreateRecord: false,
				expectedPhotoCount: 2,
				expectedPhotoPurpose: "site_diary",
				expectedPhotoDateISO: "2026-06-22",
				minHeuristicScore: 1,
			},
		},
		{
			id: "material-invoice-latvian-date-image",
			intent:
				"Verify a regular site-manager image webhook is classified as a material invoice and saves Latvian DD.MM.YYYY invoice dates deterministically.",
			notes:
				"Regression for invoice date 02.06.2026 being misread as February 6 instead of June 2.",
			tags: ["image", "material", "invoice", "date", "regression"],
			tier: "regression",
			webhook: imageWebhookFixture({
				senderKey: "eval-site-manager-material-invoice-lv-date",
				caption: "Rēķins E02246903",
				timestamp: "1782197582",
				mediaId: "eval-image-media-material-invoice-latvian-date",
			}),
			expected: {
				shouldCreateRecord: false,
				expectedPhotoCount: 0,
				expectedWarehousePhotoCount: 1,
				expectedPhotoPurpose: "warehouse_invoice",
				materialRecords: {
					minRecordCount: 1,
					invoiceNr: "E02246903",
					expectedInvoiceDateISO: "2026-06-02",
					forbiddenInvoiceDateISO: "2026-02-06",
				},
				minHeuristicScore: 1,
			},
		},
		{
			id: "latvian-wall-plaster-hours-without-workers",
			intent:
				"Verify a Latvian site-manager text webhook leaves workers empty when work and hours are reported without an explicit worker count.",
			notes:
				"Covers nullable worker counts for normal site diary rows when the source does not state a count.",
			tags: ["save", "latvian", "worker-count", "hours"],
			tier: "smoke",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-without-workers",
				body: "Šodien apmestas sienas 2 stāvā, 4h",
				timestamp: "1782197585",
			}),
			expected: {
				requiredTextSignals: ["apmest", "sien", "2", "stāv"],
				workersInvolved: null,
				timeInvolved: 4,
				amounts: null,
				nullNumericValuesCanBeZero: true,
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "context-explicit-same-work-as-yesterday",
			intent:
				"Verify recent diary context can help an explicit follow-up reuse the prior work/location while taking hours only from the current message.",
			tags: ["context", "follow-up", "latvian", "no-leak"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-context-same-work",
				body: "Vakar 2. stāvā veikta ugunsdrošā blīvēšana, 2 cilvēki, 5h.",
				timestamp: "1782197586",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["uguns", "blīv", "2", "stāv"],
				workersInvolved: 2,
				timeInvolved: 5,
				minHeuristicScore: 0.75,
			},
			followUp: {
				body: "Šodien tas pats darbs tajā pašā vietā, vēl 3h.",
				expected: {
					expectedRecordCount: 1,
					requiredTextSignals: ["uguns|blīv|tas pats", "2|stāv|tajā pašā"],
					requiredFieldSignals: {
						Works: ["Fire stopping|sealing|Uguns|blīv"],
					},
					workersInvolved: null,
					timeInvolved: 3,
					amounts: null,
					nullNumericValuesCanBeZero: true,
					minHeuristicScore: 0.75,
				},
			},
		},
		{
			id: "context-schema-fire-stopping-category",
			intent:
				"Verify schema/work-list context helps map fire-sealing vocabulary to the configured work category without inventing workers or quantities.",
			tags: ["context", "category", "latvian", "amount"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-schema-fire-stopping",
				body: "Šodien veikta kabeļu caurumu ugunsdrošā aizdare 4. stāvā, 2h.",
				timestamp: "1782197587",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["kabe", "caurum", "uguns", "aizdar", "4", "stāv"],
				requiredFieldSignals: {
					Works: ["Fire stopping|sealing|Uguns|aizdar|blīv"],
				},
				workersInvolved: null,
				timeInvolved: 2,
				amounts: null,
				nullNumericValuesCanBeZero: true,
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-layer-count-is-not-amount",
			intent:
				"Verify Latvian layer counts and apartment identifiers stay out of structured completed quantity fields.",
			notes:
				"Protects against mapping 'reģipsis 2 kārtās' to Amounts=2, Units=gab.",
			tags: ["save", "amount", "latvian"],
			tier: "regression",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-layer-count-no-amount",
				body: "Dz ukraiņi. Wc profils, reģipsis 2 kārtās, vate, elektrība. darbs izdarīts",
				timestamp: "1782197590",
			}),
			expected: {
				requiredTextSignals: [
					"wc",
					"profil",
					"reģips",
					"2",
					"kārt",
					"vate",
					"elektr",
				],
				workersInvolved: null,
				amounts: null,
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-wall-mounting-amount-10",
			intent:
				"Verify a standalone Latvian wall mounting report saves one record with the explicit completed amount 10.",
			tags: ["save", "latvian", "amount", "hours"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-wall-mounting-amount-10",
				body: "Šodien samontējam 10 sienas",
				timestamp: "1782197592",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["samont", "10", "sien"],
				amounts: 10,
				records: [
					{
						requiredTextSignals: ["samont", "10", "sien"],
						amounts: 10,
						timeInvolved: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-multiple-works-total-hours-no-split",
			intent:
				"Verify multiple mentioned works with one total duration stay as one site diary record when the duration cannot be safely split.",
			notes:
				"Protects against duplicating or arbitrarily splitting total hours across pipes, sewer, and radiator work.",
			tags: ["save", "hours", "multi-work", "latvian"],
			tier: "regression",
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
			id: "latvian-two-explicit-work-records",
			intent:
				"Verify one message with two explicitly separable source-backed tasks creates two site diary records instead of one broad under-split row.",
			notes:
				"Protects the one-row checker path: if the first extractor collapses separate door and wall work into one row, checker-guided repair should split them before save.",
			tags: ["save", "multi-record", "latvian"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-two-records",
				body: "Šodien 1. stāvā uzstādītas durvis, 2h un 2. stāvā nokrāsotas sienas, 3h.",
				timestamp: "1782197600",
			}),
			expected: {
				expectedRecordCount: 2,
				requiredTextSignals: ["durv", "1", "stāv", "krās", "sien", "2", "stāv"],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-bobcat-foundation-sand-hours-only",
			intent:
				"Verify Bobcat/operator wording is preserved without turning machinery/operator mentions into worker or quantity values.",
			tags: ["save", "latvian", "hours", "amount", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-bobcat-foundation-sand",
				body: "Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
				timestamp: "1782197650",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["smilts", "piebēr", "pamat", "bobcat|bobk"],
				workersInvolved: null,
				timeInvolved: 9.5,
				amounts: null,
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: ["smilts", "piebēr", "pamat", "bobcat|bobk"],
						forbiddenFieldSignals: {
							Works: ["Papildu darbi|Papilddarbi"],
							Works_Custom_1: ["Papilddarbi|Papildu darbi"],
							Location: ["Papilddarbi|Papildu darbi"],
							Location_Custom_1: ["Papilddarbi|Papildu darbi"],
						},
						workersInvolved: null,
						timeInvolved: 9.5,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-machinery-operator-single-job",
			intent:
				"Verify machinery/operator wording for one real job is saved as one diary record, not split into machinery, operator, and action rows.",
			tags: ["save", "latvian", "multi-record", "machinery", "operator"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-machinery-operator-single-job",
				body: "Šodien ar grīdas slīpmašīnu slīpēta grīda, operators turēja putekļu sūcēju, 6 stundas.",
				timestamp: "1782197655",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["grīd", "slīp", "operator", "putek", "sūc"],
				workersInvolved: null,
				timeInvolved: 6,
				amounts: null,
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: ["grīd", "slīp", "operator", "putek", "sūc"],
						workersInvolved: null,
						timeInvolved: 6,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-weather-and-earthworks-five-records",
			intent:
				"Verify a mixed weather, delivery, earthwork, and machinery message is split into five diary records with quantities but no separate machinery/operator task.",
			tags: ["save", "latvian", "multi-record", "amount", "note", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-weather-earthworks-six",
				body: "Laika apstākļi šodien saulains plus 27 grādi. Ievestas smilts 180 kubi, grunts rakšana 80 kubi, liekās grunts izvešana 110 kubi, smilts piebēršana pamatiem 400 kubi, smilts piebēršana veica bobkatu operātors, strādāja 9,5 stundas, grunts rakšana veica ekskavatoru operātors, strādāja arī palīkstrādnieks 8 stundas.",
				timestamp: "1782197651",
			}),
			expected: {
				expectedRecordCount: 5,
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: ["laika", "saulains", "27"],
						requiredFieldSignals: { Works: ["Piezīmes|Notes"] },
						workersInvolved: null,
						timeInvolved: null,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
					{
						requiredTextSignals: ["ievest", "smil"],
						requiredFieldSignals: {
							Works: ["Materiālu piegāde|Material delivery"],
						},
						workersInvolved: null,
						timeInvolved: null,
						amounts: 180,
						units: "m3",
					},
					{
						requiredTextSignals: ["grunts", "rak"],
						requiredFieldSignals: {
							Works: ["Grunts rakšana|Excavation|Rakšanas darbi|Zemes darbi"],
						},
						workersInvolved: 2,
						timeInvolved: 8,
						amounts: 80,
						units: "m3",
						nullNumericValuesCanBeZero: true,
					},
					{
						requiredTextSignals: ["liek", "grunts", "izve"],
						requiredFieldSignals: {
							Works: [
								"Liekās grunts izvešana|Excavation|Rakšanas darbi|Zemes darbi",
							],
						},
						workersInvolved: null,
						timeInvolved: null,
						amounts: 110,
						units: "m3",
						nullNumericValuesCanBeZero: true,
					},
					{
						requiredTextSignals: ["smilts", "piebēr", "pamat"],
						requiredFieldSignals: {
							Works: ["Smilts piebēršana pamatiem|Backfilling"],
						},
						workersInvolved: null,
						timeInvolved: 9.5,
						amounts: 400,
						units: "m3",
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-sand-delivery-material-category",
			intent:
				"Verify a short sand delivery message is categorized as material delivery.",
			tags: ["save", "latvian", "material-delivery", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-sand-delivery",
				body: "Ievestas smiltis.",
				timestamp: "1782197652",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["ievest", "smilt"],
				records: [
					{
						requiredTextSignals: ["ievest", "smilt"],
						requiredFieldSignals: {
							Works: ["Materiālu piegāde|Material delivery"],
						},
						forbiddenFieldSignals: { Works: ["Piezīmes|Papildu darbi"] },
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-sand-delivery-and-backfill-labor",
			intent:
				"Verify sand delivery and sand placement/backfill are split into two records with separate quantities and labor on the work row.",
			notes:
				"Protects against merging delivered and placed sand quantities, and validates derived 50 person-hours through 5 workers times 10 hours.",
			tags: [
				"save",
				"latvian",
				"multi-record",
				"material-delivery",
				"amount",
				"worker-count",
				"hours",
				"category",
			],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-sand-delivery-backfill-labor",
				contactName: "Janis Rumba",
				body: "Šodien ievesta smilts 160m3, iestrādāti 140m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs",
				timestamp: "1782197653",
			}),
			expected: {
				expectedRecordCount: 2,
				requiredTextSignals: ["ievest", "smilt", "iestrād", "160", "140"],
				records: [
					{
						requiredTextSignals: ["ievest", "smilt"],
						requiredFieldSignals: {
							Works: ["Materiālu piegāde|Material delivery"],
						},
						amounts: 160,
						units: "m3",
						workersInvolved: null,
						timeInvolved: null,
						nullNumericValuesCanBeZero: true,
					},
					{
						requiredTextSignals: ["iestrād", "smilt"],
						requiredFieldSignals: {
							Works: ["Backfilling|Zemes darbi|Rakšanas darbi|Excavation"],
						},
						forbiddenFieldSignals: {
							Works: [
								"Materiālu piegāde|Material delivery",
								"Piezīmes|Notes",
								"Papildu darbi|Additional works",
							],
						},
						amounts: 140,
						units: "m3",
						workersInvolved: 5,
						timeInvolved: 10,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-sand-delivery-and-backfill-labor-200-180",
			intent:
				"Verify sand delivery and sand placement/backfill with 200/180 quantities are split into two records with labor on the work row.",
			notes:
				"Protects a second quantity variant of the sand delivery/backfill case: 200 m3 delivered, 180 m3 placed, 5 workers, 10 hours.",
			tags: [
				"save",
				"latvian",
				"multi-record",
				"material-delivery",
				"amount",
				"worker-count",
				"hours",
				"category",
			],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-sand-delivery-backfill-labor-200-180",
				contactName: "Janis Rumba",
				body: "Šodien ievesta smilts 200m3, iestrādāti 180m3. Strādāja pa 10h ekskavators ar operātoru, 2 būvstrādnieki, brigadieris un būvdarbu vad. Palīgs",
				timestamp: "1782197653",
			}),
			expected: {
				expectedRecordCount: 2,
				requiredTextSignals: ["ievest", "smilt", "iestrād", "200", "180"],
				records: [
					{
						requiredTextSignals: ["ievest", "smilt"],
						requiredFieldSignals: {
							Works: ["Materiālu piegāde|Material delivery"],
						},
						amounts: 200,
						units: "m3",
						workersInvolved: null,
						timeInvolved: null,
						nullNumericValuesCanBeZero: true,
					},
					{
						requiredTextSignals: ["iestrād", "smilt"],
						requiredFieldSignals: {
							Works: ["Backfilling|Zemes darbi|Rakšanas darbi|Excavation"],
						},
						forbiddenFieldSignals: {
							Works: [
								"Materiālu piegāde|Material delivery",
								"Piezīmes|Notes",
								"Papildu darbi|Additional works",
							],
						},
						amounts: 180,
						units: "m3",
						workersInvolved: 5,
						timeInvolved: 10,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-floor-concrete-rebar-additional-works",
			intent:
				"Verify one Latvian floor concreting, reinforcement, and additional beam work message is split into three records with row-specific quantities and labor.",
			notes:
				"Protects against collapsing distinct floor concreting, reinforcement, and additional beam concreting into one broad row.",
			tags: [
				"save",
				"latvian",
				"multi-record",
				"amount",
				"worker-count",
				"hours",
			],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-floor-concrete-rebar-additional",
				body: "Šodien trīs cilvēki pa desmit stundām aizbetonēja 100 kvadrātmetru, 100 milimetru biezuma grīdas, un arī divi cilvēki sastiegroja 150 kvadrātmetru stiegrojumu, un arī bija papildu darbi trīs stundas divi cilvēki, viņi tur piebetonēja, pasūtītājam vēl tur nelielu siju.",
				timestamp: "1782197654",
			}),
			expected: {
				expectedRecordCount: 3,
				requiredTextSignals: [
					"beton",
					"grīd",
					"100",
					"stiegroj",
					"150",
					"papild",
					"piebeton",
					"sij",
				],
				records: [
					{
						requiredTextSignals: ["beton", "grīd", "100"],
						amounts: 100,
						units: "m2",
						workersInvolved: 3,
						timeInvolved: 10,
					},
					{
						requiredTextSignals: ["stiegroj", "grīd"],
						amounts: 150,
						units: "m2",
						workersInvolved: 2,
					},
					{
						requiredTextSignals: ["papild", "piebeton", "sij"],
						workersInvolved: 2,
						timeInvolved: 3,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-foundation-excavation-workers-hours",
			intent:
				"Verify foundation excavation preserves workers and hours without inventing a quantity.",
			tags: ["save", "latvian", "worker-count", "hours", "amount"],
			tier: "regression",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-foundation-excavation",
				body: "Veikta grunts rakšana pamatiem, 3 cilvēki 5 stundas.",
				timestamp: "1782197653",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["grunts", "rak", "pamat"],
				workersInvolved: 3,
				timeInvolved: 5,
				amounts: null,
				nullNumericValuesCanBeZero: true,
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-excavator-breakdown-note",
			intent:
				"Verify equipment breakdown context is saved as a note rather than normal work or additional work.",
			tags: ["save", "latvian", "note", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-excavator-breakdown-note",
				body: "Ekskavatoram saplīsa turbīna; ekskavators pusi dienas nestrādāja, līdz nomā paņemts cits ekskavators.",
				timestamp: "1782197654",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["ekskavator", "turbīn", "nestrād", "nom"],
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: ["ekskavator", "turbīn", "nestrād", "nom"],
						requiredFieldSignals: { Works: ["Piezīmes|Notes|Kavēšanās|Delay"] },
						forbiddenFieldSignals: {
							Works: ["Papildu darbi|Papilddarbi"],
							Works_Custom_1: ["Papilddarbi|Papildu darbi"],
						},
						workersInvolved: null,
						timeInvolved: null,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-rain-weather-note",
			intent: "Verify weather-only rain text is saved as a note.",
			tags: ["save", "latvian", "note", "weather", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-rain-weather-note",
				body: "Šodien list lietus",
				timestamp: "1782197655",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["liet"],
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: ["liet"],
						requiredFieldSignals: { Works: ["Piezīmes|Notes"] },
						workersInvolved: null,
						timeInvolved: null,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-wool-installation-quantity-workers-hours",
			intent:
				"Verify wool installation saves quantity, unit, workers, and hours as normal work rather than additional work.",
			tags: ["save", "latvian", "amount", "worker-count", "hours", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-wool-installation",
				body: "Vates montāža, 20m2, 3 cilvēki 5 stundas",
				timestamp: "1782197656",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["vat", "montāž"],
				workersInvolved: 3,
				timeInvolved: 5,
				amounts: 20,
				records: [
					{
						requiredTextSignals: ["vat", "montāž"],
						requiredFieldSignals: {
							Works: ["vat|Wall construction|Sienu izbūve|Finishing|Apdare"],
						},
						forbiddenFieldSignals: {
							Works: ["Papildu darbi|Papilddarbi"],
							Works_Custom_1: ["Papilddarbi|Papildu darbi"],
							Location: ["Papilddarbi|Papildu darbi"],
							Location_Custom_1: ["Papilddarbi|Papildu darbi"],
						},
						workersInvolved: 3,
						timeInvolved: 5,
						amounts: 20,
						units: "m2",
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-deflectometer-documents-note",
			intent:
				"Verify document submission for deflectometer certification is saved as a note.",
			tags: ["save", "latvian", "note", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-deflectometer-docs-note",
				body: "Nosūtīti būvuzraugam visi nepieciešamie dokumenti deflektometra sertifikācijai.",
				timestamp: "1782197657",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: [
					"būvuzraug",
					"dokument",
					"deflektometr",
					"sertifik",
				],
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: [
							"būvuzraug",
							"dokument",
							"deflektometr",
							"sertifik",
						],
						requiredFieldSignals: { Works: ["Piezīmes|Notes|Projekts"] },
						workersInvolved: null,
						timeInvolved: null,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-additional-works-machinery-note",
			intent:
				"Verify an additional-works status sentence with machinery hours is saved as a note unless there is explicit intent to categorize it as additional work.",
			tags: ["save", "latvian", "note", "additional-work", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-additional-works-machinery-note",
				body: "Papilddarbi pabeigti plkst. 18.00. Izmantots ekskavators 3 h un Manitou 1 h.",
				timestamp: "1782197658",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["papilddarb", "18", "ekskavator", "manitou"],
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: ["papilddarb", "18", "ekskavator", "manitou"],
						requiredFieldSignals: {
							Works: ["Papildu darbi|Papilddarbi|Additional works"],
						},
						workersInvolved: null,
						timeInvolved: null,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-excavator-started-at-time-note",
			intent:
				"Verify an in-progress machinery/time sentence is saved as a note rather than completed work.",
			tags: ["save", "latvian", "note", "category"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-excavator-started-note",
				body: "No plkst. 15.00 Agris ar ekskavatoru veic zemes noņemšanu un šķembošanu.",
				timestamp: "1782197659",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: [
					"15",
					"agris",
					"ekskavator",
					"zemes noņem",
					"šķembo",
				],
				nullNumericValuesCanBeZero: true,
				records: [
					{
						requiredTextSignals: [
							"15",
							"agris",
							"ekskavator",
							"zemes noņem",
							"šķembo",
						],
						requiredFieldSignals: {
							Works: ["Piezīmes|Notes|Excavation|Rakšanas darbi|Zemes darbi"],
						},
						forbiddenFieldSignals: {
							Works: ["Papildu darbi|Papilddarbi"],
							Works_Custom_1: ["Papilddarbi|Papildu darbi"],
						},
						workersInvolved: null,
						timeInvolved: null,
						amounts: null,
						nullNumericValuesCanBeZero: true,
					},
				],
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "ambigious-bis-mention-in-task-decritpion",
			intent:
				"Verify a BIS-mentioned WhatsApp request with real work details is saved as a normal site diary record while explaining BIS submission must be done in the web app.",
			notes:
				"Regression for a production ambiguity where the assistant treated a BIS mention as only guidance instead of saving the described cleaning work.",
			tags: ["bis", "save", "ambiguity", "follow-up"],
			tier: "smoke",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-bis-cleaning-ambiguous",
				body: "Pievieno BIS sistēmā, ka šodien iztīrījām telpu.",
				timestamp: "1782197615",
			}),
			expected: {
				requiredTextSignals: ["tīr", "telp"],
				requiredAnswerSignals: [
					"saglab",
					"saglabātie ieraksti|saglabātos darbu ierakstus|darbu ieraksti|darba ieraksts|darbu ierakstu|darba ierakstu",
				],
				firstSentenceSignals: ["saglab"],
				forbiddenAnswerSignals: [
					"nosūtīts uz bis",
					"pievienots bis",
					"bis ieraksts izveidots",
					"submitted to bis",
				],
				workersInvolved: null,
				nullNumericValuesCanBeZero: true,
				minHeuristicScore: 0.75,
			},
			followUp: {
				body: "Un kā es to varu pieslēgt savam lietotāja kontam?",
				expected: {
					shouldCreateRecord: false,
					requiredAnswerSignals: ["bis", "pieslēg|savien"],
					forbiddenAnswerSignals: [
						"ir nosūtīts uz bis",
						"veiksmīgi nosūtīts uz bis",
						"nosūtīju uz bis",
						"pievienots bis",
						"bis ieraksts izveidots",
						"saglabāts veiksmīgi",
					],
				},
			},
		},
		{
			id: "bis-entry-how-to-guidance-only-no-bis",
			intent:
				"Verify a BIS functionality question explains that records entered through WhatsApp are eligible for BIS submission, which can only be completed in the web application, without creating a diary record.",
			tags: ["bis", "guidance", "no-save"],
			tier: "smoke",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-bis-how-to",
				body: "Kā ievadīt BISā ierakstus?",
				timestamp: "1782197620",
			}),
			simulatedBisConnection: "not-connected",
			expected: {
				shouldCreateRecord: false,
				requiredAnswerSignals: [
					"šeit|šejien|whatsapp|ziņ|čat|sarakst|sistēm|vietn",
					"bis",
					"nosūt|iesnieg",
					"nav pieslēg|nav savien|pieslēgt bis|savienot bis|nav konfigurēts|nav sakārtots|nav konfig|nav pieejam|nevar",
				],
				forbiddenAnswerSignals: [
					"nosūtīts uz bis",
					"pievienots bis",
					"bis ieraksts izveidots",
					"saglabāts veiksmīgi",
					"submitted to bis",
				],
			},
		},
		{
			id: "bis-entry-how-to-guidance-only-yes-bis",
			intent:
				"Verify a BIS functionality question recognizes an eval-only simulated active BIS connection and explains web submission without asking the user to reconnect or creating a diary record.",
			tags: ["bis", "guidance", "no-save"],
			tier: "regression",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-bis-how-to-connected",
				body: "Kā ievadīt BISā ierakstus?",
				timestamp: "1782197621",
			}),
			simulatedBisConnection: "ready",
			expected: {
				shouldCreateRecord: false,
				requiredAnswerSignals: [
					"bis",
					"jau ir pieslēg|ir savienot|savienojums ir aktīv|pieslēgums ir aktīv|integrācija ir aktīv|konfigurēts|sakārtots|pieslēgts|aktīvs",
					"nosūt|iesnieg",
				],
				forbiddenAnswerSignals: [
					"pieslēdz bis",
					"savieno bis",
					"connect bis",
					"nosūtīts uz bis",
					"pievienots bis",
					"bis ieraksts izveidots",
					"saglabāts veiksmīgi",
				],
			},
		},
		{
			id: "legacy-history-selector-sanitizes-production-thread",
			mode: "checkpoint-inspection",
			intent:
				"Verify the whatsapp legacy compactor keeps the real persisted site-manager checkpoint history under the allowed context budget.",
			notes:
				"Read-only regression that inspects the real persisted siteManager:siteId:userId checkpoint thread and runs the whatsapp legacy compactor locally without sending a webhook.",
			tags: ["controlled-memory", "checkpoint", "read-only"],
			tier: "extended",
			expectedCheckpointInspection: {
				threadSource: "site-manager-selector",
				maxCompactedEstimatedTokens: 3000,
				profile: "whatsapp-legacy",
				missingHistoryBehavior: "warn",
			},
		},
		{
			id: "latvian-word-number-workers",
			intent:
				"Verify Latvian word-number worker counts are extracted into the structured worker field.",
			notes:
				"Covers non-digit worker extraction from phrases like trīs strādnieki.",
			tags: ["save", "worker-count", "latvian"],
			tier: "regression",
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
		{
			id: "latvian-explicit-historical-date",
			intent: "Verify an explicitly stated historical diary date is persisted.",
			tags: ["save", "date", "latvian"],
			tier: "regression",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-historical-date",
				body: "Saglabā par 2026. gada 15. jūniju: 2. stāvā krāsotas sienas, 3h.",
				timestamp: "1782197635",
			}),
			expected: {
				requiredTextSignals: ["krās", "sien", "2", "stāv"],
				workersInvolved: null,
				timeInvolved: 3,
				expectedDateISO: "2026-06-15",
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "latvian-repair-report-then-correction",
			intent:
				"Distinguish a completed repair report from a later imperative correction and replace rather than duplicate the diary batch.",
			notes:
				"Distinguish a completed repair report from a later imperative correction and replace rather than duplicate the diary batch. The follow-up correction path propagates evalMetadata and records a structured save trace; the runner also falls back to SiteDiaryCorrectionAudit when both are empty.",
			tags: ["correction", "save", "amount", "follow-up"],
			tier: "smoke",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-repair-correction",
				body: "Saglabā par 2026. gada 15. jūniju: salabojām durvis 2. stāvā, 5 gab., 2h.",
				timestamp: "1782197640",
			}),
			expected: {
				expectedRecordCount: 1,
				requiredTextSignals: ["salab", "durv", "2", "stāv"],
				amounts: 5,
				timeInvolved: 2,
				expectedDateISO: "2026-06-15",
				minHeuristicScore: 0.75,
			},
			followUp: {
				body: "Izmaini daudzumu iepriekšējā ierakstā uz 10 gab.",
				expected: {
					expectedRecordCount: 1,
					requiredTextSignals: ["salab", "durv", "2", "stāv"],
					amounts: 10,
					timeInvolved: 2,
					expectedDateISO: "2026-06-15",
					minHeuristicScore: 0.75,
				},
			},
		},
		{
			id: "latvian-explicit-zero-workers",
			intent:
				"Verify an explicit zero worker count is persisted as 0 instead of null when the message says zero workers were involved.",
			tags: ["save", "worker-count", "zero", "latvian"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-zero-workers",
				body: "Šodien 1. stāvā veikta kvalitātes pārbaude, 0 strādnieki iesaistīti, 1h.",
				timestamp: "1782197642",
			}),
			expected: {
				requiredTextSignals: ["kvalit", "pārbaud", "1", "stāv"],
				workersInvolved: 0,
				timeInvolved: 1,
				minHeuristicScore: 0.75,
			},
		},
		{
			id: "context-worker-count-does-not-leak",
			intent:
				"Verify a previously mentioned worker count is not reused for a later save that omits worker count.",
			tags: ["context", "worker-count", "follow-up", "no-leak"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-worker-count-no-leak",
				body: "Atceries kontekstam: vakar strādāja 2 cilvēki. Šo te vēl nesaglabā.",
				timestamp: "1782197643",
			}),
			expected: {
				shouldCreateRecord: false,
				requiredAnswerSignals: ["nesaglab|neveido|preciz|sapratu|labi|atcer"],
				forbiddenAnswerSignals: ["saglabāts veiksmīgi|saved successfully"],
			},
			followUp: {
				body: "Tagad saglabā: šodien 2. stāvā apmestas sienas, 4h.",
				expected: {
					expectedRecordCount: 1,
					requiredTextSignals: ["apmest", "sien", "2", "stāv"],
					workersInvolved: null,
					timeInvolved: 4,
					minHeuristicScore: 0.75,
				},
			},
		},
		{
			id: "bis-worklike-question-does-not-save",
			intent:
				"Verify a BIS question containing work-like words remains guidance-only when it does not report completed site work.",
			tags: ["bis", "guidance", "no-save", "ambiguity"],
			tier: "regression",
			priority: "critical",
			webhook: textWebhookFixture({
				senderKey: "eval-site-manager-bis-worklike-question",
				body: "Vai BIS ierakstos var norādīt sienu krāsošanas darbus un apjomus?",
				timestamp: "1782197644",
			}),
			expected: {
				shouldCreateRecord: false,
				requiredAnswerSignals: ["bis", "var|iespēj|ierakst"],
				forbiddenAnswerSignals: [
					"saglabāts veiksmīgi",
					"darba ieraksts izveidots",
					"nosūtīts uz bis",
				],
			},
		},
	]);
