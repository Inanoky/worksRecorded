import type { BeginDay } from "@/lib/begin-hours";

function nameTokens(name: string) {
	return name
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("lv-LV")
		.trim()
		.split(/\s+/u)
		.filter(Boolean)
		.sort();
}

export function getBeginWorkerComments(
	day: BeginDay | undefined,
	importedAt: string,
	name: string,
): string[] {
	if (!day) return [];
	const revision =
		day.importedAt === importedAt
			? day
			: day.history.find((item) => item.importedAt === importedAt);
	if (!revision) return [];
	const entries = revision.entries.filter((entry) => entry.date === day.date);
	const requested = nameTokens(name);
	if (!requested.length) return [];
	const identities = [
		...new Set(entries.map((entry) => nameTokens(entry.worker).join(" "))),
	];
	const candidates =
		requested.length === 1
			? identities.filter((identity) =>
					identity.split(" ").includes(requested[0]),
				)
			: identities.filter((identity) => identity === requested.join(" "));
	if (candidates.length !== 1) return [];
	return [
		...new Set(
			entries
				.filter((entry) => nameTokens(entry.worker).join(" ") === candidates[0])
				.map((entry) => entry.comment)
				.filter((comment) => comment.trim().length > 0),
		),
	];
}
