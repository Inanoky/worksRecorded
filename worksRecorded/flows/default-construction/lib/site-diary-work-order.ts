const WORK_PREFIX = /^\s*(\d+(?:\.\d+)+)(?:\s|$)/u;

function readWorkPrefix(value: string) {
	const match = value.match(WORK_PREFIX);
	return match ? match[1].split(".").map(Number) : null;
}

export function compareSiteDiaryWorkPrefixes(left: string, right: string) {
	const leftPrefix = readWorkPrefix(left);
	const rightPrefix = readWorkPrefix(right);

	if (!leftPrefix && !rightPrefix) return 0;
	if (!leftPrefix) return 1;
	if (!rightPrefix) return -1;

	const segmentCount = Math.max(leftPrefix.length, rightPrefix.length);
	for (let index = 0; index < segmentCount; index += 1) {
		if (leftPrefix[index] == null) return -1;
		if (rightPrefix[index] == null) return 1;
		if (leftPrefix[index] !== rightPrefix[index]) {
			return leftPrefix[index] - rightPrefix[index];
		}
	}
	return 0;
}

export function compareSiteDiaryWorks(left: string, right: string) {
	return (
		compareSiteDiaryWorkPrefixes(left, right) ||
		left.localeCompare(right, "lv", { numeric: true, sensitivity: "base" })
	);
}
