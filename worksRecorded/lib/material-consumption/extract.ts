import {
	type ConsumptionProject,
	type ConsumptionRecord,
	type Material,
	type MaterialObservation,
	materialDate,
	materialObservationSchema,
	materialSourceContent,
	materialSourceHash,
	normalizeMaterialText,
	objectValue,
} from "./model";

const rejectedSources = new Set(["3EB0DDCB0CBE3B1B747F9E"]);
const cementWork =
	/estri(?:ch|ck)|betonesan|sausa betona|vieglbetona|javas klona/;
const thermoWork =
	/thermo\s?white|themrowhite|\btw\b|min[eia]r\w* saist|\blimes?\b/;

function sourceText(record: ConsumptionRecord) {
	return (record.originalUserComment || record.Comments || "")
		.replace(/\r\n?/g, "\n")
		.trim();
}

function sourceIds(record: ConsumptionRecord) {
	const metadata = objectValue(record.evalMetadata);
	return [
		metadata.sourceMessageId,
		...(Array.isArray(metadata.sourceMessageIds)
			? metadata.sourceMessageIds
			: []),
	].filter((value): value is string => typeof value === "string");
}

function parentIds(record: ConsumptionRecord) {
	const metadata = objectValue(record.evalMetadata);
	return [
		metadata.sourceRecordId,
		metadata.parentRecordId,
		objectValue(metadata.limeniSectionMapping).sourceRecordId,
		objectValue(metadata.split).sourceRecordId,
		objectValue(metadata.quantitySplit).parentRecordId,
	].filter((value): value is string => typeof value === "string");
}

function projectAliases(project: ConsumptionProject) {
	const name = normalizeMaterialText(project.name);
	const aliases = [name.split(",")[0].trim()];
	const address = name.match(
		/([a-z]+)\s+(?:iela|dambis|laukums|prospekts|gatve)\s*(\d+\s*[a-z]?)/,
	);
	if (address) aliases.push(`${address[1]} ${address[2].replace(/\s/g, "")}`);
	if (name.includes("balasta"))
		aliases.push("preses nams", "balasta dambis", "balasta iela");
	if (name.includes("uriekstes"))
		aliases.push("uiriekstes", "uriekstes", "u42");
	if (name.includes("smerla")) aliases.push("smerla", "smerlis", "smerlis");
	if (name.includes("raudas")) aliases.push("raudas", "tukums");
	return [...new Set(aliases)].filter((alias) => alias.length >= 4);
}

export function materialProjectText(
	text: string,
	project: ConsumptionProject,
	siblings: ConsumptionProject[],
) {
	if (siblings.length < 2) return { text, ambiguous: false };
	const lines = text.split("\n");
	const starts: { line: number; siteId: string }[] = [];
	for (let line = 0; line < lines.length; line++) {
		const normalized = normalizeMaterialText(lines[line]).replace(
			/(iela)(\d)/g,
			"$1 $2",
		);
		const matches = siblings.filter((site) =>
			projectAliases(site).some((alias) => {
				const escaped = alias
					.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
					.replace(/\s+/g, "\\s*");
				return new RegExp(`${escaped}(?![a-z0-9-])`).test(normalized);
			}),
		);
		if (matches.length === 1) starts.push({ line, siteId: matches[0].id });
	}
	const blocks = starts
		.filter((start) => start.siteId === project.id)
		.map((start) => {
			const next = starts.find(
				(candidate) =>
					candidate.line > start.line && candidate.siteId !== project.id,
			);
			return lines.slice(start.line, next?.line ?? lines.length).join("\n");
		});
	return { text: blocks.join("\n"), ambiguous: blocks.length === 0 };
}

