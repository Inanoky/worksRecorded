"use client";

import { Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadCurrentConstructionWeekReport } from "@/server/actions/construction-planner";
import { getWeeklyReportMessages } from "./weekly-report-i18n";

export function WeeklyPdfExport({
	siteId,
	organizationLanguage,
}: {
	siteId: string;
	organizationLanguage?: string | null;
}) {
	const t = getWeeklyReportMessages(organizationLanguage);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const working = useRef(false);
	async function download() {
		if (working.current) return;
		working.current = true;
		setBusy(true);
		setError("");
		try {
			const [report, { downloadWeeklyPdf }] = await Promise.all([
				loadCurrentConstructionWeekReport(siteId),
				import("./weekly-pdf"),
			]);
			await downloadWeeklyPdf({ ...report, organizationLanguage });
		} catch {
			setError(t.error);
		} finally {
			working.current = false;
			setBusy(false);
		}
	}
	return (
		<div className="flex flex-col gap-1">
			<Button
				variant="outline"
				disabled={busy}
				onClick={() => void download()}
				title={t.hint}
			>
				{busy ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
				) : (
					<Download className="mr-2 h-4 w-4" aria-hidden="true" />
				)}
				{busy ? t.loading : t.button}
			</Button>
			{error ? (
				<p role="alert" className="max-w-sm text-xs text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
