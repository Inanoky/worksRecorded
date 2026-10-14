export type ZtcSessionCommand = "pause" | "resume";

function isSingleTypo(value: string, expected: string) {
	if (value === expected) return true;
	if (Math.abs(value.length - expected.length) > 1) return false;
	if (value.length === expected.length) {
		const differences: number[] = [];
		for (let index = 0; index < value.length; index++) {
			if (value[index] !== expected[index]) differences.push(index);
			if (differences.length > 2) return false;
		}
		if (differences.length === 1) return true;
		const [first, second] = differences;
		return (
			second === first + 1 &&
			value[first] === expected[second] &&
			value[second] === expected[first]
		);
	}
	const shorter = value.length < expected.length ? value : expected;
	const longer = value.length < expected.length ? expected : value;
	let index = 0;
	while (index < shorter.length && shorter[index] === longer[index]) index++;
	return shorter.slice(index) === longer.slice(index + 1);
}

export function parseZtcSessionCommand(text: string): ZtcSessionCommand | null {
	const normalized = text
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "");
	if (!/^[a-z]+$/.test(normalized)) return null;
	const matches = (
		[
			["pause", "pauze"],
			["resume", "turpinu"],
		] as const
	).filter(([, expected]) => isSingleTypo(normalized, expected));
	return matches.length === 1 ? matches[0][0] : null;
}
