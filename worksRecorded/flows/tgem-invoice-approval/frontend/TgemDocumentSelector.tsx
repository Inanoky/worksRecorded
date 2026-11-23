"use client";

import { FileText, ImageIcon } from "lucide-react";
import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import { tgemDocumentDisplayName } from "@/lib/tgem-invoice-approval/document-label";

export function TgemDocumentSelector({
	invoice,
	selectedId,
	onChange,
	language,
}: {
	invoice: TgemDashboardInvoice;
	selectedId: string;
	onChange: (id: string) => void;
	language?: string | null;
}) {
	if (invoice.documents.length < 2) return null;
	const label =
		language === "lv"
			? "Dokumenti"
			: language === "ru"
				? "Документы"
				: "Documents";
	return (
		<ul aria-label={label} className="max-h-56 space-y-1.5 overflow-y-auto p-2">
			{invoice.documents.map((document, index) => {
				const selected = document.id === selectedId;
				const Icon =
					document.contentType === "application/pdf" ? FileText : ImageIcon;
				return (
					<li key={document.id}>
						<button
							type="button"
							aria-pressed={selected}
							onClick={() => onChange(document.id)}
							title={document.originalFilename}
							className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 ${selected ? "border-tgem-primary/40 bg-tgem-primary/10 text-tgem-primary" : "border-border bg-background hover:bg-muted"}`}
						>
							<span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
								{index + 1}.
							</span>
							<Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">
								{tgemDocumentDisplayName(document.originalFilename)}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
