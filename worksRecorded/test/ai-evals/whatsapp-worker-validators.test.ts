import { whatsappWorkerEvalCases } from "./whatsapp-worker-cases";
import { validateWhatsappWorkerCase } from "./whatsapp-worker-validators";

describe("WhatsApp worker eval validators", () => {
	const clockInCase = whatsappWorkerEvalCases.find(
		(item) => item.id === "worker-clock-in-card",
	)!;
	const clockOutCase = whatsappWorkerEvalCases.find(
		(item) => item.id === "worker-clock-out",
	)!;
	const diaryCase = whatsappWorkerEvalCases.find(
		(item) => item.id === "worker-diary-text",
	)!;
	const ambiguousCase = whatsappWorkerEvalCases.find(
		(item) => item.id === "worker-ambiguous-latvian",
	)!;

	function baseTimelog(clockOut: Date | null = null) {
		return {
			id: "timelog-1",
			workerId: "worker-1",
			siteId: "site-1",
			clockIn: new Date("2026-06-23T07:00:00.000Z"),
			clockOut,
			createdAt: new Date("2026-06-23T07:00:00.000Z"),
		};
	}

	function workerDiaryRecord() {
		return {
			id: "record-1",
			siteId: "site-1",
			userId: null,
			workerId: "worker-1",
			Location: "2 stāvs",
			Works: "Durvju montāža",
			Comments: "Šodien 2. stāvā montētas durvis, 5 h.",
			originalUserComment: "Test Worker : Šodien 2 stāvā montēju durvis, 5h",
			originalAudioUrl: null,
			createdAt: new Date("2026-06-23T08:00:00.000Z"),
		};
	}

	it("passes when clock-in sends a CTA card and creates no rows", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: clockInCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [
				{
					url: "https://graph.facebook.com/v18.0/eval-phone/messages",
					body: {
						type: "interactive",
						interactive: {
							type: "cta_url",
							action: {
								name: "cta_url",
								parameters: { url: "https://example.test/clock-in?token=abc" },
							},
						},
					},
				},
			],
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "clock-in-card")?.status,
		).toBe("pass");
	});

	it("fails clock-in when the card is missing", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: clockInCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "clock-in-card")?.status,
		).toBe("fail");
		expect(
			result.results.find((item) => item.name === "clock-in-card")?.severity,
		).toBe("critical");
	});

	it("returns warn when only warning validators fail", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: {
				...clockInCase,
				expected: {
					...clockInCase.expected,
					warningValidators: ["clock-in-card"],
				},
			},
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [],
		});

		expect(result.status).toBe("warn");
		expect(result.criticalFailures).toBe(0);
		expect(result.warnings).toBe(1);
		expect(
			result.results.find((item) => item.name === "clock-in-card")?.severity,
		).toBe("warning");
	});

	it("fails when captured graph messages contain raw phone numbers or clock-in tokens", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: clockInCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [
				{
					url: "https://graph.facebook.com/v18.0/eval-phone/messages",
					body: {
						to: "447759808759",
						type: "interactive",
						interactive: {
							type: "cta_url",
							action: {
								name: "cta_url",
								parameters: {
									url: "https://example.test/clock-in?token=abcdefghijklmnopqrstuvwxyz",
								},
							},
						},
					},
				},
			],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "graph-message-redaction")
				?.status,
		).toBe("fail");
	});

	it("passes when clock-out closes the seeded timelog", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: clockOutCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [],
			timelogRecords: [baseTimelog(new Date("2026-06-23T15:00:00.000Z"))],
			seededTimelogId: "timelog-1",
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [],
		});

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "clock-out-closed")?.status,
		).toBe("pass");
	});

	it("passes when work text creates a worker-owned diary record", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: diaryCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [workerDiaryRecord()],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [],
		});

		expect(result.status).toBe("pass");
		expect(result.heuristic.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "worker-diary-no-user")
				?.status,
		).toBe("pass");
	});

	it("fails when a worker diary eval creates a user-owned record", () => {
		const userOwnedRecord = {
			...workerDiaryRecord(),
			userId: "user-1",
			workerId: null,
		};

		const result = validateWhatsappWorkerCase({
			evalCase: diaryCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [userOwnedRecord],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [],
		});

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "no-user-diary-record")
				?.status,
		).toBe("fail");
	});

	it("passes when an ambiguous message creates no operational side effects", () => {
		const result = validateWhatsappWorkerCase({
			evalCase: ambiguousCase,
			responseStatus: 200,
			siteId: "site-1",
			workerId: "worker-1",
			diaryRecords: [],
			timelogRecords: [],
			workerAfter: { id: "worker-1", isClockedIn: false },
			graphMessages: [],
		});

		expect(result.status).toBe("pass");
	});
});
