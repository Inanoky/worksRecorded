import {
	assessLangSmithRunQuality,
	extractOutputText,
	getRunFlow,
	getRunLatencyMs,
} from "./quality";

describe("langsmith heartbeat quality", () => {
	it("extracts nested output text", () => {
		expect(
			extractOutputText({ messages: [{ content: "Darbs pabeigts." }] }),
		).toBe("Darbs pabeigts.");
	});

	it("detects flow from metadata or tags", () => {
		expect(
			getRunFlow({ extra: { metadata: { flow: "whatsapp-worker" } } }),
		).toBe("whatsapp-worker");
		expect(
			getRunFlow({ tags: ["works-recorded", "flow:dashboard-chat"] }),
		).toBe("dashboard-chat");
	});

	it("calculates latency from seconds or timestamps", () => {
		expect(getRunLatencyMs({ latency: 1.5 })).toBe(1500);
		expect(
			getRunLatencyMs({
				start_time: "2026-08-07T12:00:00.000Z",
				end_time: "2026-08-07T12:00:03.250Z",
			}),
		).toBe(3250);
	});

	it("marks errored runs as errors", () => {
		expect(
			assessLangSmithRunQuality({
				error: "boom",
				outputs: { text: "Darba ieraksts saglabāts veiksmīgi." },
			}),
		).toEqual({
			severity: "error",
			reasons: ["langsmith_error"],
		});
	});

	it("flags empty and likely english output for latvian flows", () => {
		expect(assessLangSmithRunQuality({ outputs: {} }).reasons).toContain(
			"empty_output",
		);
		expect(
			assessLangSmithRunQuality({
				tags: ["flow:whatsapp-site-manager"],
				outputs: { text: "Sorry, I cannot help with your site work." },
			}).reasons,
		).toEqual(
			expect.arrayContaining(["failure_phrase", "likely_non_latvian_output"]),
		);
	});
});
