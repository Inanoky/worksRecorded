"use client";

import {
	ArrowRight,
	Check,
	Clock3,
	Flag,
	Loader2,
	RotateCcw,
	Send,
	UserRoundCheck,
	XCircle,
} from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
	TgemDashboardApprovalSetup,
	TgemDashboardInvoice,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	decideTgemInvoiceApproval,
	submitTgemInvoiceForApproval,
} from "@/server/actions/tgem-invoice-approval-actions";
import { getTgemApprovalRoleTitle } from "./approval-role-copy";

type ApprovalStep = TgemDashboardInvoice["approvalSteps"][number];

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Apstiprināšanas ceļš",
			send: "Sākt apstiprināšanas ceļu",
			resend: "Sākt jaunu apstiprināšanas kārtu",
			approve: "Apstiprināt un nodot tālāk",
			changes: "Pieprasīt labojumus",
			reject: "Noraidīt",
			comment: "Komentārs",
			commentRequired: "Komentārs ir obligāts labojumiem un noraidīšanai.",
			configure: "Pirms iesniegšanas izveidojiet apstiprinātāju secību.",
			waiting: "Rēķins gaida pašreizējā apstiprinātāja lēmumu.",
			currentOwner: "Pašlaik pie",
			finalApprover: "Gala apstiprinātājs",
			pathToFinal: "Ceļš līdz gala apstiprinājumam",
			readyToStart: "Secība ir gatava sākšanai",
			flowComplete: "Apstiprināšana pabeigta",
			changesNeeded: "Pieprasīti labojumi",
			flowStopped: "Apstiprināšana apturēta",
			round: "Kārta",
			step: "Solis",
			of: "no",
			history: "Iepriekšējo kārtu vēsture",
			decided: "Lēmums",
			amountReference: "Summas atsauce",
			statuses: {
				configured: "sagatavots",
				waiting: "gaida savu kārtu",
				current: "jāapstiprina tagad",
				approved: "apstiprināts",
				skipped: "izlaists iepriekšējā kārtā",
				cancelled: "netika sasniegts",
				rejected: "noraidīts",
				changes_requested: "pieprasīti labojumi",
			},
		};
	}
	if (language === "ru") {
		return {
			title: "Маршрут согласования",
			send: "Начать согласование",
			resend: "Начать новый раунд согласования",
			approve: "Согласовать и передать дальше",
			changes: "Запросить исправления",
			reject: "Отклонить",
			comment: "Комментарий",
			commentRequired: "Для исправлений и отклонения требуется комментарий.",
			configure: "Настройте последовательность согласующих перед отправкой.",
			waiting: "Счет ожидает решения текущего согласующего.",
			currentOwner: "Сейчас у",
			finalApprover: "Финальный согласующий",
			pathToFinal: "Путь к финальному согласованию",
			readyToStart: "Последовательность готова к запуску",
			flowComplete: "Согласование завершено",
			changesNeeded: "Запрошены исправления",
			flowStopped: "Согласование остановлено",
			round: "Раунд",
			step: "Шаг",
			of: "из",
			history: "История предыдущих раундов",
			decided: "Решение",
			amountReference: "Сумма для справки",
			statuses: {
				configured: "настроено",
				waiting: "ожидает очереди",
				current: "требует решения",
				approved: "согласовано",
				skipped: "пропущено в прошлом раунде",
				cancelled: "шаг не был достигнут",
				rejected: "отклонено",
				changes_requested: "запрошены исправления",
			},
		};
	}
	return {
		title: "Approval path",
		send: "Start approval path",
		resend: "Start a new approval round",
		approve: "Approve and pass forward",
		changes: "Request changes",
		reject: "Reject",
		comment: "Comment",
		commentRequired: "A comment is required for changes and rejection.",
		configure: "Configure the approver sequence before submitting.",
		waiting: "The invoice is waiting for the current approver's decision.",
		currentOwner: "Currently with",
		finalApprover: "Final approver",
		pathToFinal: "Path to final approval",
		readyToStart: "Sequence ready to start",
		flowComplete: "Approval complete",
		changesNeeded: "Changes requested",
		flowStopped: "Approval stopped",
		round: "Round",
		step: "Step",
		of: "of",
		history: "Previous approval-round history",
		decided: "Decision",
		amountReference: "Amount reference",
		statuses: {
			configured: "configured",
			waiting: "waiting its turn",
			current: "decision required",
			approved: "approved",
			skipped: "skipped in a previous round",
			cancelled: "not reached",
			rejected: "rejected",
			changes_requested: "changes requested",
		},
	};
}

