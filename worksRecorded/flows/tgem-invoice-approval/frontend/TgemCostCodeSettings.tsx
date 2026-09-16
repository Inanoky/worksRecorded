"use client";

import {
	Archive,
	Building2,
	ChevronDown,
	Plus,
	RotateCcw,
	Save,
	Settings2,
	ShieldCheck,
	Tags,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TgemDashboardApprovalSetup } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	saveTgemCostCode,
	setTgemCostCodeActive,
} from "@/server/actions/tgem-cost-code-actions";
import { TgemApprovalSetup } from "./TgemApprovalSetup";

type CostCode = {
	id: string;
	code: string;
	name: string;
	isActive: boolean;
};

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Projekta iestatījumi",
			description:
				"Konfigurējiet rēķinu apstiprināšanas secību un grāmatvedības kodus.",
			approvalFlow: "Apstiprināšanas plūsma",
			approvalFlowDescription:
				"Secība attiecas tikai uz galvenē izvēlēto projektu.",
			selectProject:
				"Galvenē izvēlieties konkrētu projektu, lai konfigurētu tā apstiprināšanas secību.",
			selectedProject: "Izvēlētais projekts",
			shared:
				"Izmaksu kodu saraksts ir kopīgs visiem organizācijas projektiem.",
			catalog: "Izmaksu kodu katalogs",
			catalogDescription:
				"Katram kodam pievienojiet īsu, darbiniekiem saprotamu nozīmi.",
			code: "Kods",
			meaning: "Nozīme",
			codeExample: "Piemēram, A123",
			meaningExample: "Piemēram, Administratīvie izdevumi",
			add: "Pievienot kodu",
			save: "Saglabāt",
			archive: "Arhivēt",
			restore: "Atjaunot",
			active: "Aktīvie kodi",
			archived: "Arhivētie kodi",
			empty: "Izmaksu kodi vēl nav pievienoti.",
			saving: "Saglabā…",
			failed: "Neizdevās saglabāt izmaksu kodu.",
		};
	}
	if (language === "ru") {
		return {
			title: "Настройки проекта",
			description:
				"Настройте последовательность согласования счетов и бухгалтерские коды.",
			approvalFlow: "Процесс согласования",
			approvalFlowDescription:
				"Последовательность применяется только к проекту, выбранному в заголовке.",
			selectProject:
				"Выберите конкретный проект в заголовке, чтобы настроить его последовательность согласования.",
			selectedProject: "Выбранный проект",
			shared: "Список кодов затрат общий для всех проектов организации.",
			catalog: "Справочник кодов затрат",
			catalogDescription:
				"Добавьте к каждому коду короткое и понятное описание.",
			code: "Код",
			meaning: "Значение",
			codeExample: "Например, A123",
			meaningExample: "Например, Административные расходы",
			add: "Добавить код",
			save: "Сохранить",
			archive: "Архивировать",
			restore: "Восстановить",
			active: "Активные коды",
			archived: "Архивные коды",
			empty: "Коды затрат еще не добавлены.",
			saving: "Сохранение…",
			failed: "Не удалось сохранить код затрат.",
		};
	}
	return {
		title: "Project settings",
		description:
			"Configure invoice approval steps and the accounting codes used by your team.",
		approvalFlow: "Approval flow",
		approvalFlowDescription:
			"This sequence applies only to the project selected in the header.",
		selectProject:
			"Select a specific project in the header to configure its approval sequence.",
		selectedProject: "Selected project",
		shared:
			"The cost-code catalog is shared by every project in the organization.",
		catalog: "Cost-code catalog",
		catalogDescription:
			"Give every code a short meaning your team will recognize.",
		code: "Code",
		meaning: "Meaning",
		codeExample: "For example, A123",
		meaningExample: "For example, Administrative expense",
		add: "Add code",
		save: "Save",
		archive: "Archive",
		restore: "Restore",
		active: "Active codes",
		archived: "Archived codes",
		empty: "No cost codes have been added yet.",
		saving: "Saving…",
		failed: "Could not save the cost code.",
	};
}

