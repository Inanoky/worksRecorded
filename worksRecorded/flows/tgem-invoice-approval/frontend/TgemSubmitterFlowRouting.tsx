"use client";

import {
	ArrowDown,
	ArrowUp,
	Check,
	Loader2,
	Pencil,
	Plus,
	Route,
	Save,
	Trash2,
	Users,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	isTgemApprovalRoleLabel,
	TGEM_APPROVAL_ROLE_LABELS,
	type TgemApprovalRoleKey,
} from "@/lib/tgem-invoice-approval/approval";
import type { TgemSubmitterApprovalFlowSettings } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	saveTgemPersonApprovalFlow,
	saveTgemSubmitterApprovalFlow,
} from "@/server/actions/tgem-invoice-approval-actions";

type Flow = TgemSubmitterApprovalFlowSettings["flows"][number];

type DraftStep = {
	id: string;
	approverUserId: string;
	roleKey: TgemApprovalRoleKey;
	roleLabel: string;
	minimumInvoiceTotal: string;
};

type DraftFlow = {
	id: string | null;
	name: string;
	steps: DraftStep[];
};

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Plūsmas pēc iesniedzēja",
			description:
				"Vispirms izveidojiet atkārtoti izmantojamu plūsmu, pēc tam piesaistiet to konkrētiem iesniedzējiem.",
			createStage: "1. Izveidojiet plūsmu",
			assignStage: "2. Piesaistiet cilvēkiem",
			newFlow: "Jauna cilvēku plūsma",
			flowName: "Plūsmas nosaukums",
			flowNamePlaceholder: "Piemēram, Biroja rēķini",
			approver: "Apstiprinātājs",
			role: "Loma",
			chooseRole: "Izvēlieties lomu",
			threshold: "Summas atsauce, EUR (nav obligāta)",
			addStep: "Pievienot soli",
			saveFlow: "Saglabāt plūsmu",
			saving: "Saglabā…",
			cancel: "Atcelt",
			edit: "Rediģēt",
			steps: "soļi",
			noFlows:
				"Vēl nav izveidota neviena cilvēku plūsma. Izveidojiet pirmo, lai to varētu piesaistīt iesniedzējiem.",
			defaultFlow: "Izmantot rēķina projekta plūsmu",
			assignmentDescription:
				"Piesaistītā plūsma tiek izmantota projekta plūsmas vietā. Bez piesaistes darbojas projekta noklusējuma plūsma.",
			flowRequired:
				"Norādiet nosaukumu un vismaz vienu pilnībā aizpildītu soli.",
			failed: "Neizdevās saglabāt izmaiņas.",
		};
	}
	if (language === "ru") {
		return {
			title: "Процессы по отправителю",
			description:
				"Сначала создайте повторно используемый процесс, затем назначьте его конкретным отправителям.",
			createStage: "1. Создайте процесс",
			assignStage: "2. Назначьте людям",
			newFlow: "Новый процесс для людей",
			flowName: "Название процесса",
			flowNamePlaceholder: "Например, Офисные счета",
			approver: "Согласующий",
			role: "Роль",
			chooseRole: "Выберите роль",
			threshold: "Сумма для справки, EUR (необязательно)",
			addStep: "Добавить шаг",
			saveFlow: "Сохранить процесс",
			saving: "Сохранение…",
			cancel: "Отменить",
			edit: "Изменить",
			steps: "шагов",
			noFlows:
				"Процессы для людей еще не созданы. Создайте первый, чтобы назначить его отправителям.",
			defaultFlow: "Использовать процесс проекта счета",
			assignmentDescription:
				"Назначенный процесс используется вместо процесса проекта. Без назначения действует процесс проекта по умолчанию.",
			flowRequired:
				"Укажите название и добавьте хотя бы один полностью заполненный шаг.",
			failed: "Не удалось сохранить изменения.",
		};
	}
	return {
		title: "Flows by submitter",
		description:
			"Create a reusable flow first, then assign it to specific submitters.",
		createStage: "1. Create a flow",
		assignStage: "2. Assign it to people",
		newFlow: "New people flow",
		flowName: "Flow name",
		flowNamePlaceholder: "For example, Office invoices",
		approver: "Approver",
		role: "Role",
		chooseRole: "Choose a role",
		threshold: "Amount reference, EUR (optional)",
		addStep: "Add step",
		saveFlow: "Save flow",
		saving: "Saving…",
		cancel: "Cancel",
		edit: "Edit",
		steps: "steps",
		noFlows:
			"No people flows exist yet. Create the first one before assigning it to submitters.",
		defaultFlow: "Use the invoice project flow",
		assignmentDescription:
			"An assigned flow replaces the project flow. Without an assignment, the project default applies.",
		flowRequired: "Add a name and at least one fully completed step.",
		failed: "Could not save the changes.",
	};
}

