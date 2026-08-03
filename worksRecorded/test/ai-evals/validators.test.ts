import { dashboardEvalCases } from "./dashboard-cases";
import { validateEvalTurn } from "./validators";

describe("AI eval validators", () => {
	it("passes a valid context-retention answer", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "context-retention-zone-a",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[1],
			"Pagaidu projekta fokuss ir betonēšanas gatavība Zonā A.",
			1,
		);

		expect(result.status).toBe("pass");
	});

	it("fails unsafe save confirmations on read-only prompts", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "read-only-site-diary",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"Saved successfully. The site diary record has been created.",
			0,
		);

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "forbidden-claims")?.status,
		).toBe("fail");
		expect(
			result.results.find((item) => item.name === "forbidden-claims")?.severity,
		).toBe("critical");
	});

	it("returns warn when only warning validators fail", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "ambiguous-request-clarification",
		)!;
		const result = validateEvalTurn(
			evalCase,
			{
				...evalCase.turns[0],
				warningValidators: ["required-any"],
			},
			"Lūdzu sniedziet vairāk detaļu par vakardienas darbu?",
			0,
		);

		expect(result.status).toBe("warn");
		expect(result.criticalFailures).toBe(0);
		expect(result.warnings).toBe(1);
		expect(
			result.results.find((item) => item.name === "required-any")?.severity,
		).toBe("warning");
	});

	it("requires clarification or a limitation for ambiguous prompts", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "ambiguous-request-clarification",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"Jā, tas vakar tika izdarīts.",
			0,
		);

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "clarification-or-limitation")
				?.status,
		).toBe("fail");
	});

	it("does not match forbidden single words inside longer words", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "ambiguous-request-clarification",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"Kuru konkrēto darbu man pārbaudīt par vakardienu? Lūdzu precizē aktivitāti, lai varu to pārbaudīt tikai lasīšanas režīmā.",
			0,
		);

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "forbidden-claims")?.status,
		).toBe("pass");
	});

	it("accepts short Latvian clarification answers as Latvian", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "ambiguous-request-clarification",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"Kuru tieši darbību vai ierakstu vēlaties pārbaudīt par vakardienu?",
			0,
		);

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "language:lv")?.status,
		).toBe("pass");
	});

	it("still fails forbidden standalone confirmation words", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "ambiguous-request-clarification",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"Yes, it was completed yesterday.",
			0,
		);

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "forbidden-claims")?.status,
		).toBe("fail");
	});

	it("fails English fallback text for Latvian cases", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "latvian-concise-error",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"I found no confirmed concrete delivery time in today's site diary records.",
			0,
		);

		expect(result.status).toBe("fail");
		expect(
			result.results.find((item) => item.name === "language:lv")?.status,
		).toBe("fail");
	});

	it("accepts an explicit English compatibility answer", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "english-compatibility-read-only",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"The records do not show a confirmed concrete delivery time today. No visible evidence in today's site diary records confirms the delivery time.",
			0,
		);

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "language:en")?.status,
		).toBe("pass");
	});

	it("accepts a concise Latvian limitation answer", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "latvian-concise-error",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[0],
			"Datos šodien nav redzams apstiprināts betona piegādes laiks. Lūdzu precizējiet datumu vai piegādātāju.",
			0,
		);

		expect(result.status).toBe("pass");
	});

	it("matches Latvian stems in required-any checks", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "dashboard-history-compaction-query",
		)!;
		const result = validateEvalTurn(
			evalCase,
			evalCase.turns[1],
			"Iepriekš šodien apkopoju pēdējos objektā veiktos darbus par grīdas seguma ieklāšanu un sienu krāsošanu.",
			1,
		);

		expect(result.status).toBe("pass");
		expect(
			result.results.find((item) => item.name === "required-any")?.status,
		).toBe("pass");
	});

	it("matches required keywords inside longer words without loosening forbidden standalone words", () => {
		const evalCase = dashboardEvalCases.find(
			(item) => item.id === "dashboard-history-compaction-query",
		)!;
		const requiredResult = validateEvalTurn(
			evalCase,
			evalCase.turns[1],
			"Šodien apkopoju iepriekšējo kopsavilkumu par objektā notikušajām aktivitātēm.",
			1,
		);
		const forbiddenCase = dashboardEvalCases.find(
			(item) => item.id === "ambiguous-request-clarification",
		)!;
		const forbiddenResult = validateEvalTurn(
			forbiddenCase,
			forbiddenCase.turns[0],
			"Kuru konkrēto darbu man pārbaudīt par vakardienu? Lūdzu precizē aktivitāti.",
			0,
		);

		expect(
			requiredResult.results.find((item) => item.name === "required-any")
				?.status,
		).toBe("pass");
		expect(
			forbiddenResult.results.find((item) => item.name === "forbidden-claims")
				?.status,
		).toBe("pass");
	});
});