function CostCodeRow({
	costCode,
	copy,
	onChanged,
}: {
	costCode: CostCode;
	copy: ReturnType<typeof getCopy>;
	onChanged: (costCode: CostCode) => void;
}) {
	const codeInputId = React.useId();
	const nameInputId = React.useId();
	const [code, setCode] = React.useState(costCode.code);
	const [name, setName] = React.useState(costCode.name);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	async function save() {
		setSaving(true);
		setError(null);
		try {
			const saved = await saveTgemCostCode({ id: costCode.id, code, name });
			onChanged(saved);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : copy.failed);
		} finally {
			setSaving(false);
		}
	}

	async function toggleActive() {
		setSaving(true);
		setError(null);
		try {
			await setTgemCostCodeActive({
				id: costCode.id,
				isActive: !costCode.isActive,
			});
			onChanged({ ...costCode, code, name, isActive: !costCode.isActive });
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : copy.failed);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div
			className={`rounded-lg border p-3 ${costCode.isActive ? "bg-background" : "bg-muted/35 opacity-75"}`}
		>
			<div className="grid gap-2 md:grid-cols-[minmax(8rem,0.35fr)_minmax(14rem,1fr)_auto]">
				<label htmlFor={codeInputId}>
					<span className="mb-1 block text-xs font-medium text-muted-foreground">
						{copy.code}
					</span>
					<Input
						id={codeInputId}
						value={code}
						onChange={(event) => setCode(event.target.value.toUpperCase())}
						maxLength={32}
						disabled={saving}
						className="font-mono font-semibold tracking-wide"
					/>
				</label>
				<label htmlFor={nameInputId}>
					<span className="mb-1 block text-xs font-medium text-muted-foreground">
						{copy.meaning}
					</span>
					<Input
						id={nameInputId}
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={120}
						disabled={saving}
					/>
				</label>
				<div className="flex items-end gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={
							saving || (code === costCode.code && name === costCode.name)
						}
						onClick={() => void save()}
					>
						<Save className="size-4" />
						{saving ? copy.saving : copy.save}
					</Button>
					<Button
						type="button"
						variant="ghost"
						disabled={saving}
						onClick={() => void toggleActive()}
					>
						{costCode.isActive ? (
							<Archive className="size-4" />
						) : (
							<RotateCcw className="size-4" />
						)}
						{costCode.isActive ? copy.archive : copy.restore}
					</Button>
				</div>
			</div>
			{error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
		</div>
	);
}

