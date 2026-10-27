import {
	calculateForma2MoneyTotals,
	type Forma2ResultRow,
} from "./forma2-analytics";

export function buildForma2SectionSummaries(rows: Forma2ResultRow[]) {
	const children = new Map<string, Forma2ResultRow[]>();
	for (const row of rows) {
		if (!row.parentId) continue;
		const group = children.get(row.parentId) ?? [];
		group.push(row);
		children.set(row.parentId, group);
	}
	return rows
		.filter((row) => !row.parentId)
		.map((row) => {
			const descendants: Forma2ResultRow[] = [];
			const visited = new Set([row.id]);
			const append = (id: string) => {
				for (const child of children.get(id) ?? []) {
					if (visited.has(child.id)) continue;
					visited.add(child.id);
					descendants.push(child);
					append(child.id);
				}
			};
			append(row.id);
			return {
				row,
				children: descendants,
				totals: calculateForma2MoneyTotals([row, ...descendants]),
			};
		});
}

export function forma2PositionLabel(
	row: Pick<Forma2ResultRow, "code" | "name">,
) {
	const code = row.code.trim();
	const name = row.name.trim();
	return !code || name.toLocaleLowerCase().startsWith(code.toLocaleLowerCase())
		? name || code
		: `${code} ${name}`;
}