function formatDecisionDate(value: string | null, language?: string | null) {
	if (!value) return null;
	return new Intl.DateTimeFormat(
		language === "ru" ? "ru-RU" : language === "en" ? "en-GB" : "lv-LV",
		{
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		},
	).format(new Date(value));
}

function statusClasses(status: string) {
	if (status === "current") return "border-blue-200 bg-blue-50 text-blue-800";
	if (status === "approved")
		return "border-emerald-200 bg-emerald-50 text-emerald-800";
	if (status === "rejected") return "border-red-200 bg-red-50 text-red-800";
	if (status === "changes_requested")
		return "border-amber-200 bg-amber-50 text-amber-800";
	return "border-slate-200 bg-slate-50 text-slate-600";
}

function circleClasses(status: string) {
	if (status === "current") return "border-blue-600 bg-blue-600 text-white";
	if (status === "approved")
		return "border-emerald-600 bg-emerald-600 text-white";
	if (status === "rejected") return "border-red-600 bg-red-600 text-white";
	if (status === "changes_requested")
		return "border-amber-500 bg-amber-500 text-white";
	return "border-slate-300 bg-white text-slate-600";
}

export function TgemApprovalControls({
	invoice,
	currentUserId,
	approvalSetup,
	organizationLanguage,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	currentUserId: string;
	approvalSetup: TgemDashboardApprovalSetup | null;
	organizationLanguage?: string | null;
	onChanged: () => Promise<void>;
}) {
	const copy = getCopy(organizationLanguage);
	const [comment, setComment] = React.useState("");
	const [pending, setPending] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const currentRoundSteps = invoice.approvalSteps.filter(
		(step) => step.approvalRound === invoice.approvalRound,
	);
	const userNames = new Map(
		(approvalSetup?.users ?? []).map((user) => [user.id, user.name]),
	);
	const configuredSteps: ApprovalStep[] =
		approvalSetup?.template?.steps.map((step) => ({
			id: step.id,
			stepOrder: step.stepOrder,
			approvalRound: 0,
			roleKey: step.roleKey,
			role: step.role,
			approverUserId: step.approverUserId,
			approverName: userNames.get(step.approverUserId) ?? null,
			templateRevision: approvalSetup?.template?.revision ?? null,
			minimumInvoiceTotal: step.minimumInvoiceTotal,
			thresholdCurrency: step.minimumInvoiceTotal
				? (approvalSetup?.template?.currency ?? null)
				: null,
			status: "configured",
			comment: null,
			decidedAt: null,
		})) ?? [];
	const routeSteps =
		currentRoundSteps.length > 0 ? currentRoundSteps : configuredSteps;
	const activeRouteSteps = routeSteps.filter(
		(step) => step.status !== "skipped",
	);
	const currentStep = activeRouteSteps.find(
		(step) => step.status === "current",
	);
	const currentStepIndex = activeRouteSteps.findIndex(
		(step) => step.status === "current",
	);
	const finalStep = activeRouteSteps.at(-1);
	const remainingSteps = currentStep
		? activeRouteSteps.slice(currentStepIndex)
		: ["approved", "rejected", "changes_requested"].includes(invoice.status)
			? []
			: activeRouteSteps;
	const previousRoundNumbers = Array.from(
		new Set(
			invoice.approvalSteps
				.filter((step) => step.approvalRound < invoice.approvalRound)
				.map((step) => step.approvalRound),
		),
	).sort((a, b) => b - a);
	const canDecide = currentStep?.approverUserId === currentUserId;
	const canSubmit = ["needs_review", "changes_requested"].includes(
		invoice.status,
	);
	const hasTemplate = Boolean(approvalSetup?.template?.steps.length);

	async function submit() {
		setPending("submit");
		setError(null);
		try {
			await submitTgemInvoiceForApproval({ invoiceCaseId: invoice.id });
			await onChanged();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Could not submit invoice",
			);
		} finally {
			setPending(null);
		}
	}

	async function decide(decision: "approve" | "request_changes" | "reject") {
		setPending(decision);
		setError(null);
		try {
			await decideTgemInvoiceApproval({
				invoiceCaseId: invoice.id,
				decision,
				comment,
			});
			setComment("");
			await onChanged();
		} catch (decisionError) {
			setError(
				decisionError instanceof Error
					? decisionError.message
					: "Could not save approval decision",
			);
		} finally {
			setPending(null);
		}
	}

	function approverName(step: ApprovalStep) {
		return (
			step.approverName ||
			getTgemApprovalRoleTitle(step.roleKey, step.role, organizationLanguage)
		);
	}

	function summaryTitle() {
		if (currentStep) return copy.currentOwner;
		if (invoice.status === "approved") return copy.flowComplete;
		if (invoice.status === "changes_requested") return copy.changesNeeded;
		if (invoice.status === "rejected") return copy.flowStopped;
		return copy.readyToStart;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle className="flex items-center gap-2 text-base">
						<UserRoundCheck className="h-4 w-4 text-blue-700" />
						{copy.title}
					</CardTitle>
					{invoice.approvalRound > 0 ? (
						<span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium">
							{copy.round} {invoice.approvalRound}
						</span>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{routeSteps.length > 0 ? (
					<>
						<div
							data-testid="tgem-approval-route-summary"
							className="rounded-lg border border-blue-200 bg-blue-50/60 p-3"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
										{summaryTitle()}
									</div>
									<div className="mt-1 font-semibold text-slate-950">
										{currentStep
											? approverName(currentStep)
											: invoice.status === "approved"
												? approverName(finalStep ?? routeSteps[0])
												: copy.readyToStart}
									</div>
									{currentStep ? (
										<div className="mt-1 text-xs text-slate-600">
											{copy.step} {currentStepIndex + 1} {copy.of}{" "}
											{activeRouteSteps.length}
										</div>
									) : null}
								</div>
								{finalStep ? (
									<div className="min-w-0 rounded-md border border-blue-100 bg-white/80 px-3 py-2 text-right">
										<div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
											<Flag className="h-3 w-3" />
											{copy.finalApprover}
										</div>
										<div className="mt-0.5 truncate text-sm font-semibold">
											{approverName(finalStep)}
										</div>
									</div>
								) : null}
							</div>
							{remainingSteps.length > 0 ? (
								<div className="mt-3 border-t border-blue-100 pt-3">
									<div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
										{copy.pathToFinal}
									</div>
									<div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-700">
										{remainingSteps.map((step, index) => (
											<React.Fragment key={step.id}>
												{index > 0 ? (
													<ArrowRight className="h-3.5 w-3.5 text-slate-400" />
												) : null}
												<span>{approverName(step)}</span>
											</React.Fragment>
										))}
									</div>
								</div>
							) : null}
						</div>

						<ol className="space-y-0" aria-label={copy.title}>
							{routeSteps.map((step, index) => {
								const decisionDate = formatDecisionDate(
									step.decidedAt,
									organizationLanguage,
								);
								return (
									<li
										key={step.id}
										className="relative flex gap-3 pb-4 last:pb-0"
									>
										{index < routeSteps.length - 1 ? (
											<div className="absolute bottom-0 left-[0.95rem] top-8 w-px bg-slate-200" />
										) : null}
										<div
											className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${circleClasses(step.status)}`}
										>
											{step.status === "approved" ? (
												<Check className="h-4 w-4" />
											) : (
												step.stepOrder
											)}
										</div>
										<div
											className={`min-w-0 flex-1 rounded-lg border p-3 ${step.status === "current" ? "border-blue-300 bg-blue-50/40 shadow-sm" : "bg-background"}`}
										>
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div className="min-w-0">
													<div className="truncate text-sm font-semibold">
														{approverName(step)}
													</div>
													<div className="mt-0.5 text-xs text-muted-foreground">
														{copy.step} {step.stepOrder} ·{" "}
														{getTgemApprovalRoleTitle(
															step.roleKey,
															step.role,
															organizationLanguage,
														)}
													</div>
												</div>
												<span
													className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClasses(step.status)}`}
												>
													{copy.statuses[
														step.status as keyof typeof copy.statuses
													] ?? step.status.replaceAll("_", " ")}
												</span>
											</div>
											{step.minimumInvoiceTotal ? (
												<div className="mt-2 text-xs text-muted-foreground">
													{copy.amountReference}: {step.minimumInvoiceTotal}{" "}
													{step.thresholdCurrency}
												</div>
											) : null}
											{decisionDate ? (
												<div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
													<Clock3 className="h-3.5 w-3.5" />
													{copy.decided}: {decisionDate}
												</div>
											) : null}
											{step.comment ? (
												<div className="mt-2 rounded-md bg-muted/60 px-2.5 py-2 text-xs">
													{step.comment}
												</div>
											) : null}
										</div>
									</li>
								);
							})}
						</ol>
					</>
				) : null}

				{previousRoundNumbers.length > 0 ? (
					<details className="rounded-lg border bg-muted/20 px-3 py-2">
						<summary className="cursor-pointer text-sm font-medium">
							{copy.history} ({previousRoundNumbers.length})
						</summary>
						<div className="mt-3 space-y-3 border-t pt-3">
							{previousRoundNumbers.map((round) => (
								<div key={round}>
									<div className="mb-2 text-xs font-semibold text-muted-foreground">
										{copy.round} {round}
									</div>
									<div className="space-y-1.5">
										{invoice.approvalSteps
											.filter((step) => step.approvalRound === round)
											.map((step) => (
												<div
													key={step.id}
													className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs"
												>
													<div>
														<div className="font-medium">
															{approverName(step)}
														</div>
														{step.comment ? (
															<div className="mt-1 text-muted-foreground">
																{step.comment}
															</div>
														) : null}
													</div>
													<span className="text-muted-foreground">
														{copy.statuses[
															step.status as keyof typeof copy.statuses
														] ?? step.status.replaceAll("_", " ")}
													</span>
												</div>
											))}
									</div>
								</div>
							))}
						</div>
					</details>
				) : null}

				{canSubmit ? (
					<div className="space-y-2">
						<button
							type="button"
							onClick={() => void submit()}
							disabled={!hasTemplate || pending !== null}
							className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
						>
							{pending === "submit" ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : invoice.status === "changes_requested" ? (
								<RotateCcw className="h-4 w-4" />
							) : (
								<Send className="h-4 w-4" />
							)}
							{invoice.status === "changes_requested" ? copy.resend : copy.send}
						</button>
						{!hasTemplate ? (
							<p className="text-xs text-amber-700">{copy.configure}</p>
						) : null}
					</div>
				) : null}

				{invoice.status === "in_approval" && canDecide ? (
					<div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/30 p-3">
						<textarea
							aria-label={copy.comment}
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							placeholder={copy.comment}
							className="min-h-20 w-full resize-y rounded-md border bg-background p-3 text-sm"
						/>
						<p className="text-xs text-muted-foreground">
							{copy.commentRequired}
						</p>
						<div className="grid gap-2 sm:grid-cols-3">
							<button
								type="button"
								onClick={() => void decide("approve")}
								disabled={pending !== null}
								className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
							>
								{copy.approve}
							</button>
							<button
								type="button"
								onClick={() => void decide("request_changes")}
								disabled={pending !== null}
								className="rounded-md border border-amber-400 bg-background px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
							>
								{copy.changes}
							</button>
							<button
								type="button"
								onClick={() => void decide("reject")}
								disabled={pending !== null}
								className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 bg-background px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
							>
								<XCircle className="h-4 w-4" />
								{copy.reject}
							</button>
						</div>
					</div>
				) : invoice.status === "in_approval" ? (
					<p className="text-sm text-muted-foreground">{copy.waiting}</p>
				) : null}
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
			</CardContent>
		</Card>
	);
}