export function TgemCostCodeSettings({
	initialCostCodes,
	organizationLanguage,
	selectedProject = null,
	approvalSetup = null,
}: {
	initialCostCodes: CostCode[];
	organizationLanguage?: string | null;
	selectedProject?: { id: string; name: string } | null;
	approvalSetup?: TgemDashboardApprovalSetup | null;
}) {
	const copy = getCopy(organizationLanguage);
	const router = useRouter();
	const newCodeInputId = React.useId();
	const newNameInputId = React.useId();
	const activeTitleId = React.useId();
	const archivedTitleId = React.useId();
	const approvalTitleId = React.useId();
	const approvalContentId = React.useId();
	const costCodeContentId = React.useId();
	const [approvalOpen, setApprovalOpen] = React.useState(false);
	const [costCodesOpen, setCostCodesOpen] = React.useState(false);
	const [costCodes, setCostCodes] = React.useState(initialCostCodes);
	const [code, setCode] = React.useState("");
	const [name, setName] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const activeCodes = costCodes.filter((item) => item.isActive);
	const archivedCodes = costCodes.filter((item) => !item.isActive);

	function updateCostCode(next: CostCode) {
		setCostCodes((current) =>
			current
				.map((item) => (item.id === next.id ? next : item))
				.sort((left, right) => left.code.localeCompare(right.code)),
		);
	}

	async function addCostCode(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const saved = await saveTgemCostCode({ code, name });
			setCostCodes((current) =>
				[...current, saved].sort((left, right) =>
					left.code.localeCompare(right.code),
				),
			);
			setCode("");
			setName("");
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : copy.failed);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-[116rem] px-3 py-6 sm:px-5">
			<div className="border-b pb-5">
				<div className="flex items-center gap-3">
					<div className="flex size-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
						<Settings2 className="size-5" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							{copy.title}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{copy.description}
						</p>
					</div>
				</div>
				<p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">
					{copy.shared}
				</p>
			</div>

			<section
				className="mt-5 rounded-xl border bg-card"
				aria-labelledby={approvalTitleId}
			>
				<button
					type="button"
					aria-label={copy.approvalFlow}
					aria-expanded={approvalOpen}
					aria-controls={approvalContentId}
					onClick={() => setApprovalOpen((open) => !open)}
					className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl p-5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span className="min-w-0 flex-1">
						<span
							id={approvalTitleId}
							className="flex items-center gap-2 text-base font-semibold"
						>
							<ShieldCheck className="size-5 text-blue-700 dark:text-blue-300" />
							{copy.approvalFlow}
						</span>
						<span className="mt-1 block text-sm text-muted-foreground">
							{copy.approvalFlowDescription}
						</span>
					</span>
					<ChevronDown
						className={`size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${approvalOpen ? "rotate-180" : ""}`}
					/>
				</button>
				<div
					id={approvalContentId}
					hidden={!approvalOpen}
					className="space-y-3 border-t p-5"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						{selectedProject ? (
							<div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-100">
								<Building2 className="size-4 text-blue-600 dark:text-blue-300" />
								<span className="text-xs text-blue-700 dark:text-blue-300">
									{copy.selectedProject}:
								</span>
								<span className="font-semibold">{selectedProject.name}</span>
							</div>
						) : null}
					</div>
					{selectedProject && approvalSetup ? (
						<TgemApprovalSetup
							siteId={selectedProject.id}
							setup={approvalSetup}
							organizationLanguage={organizationLanguage}
							onSaved={async () => router.refresh()}
						/>
					) : (
						<Card className="border-dashed border-blue-300 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/15">
							<CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
								<Building2 className="size-5 shrink-0 text-blue-600 dark:text-blue-300" />
								{copy.selectProject}
							</CardContent>
						</Card>
					)}
				</div>
			</section>

			<Card className="mt-6">
				<CardHeader>
					<button
						type="button"
						aria-label={copy.catalog}
						aria-expanded={costCodesOpen}
						aria-controls={costCodeContentId}
						onClick={() => setCostCodesOpen((open) => !open)}
						className="flex w-full items-center justify-between gap-3 rounded-md text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<span className="min-w-0 flex-1">
							<span className="flex items-center gap-2 text-base font-semibold">
								<Tags className="size-5 text-blue-700 dark:text-blue-300" />
								{copy.catalog}
							</span>
							<span className="mt-1 block text-sm text-muted-foreground">
								{copy.catalogDescription}
							</span>
						</span>
						<ChevronDown
							className={`size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${costCodesOpen ? "rotate-180" : ""}`}
						/>
					</button>
				</CardHeader>
				<CardContent
					id={costCodeContentId}
					hidden={!costCodesOpen}
					className="space-y-5"
				>
					<form
						onSubmit={(event) => void addCostCode(event)}
						className="grid gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-3 md:grid-cols-[minmax(8rem,0.35fr)_minmax(14rem,1fr)_auto] dark:border-blue-900 dark:bg-blue-950/15"
					>
						<label htmlFor={newCodeInputId}>
							<span className="mb-1 block text-xs font-medium text-muted-foreground">
								{copy.code}
							</span>
							<Input
								id={newCodeInputId}
								value={code}
								onChange={(event) => setCode(event.target.value.toUpperCase())}
								placeholder={copy.codeExample}
								maxLength={32}
								disabled={saving}
								className="bg-background font-mono font-semibold tracking-wide"
							/>
						</label>
						<label htmlFor={newNameInputId}>
							<span className="mb-1 block text-xs font-medium text-muted-foreground">
								{copy.meaning}
							</span>
							<Input
								id={newNameInputId}
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder={copy.meaningExample}
								maxLength={120}
								disabled={saving}
								className="bg-background"
							/>
						</label>
						<div className="flex items-end">
							<Button
								type="submit"
								disabled={saving || !code.trim() || !name.trim()}
							>
								<Plus className="size-4" />
								{saving ? copy.saving : copy.add}
							</Button>
						</div>
						{error ? (
							<p className="text-xs text-red-600 md:col-span-3">{error}</p>
						) : null}
					</form>

					<section aria-labelledby={activeTitleId} className="space-y-2">
						<h2 id={activeTitleId} className="text-sm font-semibold">
							{copy.active} · {activeCodes.length}
						</h2>
						{activeCodes.map((item) => (
							<CostCodeRow
								key={item.id}
								costCode={item}
								copy={copy}
								onChanged={updateCostCode}
							/>
						))}
						{activeCodes.length === 0 ? (
							<div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
								{copy.empty}
							</div>
						) : null}
					</section>

					{archivedCodes.length > 0 ? (
						<section aria-labelledby={archivedTitleId} className="space-y-2">
							<h2
								id={archivedTitleId}
								className="text-sm font-semibold text-muted-foreground"
							>
								{copy.archived} · {archivedCodes.length}
							</h2>
							{archivedCodes.map((item) => (
								<CostCodeRow
									key={item.id}
									costCode={item}
									copy={copy}
									onChanged={updateCostCode}
								/>
							))}
						</section>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
