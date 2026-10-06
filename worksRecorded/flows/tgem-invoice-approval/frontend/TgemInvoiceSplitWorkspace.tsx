"use client";

import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	GitBranch,
	Loader2,
	Plus,
	Scissors,
	Trash2,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	calculateTgemInvoiceSplit,
	TgemInvoiceSplitCalculationError,
	type TgemInvoiceSplitCalculationErrorCode,
	type TgemInvoiceSplitLineRequest,
} from "@/lib/tgem-invoice-approval/split-allocation";
import { submitTgemInvoiceSplit } from "@/server/actions/tgem-invoice-split-actions";

type LineDraft = {
	correctedSourceQuantity: string;
	wholeProjectId: string | null;
	allocations: Record<string, string>;
};

type SplitMode = "quantity" | "itemPercentage" | "invoicePercentage";

type PreviewState =
	| {
			result: ReturnType<typeof calculateTgemInvoiceSplit>;
			error: null;
	  }
	| { result: null; error: string };

const COMPLETED_STEP_STATUSES = new Set([
	"approved",
	"rejected",
	"changes_requested",
]);

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			action: "Sadalīt rēķinu",
			title: "Sadalīt pozīcijas pa projektiem",
			description:
				"Izveidojiet atsevišķus rēķinus izvēlētajiem projektiem. Oriģinālais rēķins tiks arhivēts.",
			destinations: "Saņēmējprojekti",
			destination: "Projekts",
			addDestination: "Pievienot projektu",
			removeDestination: "Noņemt projektu",
			chooseProject: "Izvēlieties projektu",
			remainingProject: "Atlikuma projekts",
			remainingProjectHelp:
				"Rēķinam pašlaik nav projekta. Izvēlieties, kur saglabāt neizdalītās pozīcijas.",
			allocations: "Pozīciju sadalījums",
			splitMethod: "Sadalīšanas veids",
			quantityMethod: "Daudzums",
			itemPercentageMethod: "Pozīcijas %",
			invoicePercentageMethod: "Visa rēķina %",
			percentageFor: "Procenti projektam",
			percentage: "Procenti",
			equalSplit: "Sadalīt vienādi",
			remainingPercentage: "Oriģinālajam projektam paliek",
			sourceQuantity: "Sākotnējais daudzums",
			manualSourceQuantity: "Ievadiet sākotnējo daudzumu",
			manualSourceHelp:
				"Daļējai sadalīšanai nepieciešams konkrēts sākotnējais daudzums.",
			wholeRow: "Visa pozīcija",
			wholeRowTo: "Visa pozīcija projektam",
			quantityFor: "Daudzums projektam",
			preview: "Rezultāta priekšskatījums",
			allocated: "Piešķirts",
			residual: "Atlikums",
			lines: "pozīcijas",
			subtotal: "Bez PVN",
			adjustment: "Izlīdzinājums",
			vat: "PVN",
			total: "Kopā",
			reconciliation: "Kontroles summa",
			sourceInvoice: "Avota rēķins",
			generatedInvoices: "Jaunie rēķini",
			balanced: "Sakrīt",
			cancel: "Atcelt",
			confirm: "Apstiprināt sadalīšanu",
			confirming: "Sadala…",
			unavailable:
				"Rēķinu var sadalīt tikai pēc apstrādes, pirms apmaksas un pirms apstiprināšanas lēmuma.",
			conflict:
				"Rēķins pa šo laiku ir mainīts. Dati tika atjaunināti; atveriet sadalīšanu vēlreiz.",
			failed: "Rēķinu neizdevās sadalīt. Pārbaudiet datus un mēģiniet vēlreiz.",
			errors: {
				access_denied: "Jums vairs nav piekļuves šim rēķinam.",
				approval_decided:
					"Rēķinam jau ir saglabāts apstiprināšanas lēmums, tāpēc to nevar sadalīt.",
				extraction_incomplete: "Pagaidiet, līdz rēķina apstrāde ir pabeigta.",
				invalid_input: "Sadalīšanas dati nav derīgi.",
				invalid_state: "Rēķina pašreizējais statuss neļauj to sadalīt.",
				non_leaf: "Šis rēķins jau ir sadalīts. Atjauniniet rēķinu sarakstu.",
				paid: "Apmaksātu rēķinu nevar sadalīt.",
				processing: "Pagaidiet, līdz rēķina apstrāde ir pabeigta.",
				project_unavailable:
					"Kāds no izvēlētajiem projektiem vairs nav pieejams.",
				destination_required: "Izvēlieties vismaz vienu saņēmējprojektu.",
				duplicate_destination:
					"Katru saņēmējprojektu izvēlieties tikai vienu reizi.",
				destination_has_no_allocation:
					"Katram saņēmējprojektam piešķiriet vismaz vienu pozīciju vai daudzumu.",
				residual_project_required: "Izvēlieties atlikuma projektu.",
				residual_matches_destination:
					"Atlikuma projekts nevar būt arī saņēmējprojekts.",
				full_split_requires_multiple_projects:
					"Ja atlikuma nav, sadaliet rēķinu vismaz starp diviem projektiem.",
				source_quantity_required:
					"Ievadiet sākotnējo daudzumu daļēji sadalāmajai pozīcijai.",
				allocation_exceeds_quantity:
					"Piešķirtais daudzums pārsniedz sākotnējo daudzumu.",
				invalid_quantity: "Daudzumam jābūt lielākam par nulli.",
				currency_mismatch:
					"Rēķina galvenē un pozīcijās ir atšķirīgas valūtas. Pirms sadalīšanas izlabojiet rēķina datus.",
				invalid_currency:
					"Rēķina valūta nav derīga. Pirms sadalīšanas izlabojiet rēķina datus.",
				invalid_money:
					"Kāda no rēķina summām nav derīga. Pirms sadalīšanas izlabojiet rēķina datus.",
				invalid_money_precision:
					"Kādai no rēķina summām ir pārāk daudz zīmju aiz komata. Pirms sadalīšanas izlabojiet rēķina datus.",
				invalid_percentage:
					"Procentam jābūt lielākam par 0 un ne lielākam par 100.",
				invalid_percentage_precision:
					"Procentam drīkst būt ne vairāk kā divas zīmes aiz komata.",
				percentage_exceeds_100: "Piešķirto procentu summa pārsniedz 100%.",
				percentage_mode_conflict:
					"Izvēlieties tikai vienu procentu sadalīšanas veidu.",
				irreconcilable_headers:
					"Rēķina summa bez PVN un PVN nesakrīt ar kopējo summu. Pirms sadalīšanas izlabojiet rēķina kopsummas.",
				monetary_basis_required:
					"Pozīcijai nav pietiekamu summas datu daļējai sadalīšanai.",
				default: "Pabeidziet derīgu pozīciju sadalījumu, lai turpinātu.",
			},
		};
	}
	if (language === "ru") {
		return {
			action: "Разделить счёт",
			title: "Разделить позиции по проектам",
			description:
				"Создайте отдельные счета для выбранных проектов. Исходный счёт будет архивирован.",
			destinations: "Проекты-получатели",
			destination: "Проект",
			addDestination: "Добавить проект",
			removeDestination: "Удалить проект",
			chooseProject: "Выберите проект",
			remainingProject: "Проект для остатка",
			remainingProjectHelp:
				"Счёт пока не назначен проекту. Выберите, где сохранить нераспределённые позиции.",
			allocations: "Распределение позиций",
			splitMethod: "Способ разделения",
			quantityMethod: "Количество",
			itemPercentageMethod: "% позиции",
			invoicePercentageMethod: "% всего счёта",
			percentageFor: "Процент для проекта",
			percentage: "Процент",
			equalSplit: "Разделить поровну",
			remainingPercentage: "Исходному проекту остаётся",
			sourceQuantity: "Исходное количество",
			manualSourceQuantity: "Введите исходное количество",
			manualSourceHelp:
				"Для частичного разделения требуется конкретное исходное количество.",
			wholeRow: "Вся позиция",
			wholeRowTo: "Вся позиция проекту",
			quantityFor: "Количество для проекта",
			preview: "Предпросмотр результата",
			allocated: "Распределён",
			residual: "Остаток",
			lines: "позиций",
			subtotal: "Без НДС",
			adjustment: "Корректировка",
			vat: "НДС",
			total: "Итого",
			reconciliation: "Контрольная сумма",
			sourceInvoice: "Исходный счёт",
			generatedInvoices: "Новые счета",
			balanced: "Совпадает",
			cancel: "Отмена",
			confirm: "Подтвердить разделение",
			confirming: "Разделение…",
			unavailable:
				"Счёт можно разделить только после обработки, до оплаты и до решения по согласованию.",
			conflict:
				"Счёт изменился. Данные обновлены; откройте разделение ещё раз.",
			failed:
				"Не удалось разделить счёт. Проверьте данные и попробуйте ещё раз.",
			errors: {
				access_denied: "У вас больше нет доступа к этому счёту.",
				approval_decided:
					"По счёту уже сохранено решение согласования, поэтому его нельзя разделить.",
				extraction_incomplete: "Дождитесь завершения обработки счёта.",
				invalid_input: "Данные разделения некорректны.",
				invalid_state: "Текущий статус счёта не позволяет разделение.",
				non_leaf: "Этот счёт уже разделён. Обновите список счетов.",
				paid: "Оплаченный счёт нельзя разделить.",
				processing: "Дождитесь завершения обработки счёта.",
				project_unavailable: "Один из выбранных проектов больше недоступен.",
				destination_required: "Выберите хотя бы один проект-получатель.",
				duplicate_destination:
					"Каждый проект-получатель можно выбрать только один раз.",
				destination_has_no_allocation:
					"Распределите хотя бы одну позицию или количество каждому проекту.",
				residual_project_required: "Выберите проект для остатка.",
				residual_matches_destination:
					"Проект для остатка не может быть проектом-получателем.",
				full_split_requires_multiple_projects:
					"Если остатка нет, разделите счёт минимум между двумя проектами.",
				source_quantity_required:
					"Введите исходное количество для частично разделяемой позиции.",
				allocation_exceeds_quantity:
					"Распределённое количество превышает исходное.",
				invalid_quantity: "Количество должно быть больше нуля.",
				currency_mismatch:
					"В заголовке и позициях счёта указаны разные валюты. Исправьте данные счёта перед разделением.",
				invalid_currency:
					"Валюта счёта некорректна. Исправьте данные счёта перед разделением.",
				invalid_money:
					"Одна из сумм счёта некорректна. Исправьте данные счёта перед разделением.",
				invalid_money_precision:
					"В одной из сумм счёта слишком много знаков после запятой. Исправьте данные перед разделением.",
				invalid_percentage: "Процент должен быть больше 0 и не больше 100.",
				invalid_percentage_precision:
					"Процент может содержать не более двух знаков после запятой.",
				percentage_exceeds_100:
					"Сумма распределённых процентов превышает 100%.",
				percentage_mode_conflict:
					"Выберите только один способ процентного разделения.",
				irreconcilable_headers:
					"Сумма без НДС и НДС не совпадают с итоговой суммой. Исправьте итоги счёта перед разделением.",
				monetary_basis_required:
					"Для частичного разделения недостаточно данных о сумме позиции.",
				default:
					"Завершите корректное распределение позиций, чтобы продолжить.",
			},
		};
	}
	return {
		action: "Split invoice",
		title: "Split line items across projects",
		description:
			"Create separate invoices for the selected projects. The source invoice will be archived.",
		destinations: "Destination projects",
		destination: "Project",
		addDestination: "Add project",
		removeDestination: "Remove project",
		chooseProject: "Choose a project",
		remainingProject: "Remainder project",
		remainingProjectHelp:
			"This invoice is currently unassigned. Choose where unallocated lines should remain.",
		allocations: "Line allocation",
		splitMethod: "Split method",
		quantityMethod: "Quantity",
		itemPercentageMethod: "Line item %",
		invoicePercentageMethod: "Whole invoice %",
		percentageFor: "Percentage for",
		percentage: "Percentage",
		equalSplit: "Split evenly",
		remainingPercentage: "Original project keeps",
		sourceQuantity: "Source quantity",
		manualSourceQuantity: "Enter source quantity",
		manualSourceHelp:
			"A concrete source quantity is required for a partial split.",
		wholeRow: "Whole line",
		wholeRowTo: "Whole line to",
		quantityFor: "Quantity for",
		preview: "Result preview",
		allocated: "Allocated",
		residual: "Remainder",
		lines: "lines",
		subtotal: "Subtotal",
		adjustment: "Reconciliation",
		vat: "VAT",
		total: "Total",
		reconciliation: "Control total",
		sourceInvoice: "Source invoice",
		generatedInvoices: "Generated invoices",
		balanced: "Balanced",
		cancel: "Cancel",
		confirm: "Confirm split",
		confirming: "Splitting…",
		unavailable:
			"An invoice can be split only after processing, before payment, and before an approval decision.",
		conflict:
			"The invoice changed while this workspace was open. Data was refreshed; open the split again.",
		failed: "Could not split the invoice. Check the allocation and try again.",
		errors: {
			access_denied: "You no longer have access to this invoice.",
			approval_decided:
				"This invoice already has a recorded approval decision and cannot be split.",
			extraction_incomplete: "Wait for invoice processing to finish.",
			invalid_input: "The split input is invalid.",
			invalid_state: "The invoice's current state does not allow splitting.",
			non_leaf:
				"This invoice has already been split. Refresh the invoice list.",
			paid: "A paid invoice cannot be split.",
			processing: "Wait for invoice processing to finish.",
			project_unavailable:
				"One of the selected projects is no longer available.",
			destination_required: "Choose at least one destination project.",
			duplicate_destination: "Choose each destination project only once.",
			destination_has_no_allocation:
				"Allocate at least one line or quantity to every destination project.",
			residual_project_required: "Choose a project for the remainder.",
			residual_matches_destination:
				"The remainder project cannot also be a destination project.",
			full_split_requires_multiple_projects:
				"Without a remainder, split the invoice across at least two projects.",
			source_quantity_required:
				"Enter the source quantity for the partially split line.",
			allocation_exceeds_quantity:
				"The allocated quantity exceeds the source quantity.",
			invalid_quantity: "Quantities must be greater than zero.",
			currency_mismatch:
				"The invoice header and lines use different currencies. Correct the invoice data before splitting.",
			invalid_currency:
				"The invoice currency is invalid. Correct the invoice data before splitting.",
			invalid_money:
				"An invoice amount is invalid. Correct the invoice data before splitting.",
			invalid_money_precision:
				"An invoice amount has too many decimal places. Correct the invoice data before splitting.",
			invalid_percentage:
				"A percentage must be greater than 0 and no more than 100.",
			invalid_percentage_precision:
				"A percentage can have at most two decimal places.",
			percentage_exceeds_100: "The allocated percentages exceed 100%.",
			percentage_mode_conflict: "Choose only one percentage split method.",
			irreconcilable_headers:
				"The subtotal plus VAT does not match the invoice total. Correct the invoice totals before splitting.",
			monetary_basis_required:
				"This line does not have enough monetary data for a partial split.",
			default: "Complete a valid line allocation to continue.",
		},
	};
}