function detectedMaterial(value: string): Material | null {
	const text = normalizeMaterialText(value)
		.replace(/([a-z])(\d)/g, "$1 $2")
		.replace(/(\d)([a-z])/g, "$1 $2");
	if (/\blim(?:e|es|i)?\b|thermo\s?white|themrowhite|\btw\b/.test(text))
		return "thermowhite_glue";
	if (
		/cement|cememt|\bcem\b|estri(?:ch|ck)|betonesan|sausa betona|vieglbetona|javas klona/.test(
			text,
		)
	)
		return "cement";
	return null;
}

function clauseAt(text: string, index: number) {
	const separator = (i: number) =>
		/[;()\n]/.test(text[i]) ||
		(/[.,!]/.test(text[i]) && !(isDigit(text[i - 1]) && isDigit(text[i + 1])));
	function isDigit(value: string | undefined) {
		return value !== undefined && /[0-9]/.test(value);
	}
	let start = index;
	let end = index;
	while (start > 0 && !separator(start - 1)) start--;
	while (end < text.length && !separator(end)) end++;
	return text.slice(start, end).trim();
}

type BagToken = { start: number; end: number; bags: number; marker: string };

function bagTokens(text: string) {
	const patterns = [
		/(?<![a-z\d.,/])(\d+(?:[.,]\d+)?)[ \t]*\.?[ \t]*(?:(cement[a-z]*|lim(?:e|es|i)?|tw)[ \t]*)?(mais(?:i|us|s)?|bags?|lim(?:e|es|i)?|cement[a-z]*)(?![a-z])/g,
		/(?:cement[a-z]*(?:[ \t]+mais(?:i|us|s)?)?|lim(?:e|es|i)?|mais(?:i|us|s)?)[ \t]*[-:–]?[ \t]*(\d+(?:[.,]\d+)?)/g,
	];
	const found: BagToken[] = [];
	for (const pattern of patterns)
		for (const match of text.matchAll(pattern)) {
			const start = match.index;
			const end = start + match[0].length;
			if (found.some((token) => start < token.end && end > token.start))
				continue;
			if (/big\s*$/.test(text.slice(Math.max(0, start - 8), start))) continue;
			if (/bumbas[ \t]*$/.test(text.slice(Math.max(0, start - 15), start)))
				continue;
			found.push({
				start,
				end,
				bags: Number(match[1].replace(",", ".")),
				marker: match[0],
			});
		}
	return found.sort((a, b) => a.start - b.start);
}

function inferredWorkMaterial(records: ConsumptionRecord[]) {
	const works = records.map((row) => normalizeMaterialText(row.Works ?? ""));
	const cement = works.some(
		(work) => cementWork.test(work) && !/skirkarta|pleve/.test(work),
	);
	const thermo = works.some(
		(work) => thermoWork.test(work) && !/skirkarta|pleve/.test(work),
	);
	return cement && !thermo
		? "cement"
		: thermo && !cement
			? "thermowhite_glue"
			: !cement && !thermo
				? (records
						.map((row) => detectedMaterial(row.Comments ?? ""))
						.find((material) => material !== null) ?? null)
				: null;
}

