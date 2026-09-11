"use client";

import {
	CheckCircle2,
	CircleSlash2,
	Loader2,
	RotateCcw,
	Send,
	XCircle,
} from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	decideTgemInvoiceApproval,
	submitTgemInvoiceForApproval,
} from "@/server/actions/tgem-invoice-approval-actions";
import {
	getTgemApprovalRoleCopy,
	getTgemApprovalRoleTitle,
} from "./approval-role-copy";

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Apstiprināšana",
			send: "Nosūtīt apstiprināšanai",
			resend: "Iesniegt atkārtoti",
			approve: "Apstiprināt",
			changes: "Pieprasīt labojumus",
			reject: "Noraidīt",
			comment: "Komentārs",
			commentRequired: "Komentārs ir obligāts labojumiem un noraidīšanai.",
			configure: "Pirms iesniegšanas iestatiet apstiprināšanas secību.",
			waiting: "Gaida savu kārtu",
			statuses: {
				waiting: "gaida",
				current: "jāapstiprina tagad",
				approved: "apstiprināts",
				skipped: "nav nepieciešams",
				rejected: "noraidīts",
				changes_requested: "pieprasīti labojumi",
			},
			fromAmount: "Obligāts no",
		};
	}
	if (language === "ru") {
		return {
			title: "Согласование",
			send: "Отправить на согласование",
			resend: "Отправить повторно",
			approve: "Согласовать",
			changes: "Запросить исправления",
			reject: "Отклонить",
			comment: "Комментарий",
			commentRequired: "Для исправлений и отклонения требуется комментарий.",
			configure: "Настройте порядок согласования перед отправкой.",
			waiting: "Ожидает своей очереди",
			statuses: {
				waiting: "ожидает",
				current: "требует решения",
				approved: "согласовано",
				skipped: "не требуется",
				rejected: "отклонено",
				changes_requested: "запрошены исправления",
			},
			fromAmount: "Обязательно от",
		};
	}
	return {
		title: "Approval",
		send: "Send for approval",
		resend: "Resubmit for approval",
		approve: "Approve",
		changes: "Request changes",
		reject: "Reject",
		comment: "Comment",
		commentRequired: "A comment is required for changes and rejection.",
		configure: "Configure the approval sequence before submitting.",
		waiting: "Waiting for its turn",
		statuses: {
			waiting: "waiting",
			current: "decision required",
			approved: "approved",
			skipped: "not required",
			rejected: "rejected",
			changes_requested: "changes requested",
		},
		fromAmount: "Required from",
	};
}

export function TgemApprovalControls({
	invoice,
	currentUserId,
	hasTemplate,
	organizationLanguage,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	currentUserId: string;
	hasTemplate: boolean;
	organizationLanguage?: string | null;
	onChanged: () => Promise<void>;
}) {
	const copy = getCopy(organizationLanguage);
	const roleCopy = getTgemApprovalRoleCopy(organizationLanguage);
	const [comment, setComment] = React.useState("");
	const [pending, setPending] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const roundSteps = invoice.approvalSteps.filter(
		(step) => step.approvalRound === invoice.approvalRound,
	);
	const currentStep = roundSteps.find((step) => step.status === "current");
	const canDecide = currentStep?.approverUserId === currentUserId;
	const canSubmit = ["needs_review", "changes_requested"].includes(
		invoice.status,
	);

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

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{copy.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{roundSteps.length > 0 ? (
					<div className="space-y-2">
						{roundSteps.map((step) => (
							<div
								key={step.id}
								className={`flex items-center gap-3 rounded-md border p-3 text-sm ${step.status === "current" ? "border-blue-400 bg-blue-50" : "bg-background"}`}
							>
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
									{step.stepOrder}
								</div>
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium">
										{step.approverName ||
											getTgemApprovalRoleTitle(
												step.roleKey,
												step.role,
												organizationLanguage,
											)}
									</div>
									<div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
										<span>
											{getTgemApprovalRoleTitle(
												step.roleKey,
												step.role,
												organizationLanguage,
											)}
										</span>
										<span>·</span>
										<span>
											{copy.statuses[
												step.status as keyof typeof copy.statuses
											] ?? step.status.replaceAll("_", " ")}
										</span>
										{step.minimumInvoiceTotal ? (
											<span className="rounded bg-muted px-1.5 py-0.5">
												{copy.fromAmount} {step.minimumInvoiceTotal}{" "}
												{step.thresholdCurrency}
											</span>
										) : null}
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										{roleCopy[step.roleKey].description}
									</p>
								</div>
								{step.status === "approved" ? (
									<CheckCircle2 className="h-4 w-4 text-emerald-600" />
								) : null}
								{step.status === "skipped" ? (
									<CircleSlash2 className="h-4 w-4 text-slate-400" />
								) : null}
							</div>
						))}
					</div>
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
					<div className="space-y-3">
						<textarea
							aria-label={copy.comment}
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							placeholder={copy.comment}
							className="min-h-20 w-full resize-y rounded-md border p-3 text-sm"
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
								className="rounded-md border border-amber-400 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
							>
								{copy.changes}
							</button>
							<button
								type="button"
								onClick={() => void decide("reject")}
								disabled={pending !== null}
								className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
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
