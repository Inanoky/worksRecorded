import { Prisma } from "@prisma/client";
import { fimaBisPendingStatuses } from "@/lib/fima/bis-status";
import { readFimaDiaryFilters } from "@/lib/fima/diary-filters";

type Where = Prisma.sitediaryrecordsWhereInput;

function arrayPresence(path: string[], array: Prisma.InputJsonValue = [{}]) {
	const present: Where = { evalMetadata: { path, array_contains: array } };
	const missing: Where = {
		OR: [{ evalMetadata: { path, equals: Prisma.AnyNull } }, { NOT: present }],
	};
	return { present, missing };
}

export function buildFimaDiaryFilterWhere(input: unknown): Where[] {
	const filters = readFimaDiaryFilters(input);
	const conditions: Where[] = [];
	if (filters.bisStatus) {
		const absent: Where = { OR: [{ bisStatus: null }, { bisStatus: "" }] };
		const known: Where = {
			bisStatus: {
				in: ["approved", ...fimaBisPendingStatuses],
				mode: "insensitive",
			},
		};
		conditions.push(
			filters.bisStatus === "works_recorded"
				? absent
				: filters.bisStatus === "approved"
					? { bisStatus: { equals: "approved", mode: "insensitive" } }
					: filters.bisStatus === "pending"
						? {
								bisStatus: {
									in: [...fimaBisPendingStatuses],
									mode: "insensitive",
								},
							}
						: { AND: [{ NOT: absent }, { NOT: known }] },
		);
	}
	if (filters.review) {
		conditions.push({
			evalMetadata: {
				path: ["fimaCollaboration", "status"],
				equals:
					filters.review === "unassigned" ? Prisma.AnyNull : filters.review,
			},
		});
	}
	if (filters.bis) {
		const imported = arrayPresence(["kuceImport", "bisLinks"]);
		conditions.push(
			filters.bis === "present"
				? {
						OR: [
							{ AND: [{ BISId: { not: null } }, { BISId: { not: "" } }] },
							imported.present,
						],
					}
				: {
						AND: [{ OR: [{ BISId: null }, { BISId: "" }] }, imported.missing],
					},
		);
	}
	if (filters.materials) {
		const prepared = arrayPresence(["fimaCollaboration", "materials"]);
		const used = arrayPresence(
			["fimaCollaboration", "bisMaterials", "entries"],
			[{ materials: [{}] }],
		);
		conditions.push(
			filters.materials === "present"
				? { OR: [prepared.present, used.present] }
				: { AND: [prepared.missing, used.missing] },
		);
	}
	if (filters.examples) {
		const examples = arrayPresence([
			"fimaCollaboration",
			"examples",
			"entries",
		]);
		conditions.push(examples[filters.examples]);
	}
	return conditions;
}
