import {
	getZtcExcludedRateTaskKeys,
	normalizeZtcProjectRateExclusions,
} from "@/flows/ztc-production/lib/ztc-rate-exclusions";

describe("ZTC project rate exclusions", () => {
	it("normalizes every category and removes case-insensitive duplicates", () => {
		expect(
			normalizeZtcProjectRateExclusions({
				works: [" latojums 25x45 ", "LATOJUMS 25x45"],
				additionalDetails: ["Kronšteins"],
				additionalWorks: ["CNC projekts", "cnc projekts"],
			}),
		).toEqual({
			works: ["latojums 25x45"],
			additionalDetails: ["Kronšteins"],
			additionalWorks: ["CNC projekts"],
		});
	});

	it("never permits coefficient rows to be excluded", () => {
		expect(
			normalizeZtcProjectRateExclusions({
				works: ["1 koeficients", "X koeficients", "latojums 25x45"],
			}).works,
		).toEqual(["latojums 25x45"]);
	});

	it("produces normalized lookup keys for inherited-rate filtering", () => {
		expect(
			getZtcExcludedRateTaskKeys(
				{ additionalWorks: [" CNC Projekts "] },
				"additionalWorks",
			),
		).toEqual(new Set(["cnc projekts"]));
	});

	it("returns empty category arrays for malformed stored configuration", () => {
		expect(normalizeZtcProjectRateExclusions("invalid")).toEqual({
			works: [],
			additionalDetails: [],
			additionalWorks: [],
		});
	});
});
