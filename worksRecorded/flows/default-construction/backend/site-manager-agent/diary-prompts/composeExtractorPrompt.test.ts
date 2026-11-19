import { composeSiteDiaryExtractorPrompt } from "./composeExtractorPrompt";

describe("project-specific extraction prompt", () => {
	it("uses compact general rules without importing another project's work positions", () => {
		const prompt = composeSiteDiaryExtractorPrompt({ language: "lv" });
		expect(prompt.systemText.length).toBeLessThan(7_500);
		expect(prompt.systemText).not.toContain("HCS 220");
		expect(prompt.systemText).not.toContain("Assembly Walls");
		expect(prompt.systemText).toContain("ekskavators 3 h un Manitou 1 h");
		expect(prompt.systemText).toContain("calculationEvidence");
		expect(prompt.systemText).toContain("kopējo ilgumu");
		expect(
			prompt.manifest.sections.every(
				(section) => section.description && section.version >= 1,
			),
		).toBe(true);
	});

	it("includes only the rule groups for fields configured by the project", () => {
		const prompt = composeSiteDiaryExtractorPrompt({
			language: "en",
			projectConfig: {
				Date: { Type: "fixed" },
				Works: {
					Type: "dropdown",
					DropDownOptions: { custom: "Customer-specific task" },
				},
				Comments: { Type: "textInput" },
				Amounts: { Type: "noRender" },
			},
		});
		const included = prompt.manifest.sections
			.filter((section) => section.included)
			.map((section) => section.id);
		expect(included).toEqual([
			"ekstrakcijas_avots_un_piezimes",
			"ekstrakcijas_darbu_sadalisana",
			"ekstrakcijas_kategorijas",
		]);
		expect(prompt.systemText).not.toContain("calculationEvidence");
		expect(prompt.systemText).not.toContain("Location=null");
		expect(prompt.systemText).toContain("Comments valoda: en");
	});

	it("keeps NoSorting as one unchanged note without structured work or labour rules", () => {
		const prompt = composeSiteDiaryExtractorPrompt({
			language: "lv",
			client: "NoSorting",
		});
		expect(prompt.manifest.profile).toBe("comment-only");
		expect(
			prompt.manifest.sections
				.filter((section) => section.included)
				.map((section) => section.id),
		).toEqual(["ekstrakcijas_bez_skirsanas"]);
		expect(prompt.systemText).toContain("Comments bez izmaiņām");
		expect(prompt.systemText).not.toContain("calculationEvidence");
		expect(prompt.systemText).not.toContain("DIARY_WORK_SPLIT_POLICY");
	});

	it("keeps the GMCIRL comment provenance and CE rule scoped to that profile", () => {
		const prompt = composeSiteDiaryExtractorPrompt({
			language: "en",
			client: "GMCIRL",
		});
		expect(prompt.systemText).toContain(
			"iekavās saglabā sākotnējo ziņu nemainītu",
		);
		expect(prompt.systemText).toContain("tikai tad, ja tā ir projekta shēmā");
		expect(
			composeSiteDiaryExtractorPrompt({ language: "lv" }).systemText,
		).not.toContain("CE kategoriju");
	});
});