function canSplitInvoice(invoice: TgemDashboardInvoice) {
	return (
		(invoice.status === "needs_review" || invoice.status === "in_approval") &&
		invoice.ocrStatus === "complete" &&
		invoice.extractionStatus === "complete" &&
		invoice.paymentStatus === "unpaid" &&
		invoice.lines.length > 0 &&
		!invoice.approvalSteps.some(
			(step) =>
				step.decidedAt !== null || COMPLETED_STEP_STATUSES.has(step.status),
		)
	);
}

function formatMoney(
	value: string | null,
	currency: string | null,
	language?: string | null,
) {
	if (value === null) return "—";
	const number = Number(value);
	if (!Number.isFinite(number)) return value;
	return new Intl.NumberFormat(
		language === "ru" ? "ru-RU" : language === "en" ? "en-GB" : "lv-LV",
		currency
			? { style: "currency", currency }
			: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
	).format(number);
}

function initialLineDrafts(invoice: TgemDashboardInvoice) {
	return Object.fromEntries(
		invoice.lines.map((line) => [
			line.id,
			{
				correctedSourceQuantity: "",
				wholeProjectId: null,
				allocations: {},
			} satisfies LineDraft,
		]),
	);
}

function normalizeQuantityInput(value: string) {
	return value.trim().replace(/\s/g, "").replace(",", ".");
}

