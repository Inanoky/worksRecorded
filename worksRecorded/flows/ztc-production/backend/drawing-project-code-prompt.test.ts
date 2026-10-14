import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "whatsapp-worker.ts"), "utf8");

function stringConstant(name: string) {
	const match = source.match(
		new RegExp(`const ${name} =\\s*("(?:[^"\\\\]|\\\\.)*");`),
	);
	if (!match) throw new Error(`Missing prompt ${name}`);
	return JSON.parse(match[1]) as string;
}

it("allows the full H13 code in the ZTC system and image instructions", () => {
	const system = stringConstant("ZTC_DRAWING_EXTRACTION_SYSTEM_PROMPT");
	const userStrings = Array.from(
		source.matchAll(/user:\s*("(?:[^"\\]|\\.)*")/g),
		(match) => JSON.parse(match[1]) as string,
	);
	const user = userStrings.find((text) =>
		text.startsWith("Read the bottom ZTC legend."),
	);
	expect(user).toBeDefined();
	if (!user) throw new Error("Missing ZTC image instructions");
	for (const prompt of [system, user]) {
		expect(prompt).toContain("H13");
		expect(prompt).toContain("top-left");
		expect(prompt).toMatch(/preserve every.*digit/i);
		expect(prompt).not.toMatch(
			/exactly two letters|two-letter projectName|two-letter project code/,
		);
	}
	expect(system).toContain(
		"one to four letters followed by one to four digits",
	);
	expect(system).toContain("Never guess the code");
	expect(system).toContain(
		"Do not extract or expand projectName from the BP row",
	);
});

it("keeps the default-production title-block rules separate", () => {
	const prompt = stringConstant(
		"DEFAULT_PRODUCTION_DRAWING_EXTRACTION_SYSTEM_PROMPT",
	);
	expect(prompt).toContain(
		"project name should be extracted from the value on the BP row",
	);
	expect(prompt).not.toContain(
		"one to four letters followed by one to four digits",
	);
});
