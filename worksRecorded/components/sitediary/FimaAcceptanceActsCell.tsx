"use client";

import {
	type FimaRecordActCoverage,
	getFimaAcceptanceActUrl,
	getFimaActStatusLabel,
} from "@/lib/fima/acceptance-acts";

export function FimaAcceptanceActsCell({
	coverage,
	hasBisRecord,
}: {
	coverage?: FimaRecordActCoverage;
	hasBisRecord: boolean;
}) {
	if (!hasBisRecord) return <span>—</span>;
	if (!coverage)
		return <span className="text-muted-foreground">Nav pārbaudīts</span>;
	const checked = new Date(coverage.checkedAt).toLocaleString("lv-LV", {
		timeZone: "Europe/Riga",
	});
	if (!coverage.acts.length)
		return <span title={`Pārbaudīts: ${checked}`}>Nav aktā</span>;
	return (
		<ul className="space-y-2" aria-label="BIS pieņemšanas akti">
			{coverage.acts.map((act) => {
				const href = getFimaAcceptanceActUrl(act.collection, act.id);
				if (!href) return null;
				return (
					<li key={`${act.collection}/${act.id}`}>
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary underline underline-offset-2"
							title={`${act.date ?? ""} · Pārbaudīts: ${checked}`}
							onClick={(event) => event.stopPropagation()}
						>
							{act.number || `Akts ${act.id}`}
						</a>
						<div className="text-xs text-muted-foreground">
							{getFimaActStatusLabel(act.status)}
						</div>
						{act.works.map((work) =>
							work.quantity !== null ? (
								<div key={work.id} className="text-xs tabular-nums">
									{act.works.length > 1
										? `BIS ${work.number ?? work.id}: `
										: ""}
									Aktā: {work.quantity}
								</div>
							) : null,
						)}
					</li>
				);
			})}
		</ul>
	);
}