function observationBase(
	records: ConsumptionRecord[],
	sourceKey: string,
	text: string,
) {
	const active = records.filter((row) => !row.archivedAt);
	const primary = active[0] ?? records[0];
	if (!primary.siteId) throw new Error("Material source project is missing");
	const metadata = objectValue(primary.evalMetadata);
	const reporter =
		typeof metadata.reporterName === "string"
			? metadata.reporterName
			: (text.match(/^([^\n]+?)\s*:\s*\[/)?.[1]?.trim() ?? null);
	const date =
		typeof metadata.workDate === "string"
			? metadata.workDate.slice(0, 10)
			: (materialDate(primary.Date) ?? "1970-01-01");
	return {
		sourceKey,
		siteId: primary.siteId,
		date,
		originalText: text,
		recordIds: [...new Set(active.map((row) => row.id))],
		sourceMessageIds: [...new Set(records.flatMap(sourceIds))],
		reporter,
		location:
			[...new Set(active.map((row) => row.Location).filter(Boolean))].join(
				"; ",
			) || null,
		photos: [...new Set(active.flatMap((row) => row.Photos ?? []))],
	};
}

export function extractMaterialSource(args: {
	records: ConsumptionRecord[];
	project: ConsumptionProject;
	siblings?: ConsumptionProject[];
	sourceKey?: string;
}): MaterialObservation[] {
	const { records, project } = args;
	if (
		!records.some((row) => !row.archivedAt) ||
		records.flatMap(sourceIds).some((id) => rejectedSources.has(id))
	)
		return [];
	const original =
		records.map(sourceText).sort((a, b) => b.length - a.length)[0] ?? "";
	const sourceKey =
		args.sourceKey ?? `report:${project.id}:${materialSourceHash(original)}`;
	const base = observationBase(records, sourceKey, original);
	const scoped = materialProjectText(
		original,
		project,
		args.siblings ?? [project],
	);
	const text = normalizeMaterialText(scoped.text).replace(
		/^.*?:\s*\[[^\]]+\]\s*[^:\n]*:\s*/gm,
		(header) => " ".repeat(header.length),
	);
	const fallback = inferredWorkMaterial(records);
	if (scoped.ambiguous)
		return bagTokens(normalizeMaterialText(original)).length
			? [
					{
						...base,
						id: `${sourceKey}:project-review`,
						material: "unknown",
						kind: "consumed",
						bags: null,
						status: "needs_review",
						reason:
							"Vairāku projektu ziņojumā materiālu sadalījums nav viennozīmīgs.",
						quote: original,
						basis: "source",
					},
				]
			: [];
	const tokens = bagTokens(text);
	const entries: MaterialObservation[] = tokens.map((token, index) => {
		const clause = clauseAt(text, token.start);
		const suffix = text
			.slice(token.end)
			.match(/^[ \t]*(?:cement[a-z]*|cem\b|lim(?:e|es|i)?\b)/)?.[0];
		const explicit =
			detectedMaterial(token.marker) ??
			(suffix ? detectedMaterial(suffix) : null);
		const prior = text
			.slice(0, token.start)
			.match(
				/(?:cement[a-z]*|estri(?:ch|ck)|betonesan|limes?|\btw\b|thermowhite)(?![a-z])/g,
			)
			?.at(-1);
		const additiveAmbiguity =
			/plan[ei]?[ck]rit|\bmira\b|\bmapei\b|\bsakret\b/.test(clause) &&
			!/cement/.test(clause);
		const material = additiveAmbiguity
			? "unknown"
			: (explicit ??
				(prior ? detectedMaterial(prior) : null) ??
				fallback ??
				"unknown");
		const markerPosition = clause.indexOf(token.marker);
		const beforeToken = clause.slice(0, Math.max(0, markerPosition));
		const afterToken = clause.slice(
			Math.max(0, markerPosition) + token.marker.length,
		);
		const balance =
			/atlik|balance|palika|paliek|remaining/.test(beforeToken) ||
			/^[ \t]*(?:palika|atlik|remaining|objekta\b)/.test(afterToken);
		const returned = /atpakal|atgriez|returned/.test(clause);
		const originNote =
			text
				.slice(token.end)
				.match(/^[ \t]*\([ \t]*((?:no|veikals|baze|noliktav)[^)\n]*)\)/)?.[1] ??
			"";
		const delivery =
			/piegad|atvest|sanem|savac|collected|deliver|no (?:bazes|veikala|noliktavas|tukuma|siguldas)|senukai|\bveikals\b|\bbaze\b/.test(
				`${clause} ${originNote}`,
			);
		const kind = balance
			? "balance"
			: returned
				? "returned"
				: delivery
					? "delivered"
					: "consumed";
		const ambiguous =
			/\bvai\b|\d\s*[-–]\s*\d\s*(?:maisi|limes)/.test(clause) ||
			material === "unknown";
		return {
			...base,
			id: `${sourceKey}:${index}`,
			material,
			kind,
			bags: token.bags,
			status: ambiguous ? "needs_review" : "reported",
			reason: ambiguous ? "Jāprecizē maisu skaits vai materiāls." : null,
			quote: scoped.text.slice(token.start, token.end),
			basis: "source",
		};
	});
	const consumed = entries.filter((entry) => entry.kind === "consumed");
	const possibleOrigin = entries.filter((entry) => entry.kind === "delivered");
	const workReported =
		cementWork.test(text) || thermoWork.test(text) || fallback !== null;
	if (
		consumed.length === 0 &&
		possibleOrigin.length > 0 &&
		workReported &&
		!entries.some((entry) => entry.kind === "balance") &&
		!/piegade|piegadats|atvests|sanemts|savakts/.test(text)
	) {
		for (const entry of possibleOrigin) entry.kind = "consumed";
	}
	const metadataValues = records.flatMap((row) => {
		const m = objectValue(row.evalMetadata);
		return [
			["cement", m.cementBags ?? m.sourceCementBags],
			["thermowhite_glue", m.glueBags],
		] as const;
	});
	const firstConsumedIndex = entries.findIndex(
		(entry) => entry.kind === "consumed",
	);
	entries.forEach((entry, index) => {
		if (
			entry.kind === "delivered" &&
			firstConsumedIndex > index &&
			metadataValues.some(
				([type, value]) => type === entry.material && value === entry.bags,
			)
		)
			entry.kind = "consumed";
	});
	for (const material of ["cement", "thermowhite_glue"] as const) {
		if (
			entries.some(
				(entry) => entry.material === material && entry.kind === "consumed",
			)
		)
			continue;
		const values = [
			...new Set(
				metadataValues
					.filter(
						([type, value]) =>
							type === material &&
							typeof value === "number" &&
							Number.isFinite(value),
					)
					.map(([, value]) => value as number),
			),
		];
		if (
			values.length === 1 &&
			!entries.some((entry) => entry.material === material)
		) {
			entries.push({
				...base,
				id: `${sourceKey}:metadata:${material}`,
				material,
				kind: "consumed",
				bags: values[0],
				status: "reported",
				reason: null,
				quote: String(values[0]),
				basis: "metadata",
			});
		}
	}
	if (entries.length === 0 && workReported) {
		const reportedCementWork = text
			.split("\n")
			.some(
				(line) =>
					cementWork.test(line) &&
					!/demonta|sagatavos|transport.?beton/.test(line),
			);
		const relevant = text
			.split("\n")
			.filter(
				(line) =>
					!/nevar|sagatavos|demonta|iznems|iztiri|nokasis|slipes|transport.?beton|zages/.test(
						line,
					),
			)
			.join("\n");
		if (
			!reportedCementWork &&
			!cementWork.test(relevant) &&
			!thermoWork.test(relevant) &&
			/nevar|sagatavos|demonta|iznems|iztiri|nokasis|slipes|transport.?beton|zages/.test(
				text,
			)
		)
			return [];
		entries.push({
			...base,
			id: `${sourceKey}:missing`,
			material: reportedCementWork
				? "cement"
				: (detectedMaterial(text) ?? fallback ?? "unknown"),
			kind: "consumed",
			bags: null,
			status: "needs_review",
			reason: /\d+\s+vai\s+\d+/.test(text)
				? "Ziņojumā norādīti alternatīvi maisu skaiti."
				: "Ziņojumā nav norādīts izlietoto maisu skaits.",
			quote: scoped.text,
			basis: "source",
		});
	}
	return entries;
}

