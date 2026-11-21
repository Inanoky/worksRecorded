import type { FimaAcceptanceAct } from "@/lib/fima/acceptance-acts";
import { getFimaAcceptanceActUrl } from "@/lib/fima/acceptance-acts";
import type { Forma2MappingRow, Forma2Position } from "./forma2-analytics";
import {
	getForma2QuantityExclusion,
	getForma2ReportedQuantity,
} from "./forma2-quantities";

export const FORMA2_ACT_ASSIGNMENTS = "fimaForma2ActAssignments";
export const FORMA2_PILOT = "fimaForma2Pilot";

export type Forma2CoverageAct = Pick<
	FimaAcceptanceAct,
	"id" | "collection" | "number" | "status" | "works"
> & { key: string; title?: string | null };

export type Forma2ActAssignment = {
	actKey: string;
	positionId: string;
};

export type Forma2ActCoverage = {
	caseId: string;
	documentId: string;
	acts: {
		key: string;
		label: string;
		title: string | null;
		status: string;
		url: string;
		positionId: string | null;
		matchedWorks: number;
		nativeWorks: number;
	}[];
	coveredByPosition: Record<string, number>;
};

export function readForma2ActAssignments(
	value: unknown,
	caseId: string,
	documentId: string,
): Forma2ActAssignment[] {
	const data = value as {
		caseId?: string;
		documentId?: string;
		assignments?: unknown;
	} | null;
	if (
		data?.caseId !== caseId ||
		data.documentId !== documentId ||
		!Array.isArray(data.assignments)
	)
		return [];
	return data.assignments.filter(
		(item): item is Forma2ActAssignment =>
			typeof item?.actKey === "string" && typeof item?.positionId === "string",
	);
}

export function buildForma2ActCoverage(args: {
	caseId: string;
	documentId: string;
	positions: Forma2Position[];
	works: Forma2MappingRow[];
	bisWorkIdsByRecord: ReadonlyMap<string, readonly string[]>;
	acts: Forma2CoverageAct[];
	assignments: Forma2ActAssignment[];
}): Forma2ActCoverage {
	const positions = new Map(
		args.positions.map((position) => [position.id, position]),
	);
	const positionByAct = new Map(
		args.assignments.map(({ actKey, positionId }) => [actKey, positionId]),
	);
	const executionByWork = new Map<string, Map<string, number>>();
	const scopesByWork = new Map<string, Set<string>>();
	for (const row of args.works) {
		if (row.type !== "work") continue;
		const workIds = args.bisWorkIdsByRecord.get(row.id);
		if (workIds?.length !== 1) continue;
		const workId = workIds[0];
		const scope = row.label.trim().toLocaleLowerCase("lv");
		const scopes = scopesByWork.get(workId) ?? new Set<string>();
		scopes.add(scope);
		scopesByWork.set(workId, scopes);

		const position = row.assignedPositionId
			? positions.get(row.assignedPositionId)
			: null;
		const quantity = getForma2ReportedQuantity(row);
		if (
			position?.kind !== "work" ||
			quantity == null ||
			quantity <= 0 ||
			getForma2QuantityExclusion(quantity, row.unit, position.unit)
		)
			continue;
		const byPosition = executionByWork.get(workId) ?? new Map<string, number>();
		byPosition.set(position.id, (byPosition.get(position.id) ?? 0) + quantity);
		executionByWork.set(workId, byPosition);
	}

	const coveredWorks = new Map<
		string,
		{ positionId: string; quantity: number }
	>();
	const acts = args.acts.flatMap((act) => {
		const url = getFimaAcceptanceActUrl(act.collection, act.id);
		if (!url) return [];
		const positionId = positionByAct.get(act.key) ?? null;
		const validPosition =
			positionId && positions.get(positionId)?.kind === "work"
				? positionId
				: null;
		const works = new Set(act.works.map((work) => work.id));
		const matchedWorks = new Set<string>();
		for (const work of act.works) {
			if (!validPosition) continue;
			const execution = executionByWork.get(work.id);
			const quantity = execution?.get(validPosition);
			if (
				scopesByWork.get(work.id)?.size !== 1 ||
				execution?.size !== 1 ||
				quantity === undefined
			)
				continue;
			matchedWorks.add(work.id);
			if (
				act.status !== "approved" ||
				work.quantity == null ||
				work.quantity <= 0
			)
				continue;
			const covered = Math.min(quantity, work.quantity);
			if (covered > (coveredWorks.get(work.id)?.quantity ?? 0)) {
				coveredWorks.set(work.id, {
					positionId: validPosition,
					quantity: covered,
				});
			}
		}
		return [
			{
				key: act.key,
				label: act.number ?? act.id,
				title: act.title ?? null,
				status: act.status,
				url,
				positionId: validPosition,
				matchedWorks: matchedWorks.size,
				nativeWorks: works.size,
			},
		];
	});

	const coveredByPosition = new Map<string, number>();
	for (const { positionId, quantity } of coveredWorks.values()) {
		coveredByPosition.set(
			positionId,
			(coveredByPosition.get(positionId) ?? 0) + quantity,
		);
	}
	return {
		caseId: args.caseId,
		documentId: args.documentId,
		acts,
		coveredByPosition: Object.fromEntries(coveredByPosition),
	};
}