function getErrorCode(error: unknown) {
	if (error instanceof TgemInvoiceSplitCalculationError) return error.code;
	if (error && typeof error === "object" && "code" in error) {
		return typeof error.code === "string" ? error.code : null;
	}
	if (error instanceof Error && /^[a-z_]+$/.test(error.message)) {
		return error.message;
	}
	return null;
}

function buildLineRequests(
	invoice: TgemDashboardInvoice,
	drafts: Record<string, LineDraft>,
	mode: SplitMode,
): TgemInvoiceSplitLineRequest[] {
	if (mode === "invoicePercentage") return [];
	const requests: TgemInvoiceSplitLineRequest[] = [];
	for (const line of invoice.lines) {
		const draft = drafts[line.id];
		if (!draft) continue;
		if (draft.wholeProjectId) {
			requests.push({
				lineId: line.id,
				wholeProjectId: draft.wholeProjectId,
			});
			continue;
		}
		const normalizedAllocations = Object.entries(draft.allocations).flatMap(
			([projectId, value]) => {
				const normalized = normalizeQuantityInput(value);
				return normalized ? [{ projectId, value: normalized }] : [];
			},
		);
		if (normalizedAllocations.length === 0) continue;
		const request: TgemInvoiceSplitLineRequest = {
			lineId: line.id,
			...(mode === "quantity" &&
			line.quantity === null &&
			normalizeQuantityInput(draft.correctedSourceQuantity)
				? {
						correctedSourceQuantity: normalizeQuantityInput(
							draft.correctedSourceQuantity,
						),
					}
				: {}),
		};
		if (mode === "itemPercentage") {
			request.percentageAllocations = normalizedAllocations.map(
				({ projectId, value }) => ({ projectId, percentage: value }),
			);
		} else {
			request.allocations = normalizedAllocations.map(
				({ projectId, value }) => ({ projectId, quantity: value }),
			);
		}
		requests.push(request);
	}
	return requests;
}

