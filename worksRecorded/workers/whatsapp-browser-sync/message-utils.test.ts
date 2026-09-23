import {
	buildClusterIdempotencyKey,
	clusterWhatsappMessages,
	extractPhone,
	type LoadedWhatsappMessage,
	parseWhatsappPrePlainText,
} from "./message-utils";

function message(
	sourceId: string,
	sentAt: string,
	senderName = "Sergejs",
): LoadedWhatsappMessage {
	return {
		sourceId,
		senderName,
		senderPhone: "+371 25 358 482",
		sentAt,
		text: sourceId,
		hasImage: false,
	};
}

describe("WhatsApp browser message utilities", () => {
	it("parses WhatsApp pre-plain metadata in Riga time", () => {
		const parsed = parseWhatsappPrePlainText("[20:20, 22.09.2026] Sergejs: ");
		expect(parsed).toEqual({
			senderName: "Sergejs",
			sentAt: "2026-09-22T20:20:00.000+03:00",
		});
	});

	it("extracts and normalizes a phone label", () => {
		expect(
			extractPhone("Open chat details for Maybe Sergejs +371 25 358 482"),
		).toBe("+371 25 358 482");
	});

	it("clusters adjacent messages from the same sender", () => {
		const clusters = clusterWhatsappMessages([
			message("one", "2026-09-22T20:20:00.000+03:00"),
			message("two", "2026-09-22T20:21:00.000+03:00"),
			message("three", "2026-09-22T20:21:30.000+03:00", "Ralfs"),
		]);
		expect(
			clusters.map((cluster) => cluster.map((item) => item.sourceId)),
		).toEqual([["one", "two"], ["three"]]);
	});

	it("builds stable idempotency keys", () => {
		expect(buildClusterIdempotencyKey("Group", ["a", "b"])).toBe(
			buildClusterIdempotencyKey("Group", ["a", "b"]),
		);
		expect(buildClusterIdempotencyKey("Group", ["a", "b"])).not.toBe(
			buildClusterIdempotencyKey("Group", ["b", "a"]),
		);
	});
});
