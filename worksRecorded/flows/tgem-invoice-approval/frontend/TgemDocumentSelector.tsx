"use client";

import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";

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
	const copy =
		language === "lv"
			? ["Izvēlēties dokumentu", "Pamatdokuments", "Pielikums"]
			: language === "ru"
				? ["Выбрать документ", "Основной документ", "Приложение"]
				: ["Choose document", "Main document", "Attachment"];
	return (
		<select
			aria-label={copy[0]}
			value={selectedId}
			onChange={(event) => onChange(event.target.value)}
			className="min-w-0 max-w-full rounded-md border bg-background px-2 py-1.5 text-sm font-normal"
		>
			{invoice.documents.map((document, index) => (
				<option key={document.id} value={document.id}>
					{index + 1}. {document.originalFilename}
					{invoice.primaryDocumentId
						? ` — ${document.id === invoice.primaryDocumentId ? copy[1] : copy[2]}`
						: ""}
				</option>
			))}
		</select>
	);
}
