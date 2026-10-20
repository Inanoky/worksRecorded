export type FimaBisExample = { id: string; label: string; url: string };
export type FimaBisExamples = {
	entries: FimaBisExample[];
	note?: string;
};

function object(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function example(label: unknown, href: unknown): FimaBisExample | null {
	if (typeof label !== "string" || !label.trim() || typeof href !== "string")
		return null;
	try {
		const url = new URL(href);
		const match = url.pathname.match(
			/^\/bisp\/lv\/portal\/logbooks\/performed_works\/(\d+)(?:\/edit)?\/?$/,
		);
		if (
			url.origin !== "https://bis.gov.lv" ||
			url.username ||
			url.password ||
			!match
		)
			return null;
		return {
			id: match[1],
			label: label.trim(),
			url: `https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${match[1]}`,
		};
	} catch {
		return null;
	}
}

export function parseFimaExampleComment(
	value: unknown,
): FimaBisExamples | null {
	if (typeof value !== "string") return null;
	const lines = value
		.trim()
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const heading = lines.shift();
	if (heading === "Nav parauga." && !lines.length)
		return { entries: [], note: heading };
	if (
		heading !== "Paraugs:" &&
		heading !== "Nav tieša parauga. Salīdzināšanai izmantots:"
	)
		return null;
	if (!lines.length) return null;
	const entries: FimaBisExample[] = [];
	for (const line of lines) {
		const match = line.match(/^(BIS ieraksts Nr\.\d+\s+\(.+\))\s+—\s+(\S+)$/);
		const entry = match ? example(match[1], match[2]) : null;
		if (!entry) return null;
		if (!entries.some((current) => current.url === entry.url))
			entries.push(entry);
	}
	return {
		entries,
		...(heading === "Paraugs:" ? {} : { note: heading }),
	};
}

export function readFimaBisExamples(
	stored: unknown,
	history: unknown = [],
): FimaBisExamples | undefined {
	const value = object(stored);
	const entries = new Map<string, FimaBisExample>();
	const notes = new Set<string>();
	for (const raw of Array.isArray(value.entries) ? value.entries : []) {
		const item = object(raw);
		const entry = example(item.label, item.url);
		if (entry) entries.set(entry.url, entry);
	}
	if (typeof value.note === "string" && value.note.trim())
		notes.add(value.note.trim());
	for (const raw of Array.isArray(history) ? history : []) {
		const event = object(raw);
		const parsed =
			event.kind === "comment" ? parseFimaExampleComment(event.text) : null;
		if (!parsed) continue;
		for (const entry of parsed.entries) entries.set(entry.url, entry);
		if (parsed.note) notes.add(parsed.note);
	}
	if (!entries.size && !notes.size) return undefined;
	return {
		entries: [...entries.values()],
		...(notes.size ? { note: [...notes].join("\n") } : {}),
	};
}

export function migrateFimaExampleComments(metadata: unknown) {
	const root = object(metadata);
	const state = object(root.fimaCollaboration);
	const history: unknown[] = Array.isArray(state.history) ? state.history : [];
	const moved = history.filter((raw) => {
		const event = object(raw);
		return (
			event.kind === "comment" && parseFimaExampleComment(event.text) !== null
		);
	});
	if (!moved.length) return { metadata: root, moved: 0 };
	const archive = Array.isArray(root.fimaExampleCommentArchive)
		? root.fimaExampleCommentArchive
		: [];
	return {
		metadata: {
			...root,
			fimaExampleCommentArchive: [...archive, ...moved],
			fimaCollaboration: {
				...state,
				version: (typeof state.version === "number" ? state.version : 0) + 1,
				examples: readFimaBisExamples(state.examples, history),
				history: history.filter((event) => !moved.includes(event)),
			},
		},
		moved: moved.length,
	};
}
