import { classifyRegularSiteDiaryImageCaption } from "./site-manager-image-date-intent";

describe("classifyRegularSiteDiaryImageCaption", () => {
	const now = new Date("2026-08-28T09:00:00.000Z");

	it("resolves vakardienai to yesterday in Europe/Riga", () => {
		const intent = classifyRegularSiteDiaryImageCaption({
			caption: "Pievieno šo foto vakardienai",
			now,
		});

		expect(intent.targetDateISO).toBe("2026-08-27");
		expect(intent.targetDate?.toISOString()).toBe("2026-08-27T09:00:00.000Z");
		expect(intent.shouldProcessCaptionAsDiaryText).toBe(false);
	});

	it("resolves aizvakar to the day before yesterday", () => {
		const intent = classifyRegularSiteDiaryImageCaption({
			caption: "Aizvakar",
			now,
		});

		expect(intent.targetDateISO).toBe("2026-08-26");
	});

	it("resolves explicit local dates", () => {
		const intent = classifyRegularSiteDiaryImageCaption({
			caption: "Pievieno foto 25.08.2026",
			now,
		});

		expect(intent.targetDateISO).toBe("2026-08-25");
	});

	it("leaves targetDate empty when there is no date intent", () => {
		const intent = classifyRegularSiteDiaryImageCaption({
			caption: "Skats no trešā stāva",
			now,
		});

		expect(intent.targetDate).toBeNull();
		expect(intent.targetDateISO).toBeNull();
		expect(intent.shouldProcessCaptionAsDiaryText).toBe(true);
	});

	it("keeps work-report captions eligible for diary text processing", () => {
		const intent = classifyRegularSiteDiaryImageCaption({
			caption: "Vakardien pabeidzām starpsienas, 2 cilvēki, 3h",
			now,
		});

		expect(intent.targetDateISO).toBe("2026-08-27");
		expect(intent.shouldProcessCaptionAsDiaryText).toBe(true);
	});
});
