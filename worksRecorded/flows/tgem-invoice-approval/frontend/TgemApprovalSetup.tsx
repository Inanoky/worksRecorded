"use client";

import {
	ArrowDown,
	ArrowUp,
	Loader2,
	Plus,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	TGEM_APPROVAL_ROLE_KEYS,
	type TgemApprovalRoleKey,
} from "@/lib/tgem-invoice-approval/approval";
import type { TgemDashboardData } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	saveTgemApprovalTemplate,
	saveTgemWorkflowManagers,
} from "@/server/actions/tgem-invoice-approval-actions";
import { getTgemApprovalRoleCopy } from "./approval-role-copy";

type SetupStep = {
	id: string;
	approverUserId: string;
	roleKey: TgemApprovalRoleKey;
	roleLabel: string;
	minimumInvoiceTotal: string;
};

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Apstiprināšanas kontroles punkti",
			description:
				"Nosakiet atbildību, secību un summas sliekšņus šī projekta rēķiniem.",
			add: "Pievienot kontroles punktu",
			user: "Izvēlieties atbildīgo",
			role: "Atbildības veids",
			customLabel: "Pielāgots amata nosaukums (nav obligāts)",
			threshold: "No summas, EUR (nav obligāts)",
			thresholdHelp:
				"Atstājiet tukšu, lai pārbaude būtu obligāta visiem rēķiniem.",
			save: "Saglabāt apstiprināšanas plūsmu",
			saving: "Saglabā…",
			saved: "Apstiprināšanas plūsma saglabāta",
			empty: "Pievienojiet projekta, finanšu un budžeta kontroles punktus.",
			currency: "Sliekšņu valūta",
			managersTitle: "Plūsmas pārvaldnieki",
			managersDescription:
				"Šie lietotāji var mainīt secību un sliekšņus. Projekta īpašniekam šīs tiesības ir vienmēr.",
			owner: "Projekta īpašnieks",
			saveManagers: "Saglabāt pārvaldniekus",
			managersSaved: "Pārvaldnieki saglabāti",
			readOnly: "Tikai skatīšanai",
			readOnlyDescription:
				"Apstiprināšanas plūsmu var mainīt projekta īpašnieks vai plūsmas pārvaldnieks.",
		};
	}
	if (language === "ru") {
		return {
			title: "Контрольные точки согласования",
			description:
				"Настройте ответственность, порядок и пороги суммы для счетов проекта.",
			add: "Добавить контрольную точку",
			user: "Выберите ответственного",
			role: "Тип ответственности",
			customLabel: "Название должности (необязательно)",
			threshold: "От суммы, EUR (необязательно)",
			thresholdHelp:
				"Оставьте пустым, чтобы проверка была обязательной для всех счетов.",
			save: "Сохранить процесс согласования",
			saving: "Сохранение…",
			saved: "Процесс согласования сохранен",
			empty: "Добавьте проектную, финансовую и бюджетную контрольные точки.",
			currency: "Валюта порогов",
			managersTitle: "Администраторы процесса",
			managersDescription:
				"Эти пользователи могут менять порядок и пороги. Владелец проекта всегда имеет доступ.",
			owner: "Владелец проекта",
			saveManagers: "Сохранить администраторов",
			managersSaved: "Администраторы сохранены",
			readOnly: "Только просмотр",
			readOnlyDescription:
				"Изменять процесс может владелец проекта или администратор процесса.",
		};
	}
	return {
		title: "Approval checkpoints",
		description:
			"Set responsibility, order, and amount thresholds for this project's invoices.",
		add: "Add checkpoint",
		user: "Choose responsible person",
		role: "Responsibility type",
		customLabel: "Custom job title (optional)",
		threshold: "Required from, EUR (optional)",
		thresholdHelp: "Leave blank to require this checkpoint for every invoice.",
		save: "Save approval flow",
		saving: "Saving…",
		saved: "Approval flow saved",
		empty: "Add project, financial, and budget checkpoints.",
		currency: "Threshold currency",
		managersTitle: "Workflow managers",
		managersDescription:
			"These users can change the sequence and thresholds. The project owner always has access.",
		owner: "Project owner",
		saveManagers: "Save managers",
		managersSaved: "Managers saved",
		readOnly: "Read only",
		readOnlyDescription:
			"The project owner or a workflow manager can change this approval flow.",
	};
}

function nextRoleKey(steps: SetupStep[]): TgemApprovalRoleKey {
	return (
		TGEM_APPROVAL_ROLE_KEYS.find(
			(roleKey) => !steps.some((step) => step.roleKey === roleKey),
		) ?? "project_review"
	);
}

