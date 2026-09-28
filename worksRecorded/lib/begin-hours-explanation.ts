const number = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 2 });

export function formatBeginExplanationNumber(value: number | null) {
	return value === null ? "—" : number.format(value);
}

function parseWorker(entry: string) {
	const match = entry.match(/^([\p{L}][\p{L}\s.'’()-]*?)\s+(\d.*)$/u);
	if (!match) return null;
	const [, name, time] = match;
	const hours = time.match(
		/^(\d+)\s*h(?:\s*(\d{1,2})\s*min)?(?:\s*\(\d+\s*min\))?$/u,
	);
	const clock = time.match(/^(\d+):(\d{2})$/u);
	const minutes = time.match(/^(\d+)\s*min$/u);
	const parts = hours ?? clock;
	if (parts && Number(parts[2] ?? 0) >= 60) return null;
	const total = parts
		? Number(parts[1]) * 60 + Number(parts[2] ?? 0)
		: minutes
			? Number(minutes[1])
			: null;
	if (total === null || !Number.isSafeInteger(total)) return null;
	return {
		name,
		duration: `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")} min`,
	};
}

function parseCrew(paragraph: string) {
	const prefix =
		paragraph.match(/^(.+?)\s+[—–-]\s+(.+)$/u) ??
		paragraph.match(/^(Begin[^:]+):\s*(.+)$/u);
	if (!prefix || !/brigād|Begin/u.test(prefix[1])) return null;
	const list = prefix[2].replace(/\.$/u, "");
	const total = /\s*=\s*|;\s*kopā\s*/iu.exec(list);
	const names = (total ? list.slice(0, total.index) : list).split(
		/\s*[,;+]\s*/u,
	);
	const timed = names.map(parseWorker);
	if (timed.every((entry) => entry !== null)) {
		return {
			team: prefix[1],
			workers: timed,
			calculation: total
				? `Kopā: ${list.slice(total.index + total[0].length)}`
				: null,
		};
	}
	if (
		!total &&
		names.every((name) => /^[\p{L}'’-]+(?:\s+[\p{L}'’-]+)?$/u.test(name))
	) {
		return {
			team: prefix[1],
			workers: names.map((name) => ({ name, duration: "Nav norādīts" })),
			calculation: null,
		};
	}
	return null;
}

export function presentBeginExplanation(text: string) {
	const body = text.replace(
		/^Stundu (?:uzskaite \d{2}\.\d{2}\.\d{4}\.|(?:aprēķins|sadalījums) \([^\r\n)]*\d{2}\.\d{2}\.\d{4}\.\)):\s*/u,
		"",
	);
	const paragraphs = body
		.split(
			/\r?\n+|(?<=[.!?])\s+(?=[A-ZĀČĒĢĪĶĻŅŠŪŽ]|\d+\s*[×/+*=])|;\s*(?=Stundas\s*[:=])/u,
		)
		.map((part) => part.trim())
		.filter(Boolean);
	const workers: { name: string; duration: string }[] = [];
	let team: string | null = null;
	const calculations: string[] = [];
	const notes: string[] = [];
	for (const paragraph of paragraphs) {
		const crew = team ? null : parseCrew(paragraph);
		if (crew) {
			team = crew.team;
			workers.push(...crew.workers);
			if (crew.calculation) calculations.push(crew.calculation);
			continue;
		}
		const formatted = paragraph.replace(
			/(?<![\d.,])\d+[.,]\d{3,}(?![\d.,])/gu,
			(value) => number.format(Number(value.replace(",", "."))),
		);
		if (
			/^(?:(?:Kopā|Strādnieki|Stundas)\s*[:=]|Strādnieki laukā|\d+[\d\s.,]*[×/+*=])/u.test(
				paragraph,
			)
		)
			calculations.push(formatted);
		else notes.push(formatted);
	}
	return { team, workers, calculations, notes };
}
