import {
	type WebhookWhatsAppSiteManagerEvalCase,
	whatsappSiteManagerEvalCases,
} from "./whatsapp-site-manager-cases";
import { validateWhatsappSiteManagerRecord } from "./whatsapp-site-manager-validators";

describe("WhatsApp site-manager eval validators", () => {
	const webhookCases = whatsappSiteManagerEvalCases.filter(
		(item): item is WebhookWhatsAppSiteManagerEvalCase =>
			item.mode === "webhook",
	);
	const evalCase = webhookCases[0];
	const workerlessCase = webhookCases.find(
		(item) => item.id === "latvian-wall-plaster-hours-without-workers",
	);
	const totalHoursNoSplitCase = webhookCases.find(
		(item) => item.id === "latvian-multiple-works-total-hours-no-split",
	);
	const wordNumberWorkersCase = webhookCases.find(
		(item) => item.id === "latvian-word-number-workers",
	);
	const zeroWorkersCase = webhookCases.find(
		(item) => item.id === "latvian-explicit-zero-workers",
	);
	const ambiguousBisCase = webhookCases.find(
		(item) => item.id === "ambigious-bis-mention-in-task-decritpion",
	);
	const imageCaptionCase = webhookCases.find(
		(item) => item.id === "latvian-image-caption-site-diary",
	);
	const materialInvoiceCase = webhookCases.find(
		(item) => item.id === "material-invoice-latvian-date-image",
	);
	const bobcatSandCase = webhookCases.find(
		(item) => item.id === "latvian-bobcat-foundation-sand-hours-only",
	);
	const sandDeliveryCase = webhookCases.find(
		(item) => item.id === "latvian-sand-delivery-material-category",
	);
	const earthworksSixRecordsCase = webhookCases.find(
		(item) => item.id === "latvian-weather-and-earthworks-six-records",
	);

	function savedPhoto(mediaPurpose: string | null) {
		return {
			id: "photo-1",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			URL: "https://eval.test/uploads/photo.jpg",
			fileUrl: "https://eval.test/uploads/photo.jpg",
			Comment: "Test Manager : Šodien pabeidzām starpsienu montāžu",
			mediaPurpose,
			createdAt: new Date("2026-06-23T00:00:00.000Z"),
		};
	}

	function workerlessRecord(workersInvolved: number | null) {
		return {
			id: "record-1",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "2 stāvs",
			Works: "Apmetums",
			Comments: "Apmestas sienas 2. stāvā, 4 h.",
			originalUserComment: "Test Manager : Šodien apmestas sienas 2 stāvā, 4h",
			originalAudioUrl: null,
			WorkersInvolved: workersInvolved,
			TimeInvolved: 4,
			createdAt: new Date("2026-06-23T00:00:00.000Z"),
		};
	}

	function totalHoursNoSplitRecord() {
		return {
			id: "record-1",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Project",
			Works: "Ūdens trubas, kanalizācija un radiatori",
			Comments:
				"Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
			originalUserComment:
				"Test Manager : Ūdens trubas plus kanalizācija, ūdens radiatori, divpadsmit stundas.",
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: 12,
			createdAt: new Date("2026-06-23T00:00:00.000Z"),
		};
	}

	function wordNumberWorkersRecord(workersInvolved: number | null) {
		return {
			id: "record-1",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "1 stāvs",
			Works: "Pārseguma paneļu montāža",
			Comments: "Montēti pārseguma paneļi 1. stāvā, trīs strādnieki, 6 h.",
			originalUserComment:
				"Test Manager : Šodien montēti pārseguma paneļi 1 stāvā, trīs strādnieki, 6h",
			originalAudioUrl: null,
			WorkersInvolved: workersInvolved,
			TimeInvolved: 6,
			createdAt: new Date("2026-06-23T00:00:00.000Z"),
		};
	}

	function ambiguousBisRecord() {
		return {
			id: "record-1",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Telpa",
			Works: "Telpas tīrīšana",
			Comments: "Šodien iztīrīta telpa.",
			originalUserComment:
				"Test Manager : Pievieno BIS sistēmā, ka šodien iztīrījām telpu.",
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: null,
			createdAt: new Date("2026-06-23T00:00:00.000Z"),
		};
	}

	it("passes a saved record that preserves the text webhook facts", () => {
		const result = validateWhatsappSiteManagerRecord({
			evalCase,
			siteId: "site-1",
			userId: "user-1",
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "3 stāvs",
				Works: "Finishing",
				Comments: "Ieklātas grīdas",
				originalUserComment:
					"Test Manager : Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
				originalAudioUrl: null,
				WorkersInvolved: 2,
				TimeInvolved: 3,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("pass");
		expect(result.heuristic.status).toBe("pass");
	});

	it("checks expected photo count for image caption cases", () => {
		if (!imageCaptionCase) throw new Error("Missing image caption eval case");
		const result = validateWhatsappSiteManagerRecord({
			evalCase: imageCaptionCase,
			siteId: "site-1",
			userId: "user-1",
			createdPhotoCount: 1,
			createdPhotos: [savedPhoto("site_diary")],
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "2. stāvs",
				Works: "Starpsienu montāža",
				Comments: "Pabeigta starpsienu montāža 2. stāvā, 2 cilvēki, 3 h.",
				originalUserComment:
					"Test Manager : Šodien pabeidzām starpsienu montāžu 2. stāvā, 2 cilvēki, 3h.",
				originalAudioUrl: null,
				WorkersInvolved: 2,
				TimeInvolved: 3,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "photo-count"),
		).toMatchObject({
			status: "pass",
		});
	});

	it("fails progress image cases when saved photos have the invoice purpose", () => {
		if (!imageCaptionCase) throw new Error("Missing image caption eval case");
		const result = validateWhatsappSiteManagerRecord({
			evalCase: imageCaptionCase,
			siteId: "site-1",
			userId: "user-1",
			createdPhotoCount: 1,
			createdPhotos: [savedPhoto("warehouse_invoice")],
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "2. stāvs",
				Works: "Starpsienu montāža",
				Comments: "Pabeigta starpsienu montāža 2. stāvā, 2 cilvēki, 3 h.",
				originalUserComment:
					"Test Manager : Šodien pabeidzām starpsienu montāžu 2. stāvā, 2 cilvēki, 3h.",
				originalAudioUrl: null,
				WorkersInvolved: 2,
				TimeInvolved: 3,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "photo-purpose:site_diary"),
		).toMatchObject({ status: "fail" });
	});

	it("passes material invoice records with Latvian day-month invoice dates", () => {
		if (!materialInvoiceCase) {
			throw new Error("Missing material invoice Latvian date eval case");
		}
		const result = validateWhatsappSiteManagerRecord({
			evalCase: materialInvoiceCase,
			siteId: "site-1",
			userId: "user-1",
			createdPhotoCount: 0,
			record: null,
			records: [],
			warehousePhotos: [savedPhoto("warehouse_invoice")],
			materialRecords: [
				{
					id: "material-1",
					siteId: "site-1",
					userId: "user-1",
					name: "Materiāls",
					invoiceNr: "E02246903",
					invoiceDate: new Date("2026-06-02T00:00:00.000Z"),
					cost: 12.34,
					quantity: 2,
					sourcePhoto: "data:image/jpeg;base64,fixture",
					createdAt: new Date("2026-06-23T00:00:00.000Z"),
				},
			],
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find(
				(item) => item.name === "material-invoice-date:2026-06-02",
			),
		).toMatchObject({ status: "pass" });
		expect(
			result.results.find(
				(item) => item.name === "photo-purpose:warehouse_invoice",
			),
		).toMatchObject({ status: "pass" });
		expect(
			result.results.find((item) => item.name === "warehouse-photo-count"),
		).toMatchObject({ status: "pass" });
	});

	it("fails material invoice cases when the source photo is not warehouse-marked", () => {
		if (!materialInvoiceCase) {
			throw new Error("Missing material invoice Latvian date eval case");
		}
		const result = validateWhatsappSiteManagerRecord({
			evalCase: materialInvoiceCase,
			siteId: "site-1",
			userId: "user-1",
			createdPhotoCount: 0,
			record: null,
			records: [],
			warehousePhotos: [savedPhoto("site_diary")],
			materialRecords: [
				{
					id: "material-1",
					siteId: "site-1",
					userId: "user-1",
					name: "Materiāls",
					invoiceNr: "E02246903",
					invoiceDate: new Date("2026-06-02T00:00:00.000Z"),
					cost: 12.34,
					quantity: 2,
					sourcePhoto: "data:image/jpeg;base64,fixture",
					createdAt: new Date("2026-06-23T00:00:00.000Z"),
				},
			],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find(
				(item) => item.name === "photo-purpose:warehouse_invoice",
			),
		).toMatchObject({ status: "fail" });
	});

	it("fails material invoice cases when the source photo is missing", () => {
		if (!materialInvoiceCase) {
			throw new Error("Missing material invoice Latvian date eval case");
		}
		const result = validateWhatsappSiteManagerRecord({
			evalCase: materialInvoiceCase,
			siteId: "site-1",
			userId: "user-1",
			createdPhotoCount: 0,
			record: null,
			records: [],
			warehousePhotos: [],
			materialRecords: [
				{
					id: "material-1",
					siteId: "site-1",
					userId: "user-1",
					name: "Materiāls",
					invoiceNr: "E02246903",
					invoiceDate: new Date("2026-06-02T00:00:00.000Z"),
					cost: 12.34,
					quantity: 2,
					sourcePhoto: "data:image/jpeg;base64,fixture",
					createdAt: new Date("2026-06-23T00:00:00.000Z"),
				},
			],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "warehouse-photo-count"),
		).toMatchObject({ status: "fail" });
	});

	it("fails material invoice records with swapped month-day invoice dates", () => {
		if (!materialInvoiceCase) {
			throw new Error("Missing material invoice Latvian date eval case");
		}
		const result = validateWhatsappSiteManagerRecord({
			evalCase: materialInvoiceCase,
			siteId: "site-1",
			userId: "user-1",
			createdPhotoCount: 0,
			record: null,
			records: [],
			warehousePhotos: [savedPhoto("warehouse_invoice")],
			materialRecords: [
				{
					id: "material-1",
					siteId: "site-1",
					userId: "user-1",
					name: "Materiāls",
					invoiceNr: "E02246903",
					invoiceDate: new Date("2026-02-06T00:00:00.000Z"),
					cost: 12.34,
					quantity: 2,
					sourcePhoto: "data:image/jpeg;base64,fixture",
					createdAt: new Date("2026-06-23T00:00:00.000Z"),
				},
			],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find(
				(item) => item.name === "material-invoice-date:2026-06-02",
			),
		).toMatchObject({ status: "fail" });
		expect(
			result.results.find(
				(item) => item.name === "material-forbidden-invoice-date:2026-02-06",
			),
		).toMatchObject({ status: "fail" });
	});

	it("fails when the saved record loses core quantities", () => {
		const result = validateWhatsappSiteManagerRecord({
			evalCase,
			siteId: "site-1",
			userId: "user-1",
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "Project",
				Works: "Notes",
				Comments: "Darbi objektā",
				originalUserComment: "Darbi objektā",
				originalAudioUrl: null,
				WorkersInvolved: null,
				TimeInvolved: null,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("fail");
		expect(result.heuristic.status).toBe("fail");
	});

	it("fails when worker count only appears in free text but structured WorkersInvolved is wrong", () => {
		const result = validateWhatsappSiteManagerRecord({
			evalCase,
			siteId: "site-1",
			userId: "user-1",
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "Project",
				Works: "Finishing",
				Comments: "Ieklātas grīdas 3. stāvā, 2 cilvēki, 3 h.",
				originalUserComment:
					"Test Manager : Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
				originalAudioUrl: null,
				WorkersInvolved: 0,
				TimeInvolved: 3,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("fail");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.severity,
		).toBe("critical");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.message,
		).toBe("WorkersInvolved must be 2; got 0.");
	});

	it("returns warn when only warning validators fail", () => {
		const result = validateWhatsappSiteManagerRecord({
			evalCase: {
				...evalCase,
				expected: {
					...evalCase.expected,
					requiredTextSignals: ["missing-signal"],
					minHeuristicScore: 0,
					warningValidators: ["text-signal"],
				},
			},
			siteId: "site-1",
			userId: "user-1",
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "3 stāvs",
				Works: "Finishing",
				Comments: "Ieklātas grīdas 3. stāvā, 2 cilvēki, 3 h.",
				originalUserComment:
					"Test Manager : Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
				originalAudioUrl: null,
				WorkersInvolved: 2,
				TimeInvolved: 3,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("warn");
		expect(result.criticalFailures).toBe(0);
		expect(result.warnings).toBe(1);
		expect(
			result.results.find((item) => item.name === "text-signal:missing-signal")
				?.severity,
		).toBe("warning");
	});

	it("passes when a work report without an explicit worker count stores null", () => {
		if (!workerlessCase) throw new Error("Missing workerless eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: workerlessCase,
			siteId: "site-1",
			userId: "user-1",
			record: workerlessRecord(null),
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "time-involved")?.status,
		).toBe("pass");
	});

	it("fails when a worker-less report is assigned an invented worker count", () => {
		if (!workerlessCase) throw new Error("Missing workerless eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: workerlessCase,
			siteId: "site-1",
			userId: "user-1",
			record: workerlessRecord(1),
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("fail");
	});

	it("passes when multiple works with one total duration stay as one record", () => {
		if (!totalHoursNoSplitCase)
			throw new Error("Missing total hours no-split eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: totalHoursNoSplitCase,
			siteId: "site-1",
			userId: "user-1",
			record: totalHoursNoSplitRecord(),
			records: [totalHoursNoSplitRecord()],
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "record-count")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "time-involved")?.status,
		).toBe("pass");
	});

	it("passes when Latvian word-number worker count is extracted", () => {
		if (!wordNumberWorkersCase)
			throw new Error("Missing word-number workers eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: wordNumberWorkersCase,
			siteId: "site-1",
			userId: "user-1",
			record: wordNumberWorkersRecord(3),
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "time-involved")?.status,
		).toBe("pass");
	});

	it("fails word-number worker case when the saved count is wrong", () => {
		if (!wordNumberWorkersCase)
			throw new Error("Missing word-number workers eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: wordNumberWorkersCase,
			siteId: "site-1",
			userId: "user-1",
			record: wordNumberWorkersRecord(1),
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("fail");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.message,
		).toBe("WorkersInvolved must be 3; got 1.");
	});

	it("passes when an explicit zero worker count stores 0", () => {
		if (!zeroWorkersCase) throw new Error("Missing zero workers eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: zeroWorkersCase,
			siteId: "site-1",
			userId: "user-1",
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "1 stāvs",
				Works: "Kvalitātes pārbaude",
				Comments:
					"Šodien 1. stāvā veikta kvalitātes pārbaude, 0 strādnieki iesaistīti, 1h.",
				originalUserComment:
					"Test Manager : Šodien 1. stāvā veikta kvalitātes pārbaude, 0 strādnieki iesaistīti, 1h.",
				originalAudioUrl: null,
				WorkersInvolved: 0,
				TimeInvolved: 1,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("pass");
	});

	it("fails if an audio record stores an expiring Meta lookaside URL", () => {
		const result = validateWhatsappSiteManagerRecord({
			evalCase,
			siteId: "site-1",
			userId: "user-1",
			record: {
				id: "record-1",
				siteId: "site-1",
				userId: "user-1",
				workerId: null,
				Date: null,
				Location: "3 stāvs",
				Works: "Finishing",
				Comments: "Ieklātas grīdas",
				originalUserComment:
					"Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
				originalAudioUrl:
					"https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test",
				WorkersInvolved: 2,
				TimeInvolved: 3,
				createdAt: new Date("2026-06-23T00:00:00.000Z"),
			},
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "no-meta-audio-url")?.status,
		).toBe("fail");
	});

	it("passes ambiguous BIS mention when cleaning work is saved and answer separates BIS submission", () => {
		if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: ambiguousBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: ambiguousBisRecord(),
			records: [ambiguousBisRecord()],
			answer:
				"Telpas tīrīšana saglabāta WorksRecorded dienasgrāmatā. Saglabātie darbu ieraksti ir piemēroti vēlākai iesniegšanai BIS no WorksRecorded portāla.",
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "answer-signal:saglab")
				?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "forbidden-answer-signals")
				?.status,
		).toBe("pass");
		expect(
			result.results.find(
				(item) => item.name === "first-sentence-signal:saglab",
			)?.status,
		).toBe("pass");
	});

	it("fails mixed BIS guidance when the save confirmation is not first", () => {
		if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: ambiguousBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: ambiguousBisRecord(),
			records: [ambiguousBisRecord()],
			answer:
				"BIS iesniegšana notiek WorksRecorded portālā. Telpas tīrīšana saglabāta; saglabātie darbu ieraksti ir piemēroti vēlākai iesniegšanai.",
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find(
				(item) => item.name === "first-sentence-signal:saglab",
			)?.status,
		).toBe("fail");
	});

	it("fails ambiguous BIS mention if answer claims BIS submission was completed", () => {
		if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: ambiguousBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: ambiguousBisRecord(),
			records: [ambiguousBisRecord()],
			answer: "Ieraksts saglabāts un BIS ieraksts izveidots.",
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "forbidden-answer-signals")
				?.status,
		).toBe("fail");
	});

	it("fails ambiguous BIS mention if no site diary record is created", () => {
		if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: ambiguousBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: null,
			records: [],
			answer: "BIS ierakstus vari pievienot WorksRecorded portālā.",
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "record-created")?.status,
		).toBe("fail");
	});

	it("passes an explicit no-save case when no record is created and clarification is returned", () => {
		const noSaveCase = webhookCases.find(
			(item) => item.id === "ambiguous-reference-does-not-save",
		);
		if (!noSaveCase) throw new Error("Missing ambiguous no-save eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: noSaveCase,
			siteId: "site-1",
			userId: "user-1",
			record: null,
			records: [],
			answer: "Lūdzu precizē, ko tieši vēlies saglabāt.",
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "record-created")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "record-count")?.status,
		).toBe("pass");
	});

	it("passes ambiguous BIS mention with a fast-path receipt that does not mention BIS", () => {
		if (!ambiguousBisCase) throw new Error("Missing ambiguous BIS eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: ambiguousBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: ambiguousBisRecord(),
			records: [ambiguousBisRecord()],
			answer:
				"WorksRecorded saglabāju 1 darbu ierakstu.\n\nCleaning — Project\n   Iztīrīta telpa.\n   Datums: 09.07.2026 · Apjoms: 1",
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "answer-signal:saglab")
				?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "forbidden-answer-signals")
				?.status,
		).toBe("pass");
	});

	it("passes BIS no-bis guidance when agent explains BIS is not connected without naming the platform", () => {
		const bisNoBisCase = webhookCases.find(
			(item) => item.id === "bis-entry-how-to-guidance-only-no-bis",
		);
		if (!bisNoBisCase) throw new Error("Missing bis no-bis eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: bisNoBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: null,
			records: [],
			answer:
				"Lai ievadītu ierakstus BISā caur šo čatu, vispirms jābūt pieslēgtam BIS integrācijai. Šobrīd tavai vietnei BIS nav pieslēgts. Ko darīt: atver projekta iestatījumus un aktivizē savienojumu. Kad savienojums būs aktīvs, varēšu palīdzēt ar ierakstu nosūtīšanu.",
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "record-created")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "forbidden-answer-signals")
				?.status,
		).toBe("pass");
	});

	it("passes BIS yes-bis guidance when agent says connection is configured", () => {
		const bisYesBisCase = webhookCases.find(
			(item) => item.id === "bis-entry-how-to-guidance-only-yes-bis",
		);
		if (!bisYesBisCase) throw new Error("Missing bis yes-bis eval case");

		const result = validateWhatsappSiteManagerRecord({
			evalCase: bisYesBisCase,
			siteId: "site-1",
			userId: "user-1",
			record: null,
			records: [],
			answer:
				"Lai ievadītu ierakstus BISā, tev vispirms jābūt pieslēgtam BIS. Tev tas jau ir sakārtots: BIS savienojums ir konfigurēts un lieta ir izvēlēta. Ierakstus vari nosūtīt no čata.",
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "record-created")?.status,
		).toBe("pass");
		expect(
			result.results.find((item) => item.name === "forbidden-answer-signals")
				?.status,
		).toBe("pass");
	});

	it("passes when a two-task case creates two records", () => {
		const twoRecordCase = webhookCases.find(
			(item) => item.id === "latvian-two-explicit-work-records",
		);
		if (!twoRecordCase) throw new Error("Missing two-record eval case");

		const baseRecord = {
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			originalUserComment: null,
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: null,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};
		const records = [
			{
				...baseRecord,
				id: "record-doors",
				Location: "1. stāvs",
				Works: "Durvju uzstādīšana",
				Comments: "Uzstādītas durvis.",
			},
			{
				...baseRecord,
				id: "record-walls",
				Location: "2. stāvs",
				Works: "Sienu krāsošana",
				Comments: "Nokrāsotas sienas.",
				createdAt: new Date("2026-07-01T00:00:01.000Z"),
			},
		];

		const result = validateWhatsappSiteManagerRecord({
			evalCase: twoRecordCase,
			siteId: "site-1",
			userId: "user-1",
			record: records[1],
			records,
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "record-count")?.status,
		).toBe("pass");
	});

	it("passes strict persisted category signals for material delivery", () => {
		if (!sandDeliveryCase) throw new Error("Missing sand delivery eval case");

		const record = {
			id: "record-sand",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Objekts",
			Works: "Materiālu piegāde",
			Comments: "Ievestas smiltis.",
			originalUserComment: "Test Manager : Ievestas smiltis.",
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: null,
			Amounts: null,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};

		const result = validateWhatsappSiteManagerRecord({
			evalCase: sandDeliveryCase,
			siteId: "site-1",
			userId: "user-1",
			record,
			records: [record],
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "expected-record:1")?.status,
		).toBe("pass");
	});

	it("fails strict persisted category signals when material delivery is saved as a note", () => {
		if (!sandDeliveryCase) throw new Error("Missing sand delivery eval case");

		const record = {
			id: "record-sand",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Objekts",
			Works: "Piezīmes",
			Comments: "Ievestas smiltis.",
			originalUserComment: "Test Manager : Ievestas smiltis.",
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: null,
			Amounts: null,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};

		const result = validateWhatsappSiteManagerRecord({
			evalCase: sandDeliveryCase,
			siteId: "site-1",
			userId: "user-1",
			record,
			records: [record],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "expected-record:1")?.status,
		).toBe("fail");
	});

	it("allows zero for dash-style null numeric expectations when the case opts in", () => {
		if (!bobcatSandCase) throw new Error("Missing bobcat sand eval case");

		const record = {
			id: "record-bobcat",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Pamati",
			Works: "Smilts piebēršana pamatiem",
			Comments: "Veikta smilts piebēršana pamatiem ar Bobcat operatoru.",
			originalUserComment:
				"Test Manager : Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
			originalAudioUrl: null,
			WorkersInvolved: 0,
			TimeInvolved: 9.5,
			Amounts: 0,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};

		const result = validateWhatsappSiteManagerRecord({
			evalCase: bobcatSandCase,
			siteId: "site-1",
			userId: "user-1",
			record,
			records: [record],
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "workers-involved")?.status,
		).toBe("pass");
		expect(result.results.find((item) => item.name === "amounts")?.status).toBe(
			"pass",
		);
	});

	it("treats opted-in subrecord mismatches as warning-only diagnostics", () => {
		if (!bobcatSandCase) throw new Error("Missing bobcat sand eval case");

		const record = {
			id: "record-bobcat",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Pamati",
			Works: "Papilddarbi",
			Comments: "Veikta smilts piebēršana pamatiem.",
			originalUserComment:
				"Test Manager : Veikta smilts piebēršana pamatiem ar Bobcat operatoru, 9,5 stundas.",
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: 9.5,
			Amounts: null,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};

		const result = validateWhatsappSiteManagerRecord({
			evalCase: bobcatSandCase,
			siteId: "site-1",
			userId: "user-1",
			record,
			records: [record],
		});

		expect(result.status).toBe("warn");
		expect(
			result.results.find((item) => item.name === "expected-record:1"),
		).toMatchObject({
			status: "fail",
			severity: "warning",
		});
	});

	it("matches expected multi-record rows without depending on save order", () => {
		if (!earthworksSixRecordsCase)
			throw new Error("Missing earthworks six-record eval case");

		const baseRecord = {
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: null,
			Location: "Objekts",
			originalUserComment: null,
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: null,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};
		const records = [
			{
				...baseRecord,
				id: "record-machinery",
				Works: "Piezīmes",
				Comments:
					"Smilts piebēršanu veica bobkatu operators, grunts rakšanu veica ekskavatoru operators, strādāja arī palīkstrādnieks.",
				Amounts: null,
			},
			{
				...baseRecord,
				id: "record-foundation-sand",
				Works: "Smilts piebēršana pamatiem",
				Comments: "Smilts piebēršana pamatiem 400 kubi.",
				Amounts: 400,
			},
			{
				...baseRecord,
				id: "record-excess-soil",
				Works: "Liekās grunts izvešana",
				Comments: "Liekās grunts izvešana 110 kubi.",
				Amounts: 110,
			},
			{
				...baseRecord,
				id: "record-excavation",
				Works: "Grunts rakšana",
				Comments: "Grunts rakšana 80 kubi.",
				Amounts: 80,
			},
			{
				...baseRecord,
				id: "record-sand-delivery",
				Works: "Materiālu piegāde",
				Comments: "Ievestas smilts 180 kubi.",
				Amounts: 180,
			},
			{
				...baseRecord,
				id: "record-weather",
				Works: "Piezīmes",
				Comments: "Laika apstākļi šodien saulains plus 27 grādi.",
				Amounts: null,
			},
		];

		const result = validateWhatsappSiteManagerRecord({
			evalCase: earthworksSixRecordsCase,
			siteId: "site-1",
			userId: "user-1",
			record: records[0],
			records,
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.filter((item) => item.name.startsWith("expected-record:")),
		).toHaveLength(6);
	});

	it("validates the persisted date for an explicit historical-date case", () => {
		const historicalDateCase = webhookCases.find(
			(item) => item.id === "latvian-explicit-historical-date",
		);
		if (!historicalDateCase)
			throw new Error("Missing historical-date eval case");

		const baseRecord = {
			id: "record-date",
			siteId: "site-1",
			userId: "user-1",
			workerId: null,
			Date: new Date("2026-06-15T00:00:00.000Z"),
			Location: "2 stāvs",
			Works: "Sienu krāsošana",
			Comments: "Krāsotas sienas 2. stāvā, 3 h.",
			originalUserComment:
				"Test Manager : Saglabā par 2026. gada 15. jūniju: 2. stāvā krāsotas sienas, 3h.",
			originalAudioUrl: null,
			WorkersInvolved: null,
			TimeInvolved: 3,
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		};

		const passing = validateWhatsappSiteManagerRecord({
			evalCase: historicalDateCase,
			siteId: "site-1",
			userId: "user-1",
			record: baseRecord,
			records: [baseRecord],
		});
		const failing = validateWhatsappSiteManagerRecord({
			evalCase: historicalDateCase,
			siteId: "site-1",
			userId: "user-1",
			record: { ...baseRecord, Date: new Date("2026-06-16T00:00:00.000Z") },
			records: [{ ...baseRecord, Date: new Date("2026-06-16T00:00:00.000Z") }],
		});

		expect(passing.status).toBe("pass");
		expect(
			passing.results.find((item) => item.name === "record-date")?.status,
		).toBe("pass");
		expect(failing.status).toBe("fail");
		expect(
			failing.results.find((item) => item.name === "record-date")?.status,
		).toBe("fail");
	});
});