export function TgemApprovalSetup({
	siteId,
	setup,
	organizationLanguage,
	onSaved,
}: {
	siteId: string;
	setup: TgemDashboardData["approvalSetup"];
	organizationLanguage?: string | null;
	onSaved: () => Promise<void>;
}) {
	const copy = getCopy(organizationLanguage);
	const roleCopy = getTgemApprovalRoleCopy(organizationLanguage);
	const readOnly = !setup.canManageWorkflow;
	const [steps, setSteps] = React.useState<SetupStep[]>(
		() =>
			setup.template?.steps.map((step) => ({
				id: step.id,
				approverUserId: step.approverUserId,
				roleKey: step.roleKey,
				roleLabel: step.role ?? "",
				minimumInvoiceTotal: step.minimumInvoiceTotal ?? "",
			})) ?? [],
	);
	const [managerUserIds, setManagerUserIds] = React.useState<string[]>(
		setup.workflowManagerUserIds,
	);
	const [status, setStatus] = React.useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const [managerStatus, setManagerStatus] = React.useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		setSteps(
			setup.template?.steps.map((step) => ({
				id: step.id,
				approverUserId: step.approverUserId,
				roleKey: step.roleKey,
				roleLabel: step.role ?? "",
				minimumInvoiceTotal: step.minimumInvoiceTotal ?? "",
			})) ?? [],
		);
		setManagerUserIds(setup.workflowManagerUserIds);
	}, [setup]);

	function updateStep(index: number, patch: Partial<SetupStep>) {
		setSteps((current) =>
			current.map((step, candidateIndex) =>
				candidateIndex === index ? { ...step, ...patch } : step,
			),
		);
		setStatus("idle");
	}

	function moveStep(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= steps.length) return;
		setSteps((current) => {
			const next = [...current];
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
		setStatus("idle");
	}

	async function save() {
		setStatus("saving");
		setError(null);
		try {
			await saveTgemApprovalTemplate({
				siteId,
				currency: setup.template?.currency ?? "EUR",
				steps: steps.map(
					({ approverUserId, roleKey, roleLabel, minimumInvoiceTotal }) => ({
						approverUserId,
						roleKey,
						roleLabel,
						minimumInvoiceTotal,
					}),
				),
			});
			await onSaved();
			setStatus("saved");
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Could not save approval flow",
			);
			setStatus("error");
		}
	}

	async function saveManagers() {
		setManagerStatus("saving");
		setError(null);
		try {
			await saveTgemWorkflowManagers({ siteId, userIds: managerUserIds });
			await onSaved();
			setManagerStatus("saved");
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Could not save workflow managers",
			);
			setManagerStatus("error");
		}
	}

	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
			<Card className="overflow-hidden border-blue-200 bg-blue-50/20">
				<CardHeader className="border-b border-blue-100 bg-white/70">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">{copy.title}</CardTitle>
							<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
								{copy.description}
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-end gap-2">
							{readOnly ? (
								<div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
									<span className="block font-semibold">{copy.readOnly}</span>
									<span className="block max-w-64 text-slate-500">
										{copy.readOnlyDescription}
									</span>
								</div>
							) : null}
							<div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
								<span className="block text-[10px] uppercase tracking-[0.12em] text-blue-600">
									{copy.currency}
								</span>
								{setup.template?.currency ?? "EUR"}
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-3 pt-5">
					{steps.length === 0 ? (
						<p className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
							{copy.empty}
						</p>
					) : null}
					<div className="relative space-y-3 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-blue-200">
						{steps.map((step, index) => {
							const selectedElsewhere = new Set(
								steps
									.filter((_, selectedIndex) => selectedIndex !== index)
									.map((candidate) => candidate.approverUserId),
							);
							const role = roleCopy[step.roleKey];
							return (
								<div
									key={step.id}
									className="relative rounded-lg border bg-background p-3 pl-12 shadow-sm"
								>
									<div className="absolute left-[0.72rem] top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-700 text-xs font-semibold text-white shadow-sm">
										{index + 1}
									</div>
									<div className="grid gap-3 lg:grid-cols-2">
										<label className="space-y-1 text-xs font-medium text-muted-foreground">
											{copy.role}
											<select
												aria-label={`${copy.role} ${index + 1}`}
												value={step.roleKey}
												disabled={readOnly}
												onChange={(event) =>
													updateStep(index, {
														roleKey: event.target.value as TgemApprovalRoleKey,
													})
												}
												className="block h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
											>
												{TGEM_APPROVAL_ROLE_KEYS.map((roleKey) => (
													<option key={roleKey} value={roleKey}>
														{roleCopy[roleKey].title}
													</option>
												))}
											</select>
										</label>
										<label className="space-y-1 text-xs font-medium text-muted-foreground">
											{copy.user}
											<select
												aria-label={`${copy.user} ${index + 1}`}
												value={step.approverUserId}
												disabled={readOnly}
												onChange={(event) =>
													updateStep(index, {
														approverUserId: event.target.value,
													})
												}
												className="block h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
											>
												<option value="">{copy.user}</option>
												{setup.users.map((user) => (
													<option
														key={user.id}
														value={user.id}
														disabled={selectedElsewhere.has(user.id)}
													>
														{user.name}
													</option>
												))}
											</select>
										</label>
										<label className="space-y-1 text-xs font-medium text-muted-foreground">
											{copy.customLabel}
											<input
												aria-label={`${copy.customLabel} ${index + 1}`}
												value={step.roleLabel}
												disabled={readOnly}
												placeholder={role.person}
												onChange={(event) =>
													updateStep(index, { roleLabel: event.target.value })
												}
												className="block h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
											/>
										</label>
										<label className="space-y-1 text-xs font-medium text-muted-foreground">
											{copy.threshold}
											<input
												aria-label={`${copy.threshold} ${index + 1}`}
												inputMode="decimal"
												value={step.minimumInvoiceTotal}
												disabled={readOnly}
												placeholder="0.00"
												onChange={(event) =>
													updateStep(index, {
														minimumInvoiceTotal: event.target.value,
													})
												}
												className="block h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"
											/>
										</label>
									</div>
									<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
										<p className="max-w-xl text-xs text-muted-foreground">
											{role.description} {copy.thresholdHelp}
										</p>
										{!readOnly ? (
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() => moveStep(index, -1)}
													disabled={index === 0}
													aria-label={`Move step ${index + 1} up`}
													className="rounded-md border p-2 disabled:opacity-30"
												>
													<ArrowUp className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => moveStep(index, 1)}
													disabled={index === steps.length - 1}
													aria-label={`Move step ${index + 1} down`}
													className="rounded-md border p-2 disabled:opacity-30"
												>
													<ArrowDown className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => {
														setSteps((current) =>
															current.filter(
																(_, candidateIndex) => candidateIndex !== index,
															),
														);
														setStatus("idle");
													}}
													aria-label={`Remove step ${index + 1}`}
													className="rounded-md border p-2 text-red-600 hover:bg-red-50"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
					{!readOnly ? (
						<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
							<button
								type="button"
								onClick={() =>
									setSteps((current) => [
										...current,
										{
											id: `new-${current.length}-${Date.now()}`,
											approverUserId: "",
											roleKey: nextRoleKey(current),
											roleLabel: "",
											minimumInvoiceTotal: "",
										},
									])
								}
								disabled={steps.length >= 10}
								className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
							>
								<Plus className="h-4 w-4" />
								{copy.add}
							</button>
							<div className="flex items-center gap-3">
								{status === "saved" ? (
									<span className="text-sm text-emerald-700">{copy.saved}</span>
								) : null}
								<button
									type="button"
									onClick={() => void save()}
									disabled={status === "saving" || steps.length === 0}
									className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
								>
									{status === "saving" ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : null}
									{status === "saving" ? copy.saving : copy.save}
								</button>
							</div>
						</div>
					) : null}
					{error ? <p className="text-sm text-red-600">{error}</p> : null}
				</CardContent>
			</Card>

			{
				<Card className="h-fit border-slate-200">
					<CardHeader>
						<div className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5 text-blue-700" />
							<CardTitle className="text-base">{copy.managersTitle}</CardTitle>
						</div>
						<p className="text-sm text-muted-foreground">
							{copy.managersDescription}
						</p>
					</CardHeader>
					<CardContent className="space-y-2">
						{setup.users.map((candidate) => {
							const owner = candidate.id === setup.ownerUserId;
							const checked = owner || managerUserIds.includes(candidate.id);
							return (
								<label
									key={candidate.id}
									className="flex items-start gap-3 rounded-md border p-3 text-sm"
								>
									<input
										type="checkbox"
										checked={checked}
										disabled={!setup.canManageWorkflowManagers || owner}
										onChange={(event) => {
											setManagerUserIds((current) =>
												event.target.checked
													? [...current, candidate.id]
													: current.filter((userId) => userId !== candidate.id),
											);
											setManagerStatus("idle");
										}}
										className="mt-0.5 h-4 w-4"
									/>
									<span className="min-w-0">
										<span className="block truncate font-medium">
											{candidate.name}
										</span>
										<span className="block text-xs text-muted-foreground">
											{owner ? copy.owner : candidate.role || "—"}
										</span>
									</span>
								</label>
							);
						})}
						{setup.canManageWorkflowManagers ? (
							<button
								type="button"
								onClick={() => void saveManagers()}
								disabled={managerStatus === "saving"}
								className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
							>
								{managerStatus === "saving" ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : null}
								{copy.saveManagers}
							</button>
						) : null}
						{managerStatus === "saved" ? (
							<p className="text-sm text-emerald-700">{copy.managersSaved}</p>
						) : null}
					</CardContent>
				</Card>
			}
		</div>
	);
}