export function buildMaterialConsumption(args: {
	records: ConsumptionRecord[];
	projects: ConsumptionProject[];
	reviewed?: MaterialObservation[];
}) {
	const records = args.records.filter(
		(row) =>
			row.siteId && args.projects.some((project) => project.id === row.siteId),
	);
	const parents = new Map(records.map((row) => [row.id, row.id]));
	function root(id: string): string {
		const parent = parents.get(id);
		if (!parent || parent === id) return id;
		const found = root(parent);
		parents.set(id, found);
		return found;
	}
	const byId = new Map(records.map((row) => [row.id, row]));
	const texts = new Map<string, string>();
	const messages = new Map<string, string>();
	for (const row of records) {
		const text = sourceText(row);
		const keys = text ? [`${row.siteId}:${text.replace(/\s+/g, " ")}`] : [];
		for (const key of keys) {
			const other = texts.get(key);
			if (other) parents.set(root(row.id), root(other));
			else texts.set(key, row.id);
		}
		for (const id of sourceIds(row)) {
			const key = `${row.siteId}:${id}`;
			const other = messages.get(key);
			if (other) parents.set(root(row.id), root(other));
			else messages.set(key, row.id);
		}
		for (const id of parentIds(row))
			if (byId.get(id)?.siteId === row.siteId)
				parents.set(root(row.id), root(id));
	}
	const groups = new Map<string, ConsumptionRecord[]>();
	for (const row of records) {
		const key = root(row.id);
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}
	const derived: MaterialObservation[] = [];
	for (const group of groups.values()) {
		if (!group.some((row) => !row.archivedAt)) continue;
		const project = args.projects.find((site) => site.id === group[0].siteId);
		if (!project) continue;
		const text = sourceText(group[0]);
		const siblingIds = new Set(
			records
				.filter((row) => sourceText(row) === text)
				.map((row) => row.siteId),
		);
		const siblings = args.projects.filter((site) => siblingIds.has(site.id));
		const metadata = group.flatMap((row) => {
			const entries = objectValue(row.evalMetadata).materialConsumption;
			return Array.isArray(entries)
				? entries.flatMap((entry) => {
						const parsed = materialObservationSchema.safeParse(entry);
						return parsed.success && parsed.data.siteId === project.id
							? [parsed.data]
							: [];
					})
				: [];
		});
		derived.push(
			...(metadata.length
				? [
						...new Map(
							metadata.map((entry) => [
								entry.id,
								{
									...entry,
									recordIds: group
										.filter((row) => !row.archivedAt)
										.map((row) => row.id),
									photos: [
										...new Set([
											...entry.photos,
											...group
												.filter((row) => !row.archivedAt)
												.flatMap((row) => row.Photos ?? []),
										]),
									],
								},
							]),
						).values(),
					]
				: extractMaterialSource({ records: group, project, siblings })),
		);
	}
	const extraCoveredKeys = new Set<string>();
	const reviewed = (args.reviewed ?? [])
		.filter((entry) =>
			args.projects.some((project) => project.id === entry.siteId),
		)
		.map((entry) => {
			const content = materialSourceContent(entry.originalText);
			const matching =
				content.length > 20
					? derived.filter(
							(row) =>
								row.siteId === entry.siteId &&
								materialSourceContent(row.originalText) === content,
						)
					: [];
			matching.forEach((row) => {
				extraCoveredKeys.add(row.sourceKey);
			});
			return {
				...entry,
				recordIds: [
					...new Set([
						...entry.recordIds,
						...matching.flatMap((row) => row.recordIds),
					]),
				],
			};
		});
	const coveredIds = new Set(
		reviewed.flatMap((entry) =>
			entry.recordIds.map((id) => `${entry.siteId}:${id}`),
		),
	);
	const coveredKeys = new Set(reviewed.map((entry) => entry.sourceKey));
	return [
		...derived.filter(
			(entry) =>
				!extraCoveredKeys.has(entry.sourceKey) &&
				!coveredKeys.has(entry.sourceKey) &&
				!entry.recordIds.some((id) => coveredIds.has(`${entry.siteId}:${id}`)),
		),
		...reviewed,
	].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
