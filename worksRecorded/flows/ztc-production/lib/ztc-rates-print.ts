import type {
	ZtcDefaultTaskRate,
	ZtcRateCategory,
} from "@/flows/ztc-production/backend/actions";
import { isZtcComplexityCoefficientTask } from "@/flows/ztc-production/lib/ztc-rate-constants";

type ZtcPrintRateSection = {
	category: ZtcRateCategory;
	label: string;
	rows: ZtcDefaultTaskRate[];
};

export function printZtcTaskRates(
	projectName: string,
	sections: ZtcPrintRateSection[],
	onError: () => void,
) {
	const frame = document.createElement("iframe");
	frame.title = "Darbu likmju izdruka";
	frame.setAttribute("aria-hidden", "true");
	frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
	const cleanup = () => frame.remove();
	frame.onload = () => {
		try {
			const doc = frame.contentDocument;
			const printWindow = frame.contentWindow;
			if (!doc || !printWindow) throw new Error("Print frame unavailable");
			doc.title = `Darbu likmes · ${projectName}`;
			const appendText = (parent: HTMLElement, tag: string, text: string) => {
				const element = doc.createElement(tag);
				element.textContent = text;
				parent.append(element);
				return element;
			};
			appendText(doc.body, "h1", "Darbu likmes");
			appendText(doc.body, "p", `Projekts: ${projectName}`);
			for (const { category, label, rows } of sections) {
				appendText(doc.body, "h2", label);
				const populatedRows = rows.filter(
					(row) => row.task.trim() || row.rate.trim() || row.laborNorm?.trim(),
				);
				if (!populatedRows.length) {
					appendText(doc.body, "p", "Šajā sadaļā vēl nav likmju.");
					continue;
				}
				const table = doc.createElement("table");
				doc.body.append(table);
				const header = table.createTHead().insertRow();
				const labels = [
					category === "additionalDetails" ? "Detaļa" : "Darbs",
					"Likme",
					"Mērv.",
				];
				if (category === "works") labels.push("Laika norma (st/m2)");
				if (category === "additionalWorks") labels.push("Pie elementa");
				for (const label of labels) {
					const cell = appendText(header, "th", label);
					cell.setAttribute("scope", "col");
				}
				const body = table.createTBody();
				for (const entry of populatedRows) {
					const coefficient = isZtcComplexityCoefficientTask(entry.task);
					const row = body.insertRow();
					const values = [
						entry.task,
						entry.rate,
						coefficient ? "x" : entry.unit,
					];
					if (category === "works")
						values.push(coefficient ? "" : (entry.laborNorm ?? ""));
					if (category === "additionalWorks")
						values.push(
							coefficient ? "" : entry.relatesToElement ? "Jā" : "Nē",
						);
					for (const value of values) appendText(row, "td", value);
				}
			}
			printWindow.addEventListener("afterprint", cleanup, { once: true });
			printWindow.focus();
			printWindow.print();
		} catch {
			cleanup();
			onError();
		}
	};
	frame.srcdoc = `<!doctype html><html lang="lv"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm; }
    body { font-family: Geist, sans-serif; font-size: 16px; line-height: 24px; color: #000; background: #fff; }
    h1 { font-size: 24px; line-height: 32px; margin: 0 0 8px; }
    h2 { font-size: 18px; line-height: 28px; margin: 24px 0 8px; break-after: avoid; }
    p { margin: 0 0 16px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 20px; }
    th, td { border: 1px solid #aaa; padding: 8px; text-align: right; overflow-wrap: anywhere; }
    th:first-child, td:first-child { text-align: left; width: 55%; }
    th { background: #eee; font-weight: 600; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
  </style></head><body></body></html>`;
	document.body.append(frame);
}