function emptyStep(): DraftStep {
	return {
		id: `new-${Date.now()}-${Math.random()}`,
		approverUserId: "",
		roleKey: "project_review",
		roleLabel: "",
		minimumInvoiceTotal: "",
	};
}

function flowToDraft(flow: Flow): DraftFlow {
	return {
		id: flow.id,
		name: flow.name,
		steps: flow.steps.map((step) => ({
			id: step.id,
			approverUserId: step.approverUserId,
			roleKey: step.roleKey,
			roleLabel: isTgemApprovalRoleLabel(step.role) ? (step.role ?? "") : "",
			minimumInvoiceTotal: step.minimumInvoiceTotal ?? "",
		})),
	};
}

export function TgemSubmitterFlowRouting({
	settings,
	organizationLanguage,
}: {
	settings: TgemSubmitterApprovalFlowSettings;
	organizationLanguage?: string | null;
}) {
	const copy = getCopy(organizationLanguage);
	const libraryTitleId = React.useId();
	const assignmentTitleId = React.useId();
	const flowNameInputId = React.useId();
	const thresholdInputId = React.useId();
	const [users, setUsers] = React.useState(settings.users);
	const [flows, setFlows] = React.useState(settings.flows);
	const [draft, setDraft] = React.useState<DraftFlow | null>(null);
	const [savingFlow, setSavingFlow] = React.useState(false);
	const [savingUserId, setSavingUserId] = React.useState<string | null>(null);
	const [savedUserId, setSavedUserId] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => setUsers(settings.users), [settings.users]);
	React.useEffect(() => setFlows(settings.flows), [settings.flows]);

	function updateStep(index: number, patch: Partial<DraftStep>) {
		setDraft((current) =>
			current
				? {
						...current,
						steps: current.steps.map((step, stepIndex) =>
							stepIndex === index ? { ...step, ...patch } : step,
						),
					}
				: current,
		);
		setError(null);
	}

	function moveStep(index: number, direction: -1 | 1) {
		setDraft((current) => {
			if (!current) return current;
			const target = index + direction;
			if (target < 0 || target >= current.steps.length) return current;
			const steps = [...current.steps];
			[steps[index], steps[target]] = [steps[target], steps[index]];
			return { ...current, steps };
		});
	}

	async function saveFlow() {
		if (
			!draft?.name.trim() ||
			draft.steps.length === 0 ||
			draft.steps.some(
				(step) =>
					!step.approverUserId || !isTgemApprovalRoleLabel(step.roleLabel),
			)
		) {
			setError(copy.flowRequired);
			return;
		}
		setSavingFlow(true);
		setError(null);
		try {
			const saved = await saveTgemPersonApprovalFlow({
				...(draft.id ? { id: draft.id } : {}),
				name: draft.name,
				currency: "EUR",
				steps: draft.steps.map((step) => ({
					approverUserId: step.approverUserId,
					roleKey: step.roleKey,
					roleLabel: step.roleLabel,
					minimumInvoiceTotal: step.minimumInvoiceTotal,
				})),
			});
			setFlows((current) =>
				[...current.filter((flow) => flow.id !== saved.id), saved].sort(
					(left, right) => left.name.localeCompare(right.name),
				),
			);
			setDraft(null);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : copy.failed);
		} finally {
			setSavingFlow(false);
		}
	}

	async function updateAssignment(userId: string, flowId: string) {
		const current = users.find((user) => user.id === userId);
		if (!current) return;
		const previous = current.flowId;
		const next = flowId || null;
		setUsers((items) =>
			items.map((item) =>
				item.id === userId ? { ...item, flowId: next } : item,
			),
		);
		setSavingUserId(userId);
		setSavedUserId(null);
		setError(null);
		try {
			await saveTgemSubmitterApprovalFlow({ userId, flowId: next });
			setSavedUserId(userId);
		} catch (saveError) {
			setUsers((items) =>
				items.map((item) =>
					item.id === userId ? { ...item, flowId: previous } : item,
				),
			);
			setError(saveError instanceof Error ? saveError.message : copy.failed);
		} finally {
			setSavingUserId(null);
		}
	}

	return (
		<Card className="overflow-hidden border-[#E1E6ED] bg-white dark:bg-card">
			<CardHeader className="border-b border-[#E1E6ED] bg-slate-50/70 dark:bg-card">
				<CardTitle className="flex items-center gap-2 text-base">
					<Route className="size-4 text-tgem-primary" />
					{copy.title}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{copy.description}</p>
			</CardHeader>
			<CardContent className="space-y-6 p-4 sm:p-5">
				<section aria-labelledby={libraryTitleId} className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 id={libraryTitleId} className="text-sm font-semibold">
							{copy.createStage}
						</h3>
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								setDraft({ id: null, name: "", steps: [emptyStep()] })
							}
						>
							<Plus className="size-4" />
							{copy.newFlow}
						</Button>
					</div>
					{draft ? (
						<div className="rounded-xl border-2 border-tgem-primary/25 bg-[#F7FAFF] p-4 dark:bg-tgem-primary/5">
							<label
								htmlFor={flowNameInputId}
								className="block max-w-xl text-xs font-semibold"
							>
								{copy.flowName}
								<Input
									id={flowNameInputId}
									value={draft.name}
									onChange={(event) => {
										setDraft((current) =>
											current
												? { ...current, name: event.target.value }
												: current,
										);
										setError(null);
									}}
									placeholder={copy.flowNamePlaceholder}
									maxLength={120}
									className="mt-1 bg-background"
								/>
							</label>
							<div className="mt-4 space-y-3">
								{draft.steps.map((step, index) => {
									const selectedElsewhere = new Set(
										draft.steps
											.filter((_, candidateIndex) => candidateIndex !== index)
											.map((candidate) => candidate.approverUserId),
									);
									return (
										<div
											key={step.id}
											className="grid gap-3 rounded-lg border bg-background p-3 lg:grid-cols-[2rem_minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(10rem,0.6fr)_auto] lg:items-end"
										>
											<div className="flex size-8 items-center justify-center rounded-full bg-tgem-primary text-xs font-semibold text-white">
												{index + 1}
											</div>
											<label className="text-xs font-semibold">
												{copy.role}
												<select
													aria-label={`${copy.role} ${index + 1}`}
													value={step.roleLabel}
													onChange={(event) =>
														updateStep(index, { roleLabel: event.target.value })
													}
													className="mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm"
												>
													<option value="">{copy.chooseRole}</option>
													{TGEM_APPROVAL_ROLE_LABELS.map((role) => (
														<option key={role} value={role}>
															{role}
														</option>
													))}
												</select>
											</label>
											<label className="text-xs font-semibold">
												{copy.approver}
												<select
													aria-label={`${copy.approver} ${index + 1}`}
													value={step.approverUserId}
													onChange={(event) =>
														updateStep(index, {
															approverUserId: event.target.value,
														})
													}
													className="mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm"
												>
													<option value="">{copy.approver}</option>
													{users.map((user) => (
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
											<label
												htmlFor={`${thresholdInputId}-${index}`}
												className="text-xs font-semibold"
											>
												{copy.threshold}
												<Input
													id={`${thresholdInputId}-${index}`}
													aria-label={`${copy.threshold} ${index + 1}`}
													inputMode="decimal"
													value={step.minimumInvoiceTotal}
													onChange={(event) =>
														updateStep(index, {
															minimumInvoiceTotal: event.target.value,
														})
													}
													placeholder="0.00"
													className="mt-1"
												/>
											</label>
											<div className="flex items-center gap-1">
												{[
													[
														ArrowUp,
														-1,
														index === 0,
														`Move step ${index + 1} up`,
													],
													[
														ArrowDown,
														1,
														index === draft.steps.length - 1,
														`Move step ${index + 1} down`,
													],
												].map(([Icon, direction, disabled, label]) => (
													<Button
														key={String(label)}
														type="button"
														variant="outline"
														size="icon"
														aria-label={String(label)}
														disabled={Boolean(disabled)}
														onClick={() => moveStep(index, direction as -1 | 1)}
													>
														<Icon className="size-4" />
													</Button>
												))}
												<Button
													type="button"
													variant="outline"
													size="icon"
													aria-label={`Remove step ${index + 1}`}
													onClick={() =>
														setDraft((current) =>
															current
																? {
																		...current,
																		steps: current.steps.filter(
																			(_, stepIndex) => stepIndex !== index,
																		),
																	}
																: current,
														)
													}
												>
													<Trash2 className="size-4 text-red-600" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
								<Button
									type="button"
									variant="outline"
									disabled={draft.steps.length >= 10}
									onClick={() =>
										setDraft((current) =>
											current
												? { ...current, steps: [...current.steps, emptyStep()] }
												: current,
										)
									}
								>
									<Plus className="size-4" />
									{copy.addStep}
								</Button>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="ghost"
										disabled={savingFlow}
										onClick={() => {
											setDraft(null);
											setError(null);
										}}
									>
										{copy.cancel}
									</Button>
									<Button
										type="button"
										disabled={savingFlow}
										onClick={() => void saveFlow()}
										className="bg-tgem-primary text-white hover:bg-tgem-primary-hover"
									>
										{savingFlow ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<Save className="size-4" />
										)}
										{savingFlow ? copy.saving : copy.saveFlow}
									</Button>
								</div>
							</div>
						</div>
					) : null}
					{flows.length > 0 ? (
						<div className="grid gap-2 md:grid-cols-2">
							{flows.map((flow) => (
								<div
									key={flow.id}
									className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
								>
									<div className="min-w-0">
										<div className="truncate text-sm font-semibold">
											{flow.name}
										</div>
										<div className="mt-1 text-xs text-muted-foreground">
											{flow.steps.length} {copy.steps} · {flow.currency}
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => {
											setDraft(flowToDraft(flow));
											setError(null);
										}}
									>
										<Pencil className="size-4" />
										{copy.edit}
									</Button>
								</div>
							))}
						</div>
					) : (
						<div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
							{copy.noFlows}
						</div>
					)}
				</section>
				<section
					aria-labelledby={assignmentTitleId}
					className="space-y-3 border-t pt-5"
				>
					<div>
						<h3
							id={assignmentTitleId}
							className="flex items-center gap-2 text-sm font-semibold"
						>
							<Users className="size-4 text-tgem-primary" />
							{copy.assignStage}
						</h3>
						<p className="mt-1 text-xs text-muted-foreground">
							{copy.assignmentDescription}
						</p>
					</div>
					<div className="divide-y rounded-lg border">
						{users.map((user) => (
							<div
								key={user.id}
								className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(13rem,0.8fr)_minmax(16rem,1.2fr)_minmax(15rem,1fr)] md:items-center"
							>
								<div className="min-w-0">
									<div className="truncate text-sm font-semibold">
										{user.name}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{user.role || "—"}
									</div>
								</div>
								<div className="min-w-0 text-xs text-muted-foreground">
									<div className="truncate">{user.email}</div>
									<div className="truncate">{user.phone || "—"}</div>
								</div>
								<div className="flex min-w-0 items-center gap-2">
									<select
										aria-label={`${copy.title}: ${user.name}`}
										value={user.flowId ?? ""}
										disabled={savingUserId === user.id}
										onChange={(event) =>
											void updateAssignment(user.id, event.target.value)
										}
										className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm focus-visible:outline-tgem-primary"
									>
										<option value="">{copy.defaultFlow}</option>
										{flows.map((flow) => (
											<option key={flow.id} value={flow.id}>
												{flow.name}
											</option>
										))}
									</select>
									{savingUserId === user.id ? (
										<Loader2 className="size-4 shrink-0 animate-spin text-tgem-primary" />
									) : savedUserId === user.id ? (
										<Check className="size-4 shrink-0 text-[#159447]" />
									) : null}
								</div>
							</div>
						))}
					</div>
				</section>
				{error ? <p className="text-sm text-red-600">{error}</p> : null}
			</CardContent>
		</Card>
	);
}