function calculationErrorCopy(
	code: TgemInvoiceSplitCalculationErrorCode | string | null,
	copy: ReturnType<typeof getCopy>,
) {
	if (code && code in copy.errors) {
		return copy.errors[code as keyof typeof copy.errors];
	}
	return copy.errors.default;
}

export function TgemInvoiceSplitWorkspace({
	invoice,
	projects,
	organizationLanguage,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	projects: TgemDashboardData["projects"];
	organizationLanguage?: string | null;
	onChanged: () => Promise<void>;
}) {
	const copy = getCopy(organizationLanguage);
	const hasUsableProjects = invoice.project
		? projects.some((project) => project.id !== invoice.project?.id)
		: projects.length >= 2;
	const available = canSplitInvoice(invoice) && hasUsableProjects;
	const initialDestination =
		projects.find((project) => project.id !== invoice.project?.id)?.id ??
		projects[0]?.id ??
		"";
	const [open, setOpen] = React.useState(false);
	const [destinationProjectIds, setDestinationProjectIds] = React.useState([
		initialDestination,
	]);
	const [splitMode, setSplitMode] = React.useState<SplitMode>("quantity");
	const [invoicePercentages, setInvoicePercentages] = React.useState<
		Record<string, string>
	>({});
	const [residualProjectId, setResidualProjectId] = React.useState("");
	const [lineDrafts, setLineDrafts] = React.useState<Record<string, LineDraft>>(
		() => initialLineDrafts(invoice),
	);
	const [pending, setPending] = React.useState(false);
	const [submitError, setSubmitError] = React.useState<string | null>(null);

	const reset = React.useCallback(() => {
		setDestinationProjectIds([initialDestination]);
		setSplitMode("quantity");
		setInvoicePercentages({});
		setResidualProjectId("");
		setLineDrafts(initialLineDrafts(invoice));
		setPending(false);
		setSubmitError(null);
	}, [initialDestination, invoice]);

	const projectById = React.useMemo(
		() => new Map(projects.map((project) => [project.id, project])),
		[projects],
	);
	const lineById = React.useMemo(
		() => new Map(invoice.lines.map((line) => [line.id, line])),
		[invoice.lines],
	);
	const lineRequests = React.useMemo(
		() => buildLineRequests(invoice, lineDrafts, splitMode),
		[invoice, lineDrafts, splitMode],
	);
	const invoicePercentageAllocations = React.useMemo(
		() =>
			destinationProjectIds.flatMap((projectId) => {
				const percentage = normalizeQuantityInput(
					invoicePercentages[projectId] ?? "",
				);
				return percentage ? [{ projectId, percentage }] : [];
			}),
		[destinationProjectIds, invoicePercentages],
	);
	const preview = React.useMemo<PreviewState>(() => {
		if (
			destinationProjectIds.length === 0 ||
			destinationProjectIds.some((projectId) => !projectId)
		) {
			return { result: null, error: copy.errors.destination_required };
		}
		const effectiveResidualProjectId = invoice.project
			? destinationProjectIds.includes(invoice.project.id)
				? null
				: invoice.project.id
			: residualProjectId || null;
		try {
			return {
				result: calculateTgemInvoiceSplit({
					currency: invoice.currency,
					subtotal: invoice.subtotal,
					vat: invoice.vat,
					total: invoice.total,
					destinationProjectIds,
					residualProjectId: effectiveResidualProjectId,
					lines: invoice.lines.map((line) => ({
						id: line.id,
						lineNumber: line.lineNumber,
						description: line.description,
						quantity: line.quantity,
						unit: line.unit,
						unitPrice: line.unitPrice,
						total: line.total,
						currency: line.currency,
						costCode: line.costCode,
						category: line.category,
						suggestedProjectId: null,
						suggestedCostCode: line.suggestedCostCode,
						suggestedCategory: line.suggestedCategory,
						aiConfidence: line.aiConfidence,
						sourceText: null,
					})),
					lineRequests,
					...(splitMode === "invoicePercentage"
						? { invoicePercentageAllocations }
						: {}),
				}),
				error: null,
			};
		} catch (error) {
			return {
				result: null,
				error: calculationErrorCopy(getErrorCode(error), copy),
			};
		}
	}, [
		copy,
		destinationProjectIds,
		invoice,
		invoicePercentageAllocations,
		lineRequests,
		residualProjectId,
		splitMode,
	]);

	function changeDestination(index: number, projectId: string) {
		const previousProjectId = destinationProjectIds[index];
		setDestinationProjectIds((current) =>
			current.map((value, currentIndex) =>
				currentIndex === index ? projectId : value,
			),
		);
		setLineDrafts((current) =>
			Object.fromEntries(
				Object.entries(current).map(([lineId, draft]) => {
					const allocations = { ...draft.allocations };
					delete allocations[previousProjectId];
					return [
						lineId,
						{
							...draft,
							wholeProjectId:
								draft.wholeProjectId === previousProjectId
									? null
									: draft.wholeProjectId,
							allocations,
						},
					];
				}),
			),
		);
		setInvoicePercentages((current) => {
			const next = { ...current };
			delete next[previousProjectId];
			return next;
		});
		if (residualProjectId === projectId) setResidualProjectId("");
		setSubmitError(null);
	}

	function addDestination() {
		const project =
			projects.find(
				(candidate) =>
					candidate.id !== invoice.project?.id &&
					!destinationProjectIds.includes(candidate.id),
			) ??
			projects.find(
				(candidate) => !destinationProjectIds.includes(candidate.id),
			);
		if (!project) return;
		setDestinationProjectIds((current) => [...current, project.id]);
		if (residualProjectId === project.id) setResidualProjectId("");
		setSubmitError(null);
	}

	function removeDestination(index: number) {
		const projectId = destinationProjectIds[index];
		setDestinationProjectIds((current) =>
			current.filter((_, currentIndex) => currentIndex !== index),
		);
		setLineDrafts((current) =>
			Object.fromEntries(
				Object.entries(current).map(([lineId, draft]) => {
					const allocations = { ...draft.allocations };
					delete allocations[projectId];
					return [
						lineId,
						{
							...draft,
							wholeProjectId:
								draft.wholeProjectId === projectId
									? null
									: draft.wholeProjectId,
							allocations,
						},
					];
				}),
			),
		);
		setInvoicePercentages((current) => {
			const next = { ...current };
			delete next[projectId];
			return next;
		});
		setSubmitError(null);
	}

	function setAllocation(lineId: string, projectId: string, value: string) {
		setLineDrafts((current) => ({
			...current,
			[lineId]: {
				...current[lineId],
				wholeProjectId: null,
				allocations: {
					...current[lineId].allocations,
					[projectId]: value,
				},
			},
		}));
		setSubmitError(null);
	}

	function changeSplitMode(mode: SplitMode) {
		setSplitMode(mode);
		setLineDrafts(initialLineDrafts(invoice));
		setInvoicePercentages({});
		setSubmitError(null);
	}

	function splitInvoiceEvenly() {
		const hasResidualProject = invoice.project
			? !destinationProjectIds.includes(invoice.project.id)
			: Boolean(residualProjectId);
		const partCount =
			destinationProjectIds.length + (hasResidualProject ? 1 : 0);
		if (partCount === 0) return;
		const baseHundredths = Math.floor(10000 / partCount);
		setInvoicePercentages(
			Object.fromEntries(
				destinationProjectIds.map((projectId) => [
					projectId,
					(baseHundredths / 100).toFixed(2),
				]),
			),
		);
		setSubmitError(null);
	}

	const remainingInvoicePercentage = React.useMemo(() => {
		const allocated = invoicePercentageAllocations.reduce(
			(total, allocation) => total + Number(allocation.percentage),
			0,
		);
		return Number.isFinite(allocated) ? Math.max(0, 100 - allocated) : 0;
	}, [invoicePercentageAllocations]);

	function toggleWholeLine(lineId: string, projectId: string) {
		setLineDrafts((current) => {
			const selected = current[lineId].wholeProjectId === projectId;
			return {
				...current,
				[lineId]: {
					...current[lineId],
					wholeProjectId: selected ? null : projectId,
					allocations: selected ? current[lineId].allocations : {},
				},
			};
		});
		setSubmitError(null);
	}

	async function confirmSplit() {
		if (!preview.result || pending) return;
		setPending(true);
		setSubmitError(null);
		try {
			const response = await submitTgemInvoiceSplit({
				invoiceCaseId: invoice.id,
				expectedUpdatedAt: invoice.updatedAt,
				destinationProjectIds,
				residualProjectId: invoice.project ? null : residualProjectId || null,
				lineRequests,
				...(splitMode === "invoicePercentage"
					? { invoicePercentageAllocations }
					: {}),
			});
			if (!response.ok) {
				if (response.error === "conflict") {
					setSubmitError(copy.conflict);
					try {
						await onChanged();
					} catch {}
				} else {
					setSubmitError(calculationErrorCopy(response.error, copy));
				}
				return;
			}
			setOpen(false);
			await onChanged();
		} catch {
			setSubmitError(copy.failed);
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (pending) return;
				setOpen(nextOpen);
				if (nextOpen) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!available}
					title={available ? undefined : copy.unavailable}
					className="border-tgem-primary/30 bg-tgem-primary/10 text-tgem-primary shadow-xs hover:border-tgem-primary/45 hover:bg-tgem-primary/15 hover:text-tgem-primary"
				>
					<Scissors />
					{copy.action}
				</Button>
			</DialogTrigger>
			<DialogContent
				showCloseButton={!pending}
				className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(94vw,76rem)]"
			>
				<DialogHeader className="border-b bg-slate-50 px-5 py-4 pr-12 dark:bg-slate-950/40">
					<DialogTitle className="flex items-center gap-2 text-left">
						<span className="flex h-8 w-8 items-center justify-center rounded-md bg-tgem-primary text-white shadow-sm">
							<Scissors className="h-4 w-4" />
						</span>
						{copy.title}
					</DialogTitle>
					<DialogDescription className="text-left">
						{copy.description}
					</DialogDescription>
				</DialogHeader>

				<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)] xl:p-5">
					<div className="min-w-0 space-y-4">
						<section className="rounded-lg border bg-background p-4">
							<div className="mb-3 flex items-center justify-between gap-3">
								<h3 className="flex items-center gap-2 text-sm font-semibold">
									<GitBranch className="h-4 w-4 text-tgem-primary" />
									{copy.destinations}
								</h3>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={
										pending || destinationProjectIds.length >= projects.length
									}
									onClick={addDestination}
								>
									<Plus />
									{copy.addDestination}
								</Button>
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								{destinationProjectIds.map((projectId, index) => (
									<div
										key={projectId || `destination-${invoice.id}`}
										className="flex items-center gap-2"
									>
										<label className="min-w-0 flex-1">
											<span className="sr-only">
												{copy.destination} {index + 1}
											</span>
											<select
												aria-label={`${copy.destination} ${index + 1}`}
												value={projectId}
												disabled={pending}
												onChange={(event) =>
													changeDestination(index, event.target.value)
												}
												className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-tgem-primary focus-visible:ring-3 focus-visible:ring-tgem-primary/40"
											>
												<option value="">{copy.chooseProject}</option>
												{projects.map((project) => (
													<option
														key={project.id}
														value={project.id}
														disabled={destinationProjectIds.some(
															(value, currentIndex) =>
																currentIndex !== index && value === project.id,
														)}
													>
														{project.name}
													</option>
												))}
											</select>
										</label>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											disabled={pending || destinationProjectIds.length === 1}
											aria-label={`${copy.removeDestination} ${index + 1}`}
											onClick={() => removeDestination(index)}
											className="text-muted-foreground hover:text-red-700"
										>
											<Trash2 />
										</Button>
									</div>
								))}
							</div>
							{invoice.project === null ? (
								<div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
									<label className="text-xs font-semibold text-amber-950 dark:text-amber-100">
										{copy.remainingProject}
										<select
											aria-label={copy.remainingProject}
											value={residualProjectId}
											disabled={pending}
											onChange={(event) => {
												setResidualProjectId(event.target.value);
												setSubmitError(null);
											}}
											className="mt-2 h-9 w-full rounded-md border border-amber-300 bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-amber-400/40"
										>
											<option value="">{copy.chooseProject}</option>
											{projects.map((project) => (
												<option
													key={project.id}
													value={project.id}
													disabled={destinationProjectIds.includes(project.id)}
												>
													{project.name}
												</option>
											))}
										</select>
									</label>
									<p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
										{copy.remainingProjectHelp}
									</p>
								</div>
							) : null}
						</section>

						<section className="rounded-lg border bg-background p-4">
							<h3 className="text-sm font-semibold">{copy.splitMethod}</h3>
							<div className="mt-3 grid gap-2 sm:grid-cols-3">
								{(
									[
										["quantity", copy.quantityMethod],
										["itemPercentage", copy.itemPercentageMethod],
										["invoicePercentage", copy.invoicePercentageMethod],
									] as const
								).map(([mode, label]) => (
									<button
										key={mode}
										type="button"
										disabled={pending}
										aria-pressed={splitMode === mode}
										onClick={() => changeSplitMode(mode)}
										className={`h-9 rounded-md border px-3 text-sm font-medium transition ${splitMode === mode ? "border-tgem-primary bg-tgem-primary text-white" : "border-input bg-background hover:bg-muted"}`}
									>
										{label}
									</button>
								))}
							</div>

							{splitMode === "invoicePercentage" ? (
								<div className="mt-4 rounded-md border bg-slate-50/70 p-3 dark:bg-slate-950/30">
									<div className="mb-3 flex items-center justify-between gap-3">
										<span className="text-xs font-semibold text-muted-foreground">
											{copy.invoicePercentageMethod}
										</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={pending}
											onClick={splitInvoiceEvenly}
										>
											{copy.equalSplit}
										</Button>
									</div>
									<div className="grid gap-3 sm:grid-cols-2">
										{destinationProjectIds.map((projectId, index) => {
											const projectName =
												projectById.get(projectId)?.name ||
												`${copy.destination} ${index + 1}`;
											return (
												<div key={projectId} className="text-xs font-medium">
													<span>{projectName}</span>
													<div className="relative mt-1.5">
														<Input
															value={invoicePercentages[projectId] ?? ""}
															disabled={pending}
															inputMode="decimal"
															aria-label={`${copy.percentageFor} ${projectName}`}
															placeholder="0.00"
															onChange={(event) => {
																setInvoicePercentages((current) => ({
																	...current,
																	[projectId]: event.target.value,
																}));
																setSubmitError(null);
															}}
															className="pr-8"
														/>
														<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
															%
														</span>
													</div>
												</div>
											);
										})}
									</div>
									{(invoice.project &&
										!destinationProjectIds.includes(invoice.project.id)) ||
									(!invoice.project && residualProjectId) ? (
										<div className="mt-3 text-xs font-medium text-muted-foreground">
											{copy.remainingPercentage}:{" "}
											{remainingInvoicePercentage.toFixed(2)}%
										</div>
									) : null}
								</div>
							) : null}
						</section>

						{splitMode !== "invoicePercentage" ? (
							<section className="overflow-hidden rounded-lg border bg-background">
								<div className="border-b px-4 py-3">
									<h3 className="text-sm font-semibold">{copy.allocations}</h3>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full min-w-[46rem] text-sm">
										<thead className="bg-slate-50 text-left text-xs text-muted-foreground dark:bg-slate-950/40">
											<tr>
												<th className="min-w-56 px-4 py-3 font-medium">
													{copy.allocations}
												</th>
												<th className="w-40 px-3 py-3 font-medium">
													{copy.sourceQuantity}
												</th>
												{destinationProjectIds.map((projectId) => (
													<th
														key={projectId || `destination-${invoice.id}`}
														className="min-w-48 px-3 py-3 font-medium text-tgem-primary"
													>
														{projectById.get(projectId)?.name ||
															copy.chooseProject}
													</th>
												))}
											</tr>
										</thead>
										<tbody className="divide-y">
											{invoice.lines.map((line) => {
												const draft = lineDrafts[line.id];
												return (
													<tr key={line.id} className="align-top">
														<td className="px-4 py-3">
															<div className="font-medium">
																{line.description || `#${line.lineNumber}`}
															</div>
															<div className="mt-1 text-xs text-muted-foreground">
																{formatMoney(
																	line.total,
																	line.currency || invoice.currency,
																	organizationLanguage,
																)}
															</div>
														</td>
														<td className="px-3 py-3">
															{line.quantity !== null ? (
																<div className="rounded-md border bg-slate-50 px-3 py-2 font-semibold tabular-nums dark:bg-slate-950/40">
																	{line.quantity} {line.unit || ""}
																</div>
															) : (
																<div className="rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/60 dark:bg-amber-950/30">
																	<Input
																		value={draft.correctedSourceQuantity}
																		disabled={
																			pending || Boolean(draft.wholeProjectId)
																		}
																		inputMode="decimal"
																		aria-label={`${copy.manualSourceQuantity}: ${line.description || line.lineNumber}`}
																		placeholder={copy.manualSourceQuantity}
																		onChange={(event) => {
																			setLineDrafts((current) => ({
																				...current,
																				[line.id]: {
																					...current[line.id],
																					correctedSourceQuantity:
																						event.target.value,
																				},
																			}));
																			setSubmitError(null);
																		}}
																	/>
																	<p className="mt-1.5 text-[11px] leading-4 text-amber-800 dark:text-amber-200">
																		{copy.manualSourceHelp}
																	</p>
																</div>
															)}
														</td>
														{destinationProjectIds.map((projectId, index) => {
															const projectName =
																projectById.get(projectId)?.name ||
																`${copy.destination} ${index + 1}`;
															const whole = draft.wholeProjectId === projectId;
															return (
																<td
																	key={projectId || `destination-${invoice.id}`}
																	className="px-3 py-3"
																>
																	<Input
																		value={draft.allocations[projectId] ?? ""}
																		disabled={
																			pending || Boolean(draft.wholeProjectId)
																		}
																		inputMode="decimal"
																		aria-label={`${splitMode === "itemPercentage" ? copy.percentageFor : copy.quantityFor} ${projectName}: ${line.description || line.lineNumber}`}
																		placeholder="0"
																		onChange={(event) =>
																			setAllocation(
																				line.id,
																				projectId,
																				event.target.value,
																			)
																		}
																	/>
																	{splitMode === "itemPercentage" ? (
																		<div className="mt-1 text-right text-xs text-muted-foreground">
																			%
																		</div>
																	) : null}
																	<button
																		type="button"
																		disabled={pending}
																		aria-pressed={whole}
																		aria-label={`${copy.wholeRowTo} ${projectName}: ${line.description || line.lineNumber}`}
																		onClick={() =>
																			toggleWholeLine(line.id, projectId)
																		}
																		className={`mt-2 inline-flex h-7 w-full items-center justify-center rounded-md border px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/40 disabled:opacity-50 ${whole ? "border-tgem-primary bg-tgem-primary text-white" : "border-tgem-primary/25 bg-tgem-primary/10 text-tgem-primary hover:bg-tgem-primary/15"}`}
																	>
																		{copy.wholeRow}
																	</button>
																</td>
															);
														})}
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</section>
						) : null}
					</div>

					<aside className="min-w-0 xl:sticky xl:top-0 xl:self-start">
						<div className="overflow-hidden rounded-lg border bg-background shadow-sm">
							<div className="border-b bg-slate-50 px-4 py-3 dark:bg-slate-950/40">
								<h3 className="text-sm font-semibold">{copy.preview}</h3>
							</div>
							{preview.result ? (
								<div className="space-y-3 p-4">
									{preview.result.cases.map((resultCase) => (
										<div
											key={`${resultCase.kind}-${resultCase.projectId}`}
											className="rounded-md border p-3"
										>
											<div className="flex items-start justify-between gap-2">
												<div>
													<div className="font-semibold">
														{projectById.get(resultCase.projectId)?.name ||
															resultCase.projectId}
													</div>
													<div className="mt-0.5 text-xs text-muted-foreground">
														{resultCase.lines.length} {copy.lines}
													</div>
												</div>
												<Badge
													variant="outline"
													className={
														resultCase.kind === "residual"
															? "border-amber-200 bg-amber-50 text-amber-800"
															: "border-tgem-primary/25 bg-tgem-primary/10 text-tgem-primary"
													}
												>
													{resultCase.kind === "residual"
														? copy.residual
														: copy.allocated}
												</Badge>
											</div>
											<div className="mt-3 divide-y rounded-md border bg-slate-50/70 px-2 dark:bg-slate-950/30">
												{resultCase.lines.map((line) => {
													const sourceLine = lineById.get(line.sourceLineId);
													return (
														<div
															key={line.sourceLineId}
															className="flex items-start justify-between gap-3 py-2 text-xs"
														>
															<div className="min-w-0">
																<div className="truncate font-medium">
																	{line.description || `#${line.lineNumber}`}
																</div>
																<div className="mt-0.5 text-muted-foreground tabular-nums">
																	{line.quantity ?? "—"}{" "}
																	{sourceLine?.unit || ""}
																</div>
															</div>
															<span className="shrink-0 font-medium tabular-nums">
																{formatMoney(
																	line.total,
																	preview.result.currency,
																	organizationLanguage,
																)}
															</span>
														</div>
													);
												})}
											</div>
											<dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
												<dt className="text-muted-foreground">
													{copy.subtotal}
												</dt>
												<dd className="text-right font-medium tabular-nums">
													{formatMoney(
														resultCase.subtotal,
														preview.result.currency,
														organizationLanguage,
													)}
												</dd>
												{resultCase.subtotalAdjustment &&
												resultCase.subtotalAdjustment !== "0.00" ? (
													<>
														<dt className="text-muted-foreground">
															{copy.adjustment}
														</dt>
														<dd className="text-right font-medium tabular-nums">
															{formatMoney(
																resultCase.subtotalAdjustment,
																preview.result.currency,
																organizationLanguage,
															)}
														</dd>
													</>
												) : null}
												<dt className="text-muted-foreground">{copy.vat}</dt>
												<dd className="text-right font-medium tabular-nums">
													{formatMoney(
														resultCase.vat,
														preview.result.currency,
														organizationLanguage,
													)}
												</dd>
												<dt className="font-semibold">{copy.total}</dt>
												<dd className="text-right font-semibold tabular-nums">
													{formatMoney(
														resultCase.total,
														preview.result.currency,
														organizationLanguage,
													)}
												</dd>
											</dl>
										</div>
									))}

									<div className="rounded-md border border-[#B8E0C6] bg-[#ECF8F0] p-3">
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-semibold text-[#126F38]">
												{copy.reconciliation}
											</span>
											<span className="inline-flex items-center gap-1 text-xs font-semibold text-[#126F38]">
												<CheckCircle2 className="h-3.5 w-3.5" />
												{copy.balanced}
											</span>
										</div>
										<div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
											<div>
												<div className="text-[11px] text-[#39734E]">
													{copy.sourceInvoice}
												</div>
												<div className="mt-0.5 font-semibold tabular-nums text-[#126F38]">
													{formatMoney(
														invoice.total,
														invoice.currency,
														organizationLanguage,
													)}
												</div>
											</div>
											<ArrowRight className="h-4 w-4 text-[#159447]" />
											<div>
												<div className="text-[11px] text-[#39734E]">
													{copy.generatedInvoices}
												</div>
												<div className="mt-0.5 font-semibold text-[#126F38]">
													{preview.result.cases.length}
												</div>
											</div>
										</div>
										<div className="mt-3 space-y-1.5 border-[#B8E0C6] border-t pt-3 text-xs">
											{invoice.lines.map((sourceLine) => {
												const correctedQuantity =
													preview.result.quantityCorrections.find(
														(correction) =>
															correction.sourceLineId === sourceLine.id,
													)?.correctedQuantity ?? null;
												const resultQuantities = preview.result.cases.flatMap(
													(resultCase) =>
														resultCase.lines
															.filter(
																(line) => line.sourceLineId === sourceLine.id,
															)
															.map((line) => line.quantity ?? copy.wholeRow),
												);
												return (
													<div
														key={sourceLine.id}
														className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
													>
														<span className="truncate text-[#39734E]">
															{sourceLine.description ||
																`#${sourceLine.lineNumber}`}
														</span>
														<span className="font-medium text-[#126F38] tabular-nums">
															{sourceLine.quantity ??
																correctedQuantity ??
																copy.wholeRow}
															{" → "}
															{resultQuantities.join(" + ")}
															{sourceLine.unit ? ` ${sourceLine.unit}` : ""}
														</span>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							) : (
								<div
									role="alert"
									className="m-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
								>
									<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
									<span>{preview.error}</span>
								</div>
							)}
						</div>
					</aside>
				</div>

				<div className="border-t bg-background px-4 py-3 sm:px-5">
					{submitError ? (
						<div
							role="alert"
							className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
						>
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							{submitError}
						</div>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={pending}
							onClick={() => setOpen(false)}
						>
							{copy.cancel}
						</Button>
						<Button
							type="button"
							disabled={!preview.result || pending}
							aria-busy={pending}
							onClick={() => void confirmSplit()}
							className="bg-tgem-primary text-white hover:bg-tgem-primary-hover"
						>
							{pending ? <Loader2 className="animate-spin" /> : <Scissors />}
							{pending ? copy.confirming : copy.confirm}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
