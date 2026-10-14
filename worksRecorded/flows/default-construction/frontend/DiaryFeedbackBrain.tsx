"use client";

import { Brain, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	getConstructionDiaryFeedback,
	refreshConstructionDiaryFeedback,
	restoreConstructionDiaryFeedback,
	saveConstructionDiaryFeedback,
} from "../backend/diary-feedback-actions";
import type { DiaryFeedbackDomain } from "../lib/diary-feedback";
import { DIARY_FEEDBACK_MAX_PROMPT } from "../lib/diary-feedback";

const warehouseCopy = {
	lv: {
		generated: "Palīgs no noliktavas",
		empty: "Palīgs vēl nav izveidots. Nospiediet “Atjaunot no noliktavas”.",
		refresh: "Atjaunot no noliktavas",
		placeholder:
			"Precizējiet materiālu nosaukumus, sinonīmus un piesaistes noteikumus…",
	},
	en: {
		generated: "Helper from warehouse",
		empty: "No helper yet. Click “Refresh from warehouse”.",
		refresh: "Refresh from warehouse",
		placeholder: "Clarify material names, aliases and assignment rules…",
	},
	ru: {
		generated: "Помощник из склада",
		empty: "Помощник ещё не создан. Нажмите «Обновить из склада».",
		refresh: "Обновить из склада",
		placeholder: "Уточните названия материалов, синонимы и правила привязки…",
	},
};

const copy = {
	lv: {
		title: "AI smadzenes",
		description:
			"Šī projekta WhatsApp ekstraktora un darbu kategorizētāja palīgs. Atziņas no esošajiem ierakstiem nav pārbaudīti fakti. Lietotāja norādījumi tiek saglabāti un netiek pārrakstīti automātiski.",
		rules: "Jūsu norādījumi — prioritāri",
		placeholder:
			"Precizējiet darbu nosaukumus, sinonīmus un kategoriju izvēles noteikumus…",
		generated: "Palīgs no žurnāla",
		empty: "Palīgs vēl nav izveidots. Nospiediet “Atjaunot no žurnāla”.",
		refresh: "Atjaunot no žurnāla",
		edit: "Labot šo palīgu",
		save: "Saglabāt",
		history: "Versiju vēsture",
		restore: "Atjaunot šo versiju",
		more: "Vēl versijas",
		loading: "Ielādē palīgu…",
		updating: "Analizē projekta ierakstus…",
		records: "ieraksti",
		schedule:
			"Automātiska pārbaude ik pēc 6 stundām. Ja ieraksti vai kategorijas nav mainīti, jauna versija netiek veidota.",
		unsaved: "Vispirms saglabājiet vai atceliet izmaiņas.",
		discard: "Atcelt izmaiņas",
		error: "Neizdevās atjaunot palīgu. Mēģiniet vēlreiz.",
		busy: "Palīgs jau tiek atjaunots. Mēģiniet ielādēt vēlreiz pēc brīža.",
		stale:
			"Dati mainījās analīzes laikā. Saglabāts iepriekšējais palīgs; mēģiniet vēlreiz.",
		reload: "Ielādēt vēlreiz",
		confirm: "Atjaunot izvēlēto versiju? Pašreizējā versija paliks vēsturē.",
		manual: "Lietotāja labojums",
		restored: "Atjaunota versija",
		auto: "Automātiski",
	},
	en: {
		title: "AI brain",
		description:
			"Project-scoped guidance for WhatsApp extraction and work categorization. Historical patterns are not verified facts. Your instructions are retained and never overwritten automatically.",
		rules: "Your instructions — priority",
		placeholder: "Clarify work names, aliases and category selection rules…",
		generated: "Helper from diary",
		empty: "No helper yet. Click “Refresh from diary”.",
		refresh: "Refresh from diary",
		edit: "Edit this helper",
		save: "Save",
		history: "Version history",
		restore: "Restore this version",
		more: "More versions",
		loading: "Loading helper…",
		updating: "Analyzing project records…",
		records: "records",
		schedule:
			"Checked automatically every 6 hours. A new version is created only when records or categories change.",
		unsaved: "Save or discard your changes first.",
		discard: "Discard changes",
		error: "Unable to update the helper. Please retry.",
		busy: "The helper is already being updated. Reload in a moment.",
		stale:
			"Data changed during analysis. The previous helper was retained; please retry.",
		reload: "Reload",
		confirm:
			"Restore this version? The current version will remain in history.",
		manual: "User correction",
		restored: "Restored version",
		auto: "Automatic",
	},
	ru: {
		title: "AI-память",
		description:
			"Помощник этого проекта для извлечения WhatsApp-записей и классификации работ. Исторические закономерности не являются проверенными фактами. Ваши указания сохраняются и не перезаписываются автоматически.",
		rules: "Ваши указания — приоритет",
		placeholder:
			"Уточните названия работ, синонимы и правила выбора категорий…",
		generated: "Помощник из журнала",
		empty: "Помощник ещё не создан. Нажмите «Обновить из журнала».",
		refresh: "Обновить из журнала",
		edit: "Исправить помощник",
		save: "Сохранить",
		history: "История версий",
		restore: "Восстановить версию",
		more: "Ещё версии",
		loading: "Загрузка помощника…",
		updating: "Анализ записей проекта…",
		records: "записей",
		schedule:
			"Автоматическая проверка каждые 6 часов. Новая версия создаётся только при изменении записей или категорий.",
		unsaved: "Сначала сохраните или отмените изменения.",
		discard: "Отменить изменения",
		error: "Не удалось обновить помощник. Повторите попытку.",
		busy: "Помощник уже обновляется. Перезагрузите через некоторое время.",
		stale:
			"Данные изменились во время анализа. Предыдущий помощник сохранён; повторите попытку.",
		reload: "Перезагрузить",
		confirm: "Восстановить версию? Текущая останется в истории.",
		manual: "Исправление пользователя",
		restored: "Восстановленная версия",
		auto: "Автоматически",
	},
};

type FeedbackData = Awaited<ReturnType<typeof getConstructionDiaryFeedback>>;

function FeedbackPrompt({ text }: { text: string }) {
	return (
		<div className="space-y-3 text-sm leading-relaxed">
			{Array.from(new Set(text.split(/\n\s*\n/))).map((section) => {
				const lines = section.split("\n").filter(Boolean);
				const heading = lines[0]?.startsWith("## ") ? lines[0].slice(3) : null;
				const body = Array.from(new Set(heading ? lines.slice(1) : lines));
				return (
					<section key={section} className="space-y-1.5">
						{heading ? (
							<h4 className="font-medium text-foreground">{heading}</h4>
						) : null}
						{body.length > 0 && body.every((line) => line.startsWith("- ")) ? (
							<ul className="list-disc space-y-1.5 pl-5">
								{body.map((line) => (
									<li key={line}>{line.slice(2)}</li>
								))}
							</ul>
						) : (
							<p className="whitespace-pre-wrap break-words">
								{body.join("\n")}
							</p>
						)}
					</section>
				);
			})}
		</div>
	);
}

export function DiaryFeedbackBrain({
	siteId,
	organizationLanguage = "lv",
	domain = "diary",
}: {
	siteId: string;
	organizationLanguage?: string | null;
	domain?: DiaryFeedbackDomain;
}) {
	const language =
		organizationLanguage === "en" || organizationLanguage === "ru"
			? organizationLanguage
			: "lv";
	const t = {
		...copy[language],
		...(domain === "warehouse" ? warehouseCopy[language] : {}),
	};
	const [open, setOpen] = useState(false);
	const [data, setData] = useState<FeedbackData | null>(null);
	const [draft, setDraft] = useState("");
	const [busy, setBusy] = useState<
		"load" | "refresh" | "save" | "history" | null
	>(null);
	const [error, setError] = useState("");
	const dirty = draft !== (data?.snapshot.userInstructions || "");

	const accept = (result: FeedbackData) => {
		setData(result);
		setDraft(result.snapshot.userInstructions);
	};
	const run = async (
		kind: NonNullable<typeof busy>,
		action: () => Promise<void>,
	) => {
		setBusy(kind);
		setError("");
		try {
			await action();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : t.error);
		} finally {
			setBusy(null);
		}
	};
	const load = () =>
		run("load", async () =>
			accept(await getConstructionDiaryFeedback(siteId, undefined, domain)),
		);
	const refresh = () =>
		run("refresh", async () => {
			const result = await refreshConstructionDiaryFeedback(siteId, domain);
			accept(result);
			if (result.status === "busy") setError(t.busy);
			if (result.status === "inactive")
				setError(
					organizationLanguage === "en"
						? "No new records in the last 3 days. Automatic AI generation is paused."
						: organizationLanguage === "ru"
							? "Нет новых записей за последние 3 дня. Генерация приостановлена."
							: "Pēdējās 3 dienās nav jaunu ierakstu. AI ģenerēšana ir apturēta.",
				);
			if (result.status === "source-changed" || result.status === "superseded")
				setError(t.stale);
		});
	const locale =
		organizationLanguage === "en"
			? "en-GB"
			: organizationLanguage === "ru"
				? "ru-RU"
				: "lv-LV";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="outline"
				disabled={Boolean(busy)}
				onClick={() => {
					setOpen(true);
					if (!dirty) void load();
				}}
			>
				<Brain className="mr-2 size-4" />
				{t.title}
			</Button>
			<DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>
						{t.title} ·{" "}
						{domain === "warehouse"
							? organizationLanguage === "en"
								? "Warehouse"
								: organizationLanguage === "ru"
									? "Склад"
									: "Noliktava"
							: organizationLanguage === "en"
								? "Site diary"
								: organizationLanguage === "ru"
									? "Журнал работ"
									: "Būvdarbu žurnāls"}
					</DialogTitle>
					<DialogDescription>
						{domain === "warehouse"
							? organizationLanguage === "en"
								? "Project guidance for invoice extraction and material categorization. Separate from the site diary brain; your corrections are retained."
								: organizationLanguage === "ru"
									? "Указания проекта для извлечения счетов и классификации материалов. Отдельно от журнала работ; ваши исправления сохраняются."
									: "Projekta rēķinu ekstrakcijas un materiālu kategorizācijas palīgs. Atsevišķs no būvdarbu žurnāla; jūsu labojumi tiek saglabāti."
							: t.description}
					</DialogDescription>
				</DialogHeader>
				<div
					className="min-h-0 space-y-5 overflow-y-auto pr-1"
					aria-busy={Boolean(busy)}
				>
					{busy ? (
						<output className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
							<Loader2 className="size-4 animate-spin" />
							{busy === "refresh" ? t.updating : t.loading}
						</output>
					) : null}
					{error ? (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
					{!data && !busy ? (
						<Button variant="outline" onClick={() => void load()}>
							{t.reload}
						</Button>
					) : null}
					{data ? (
						<>
							<div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
								<span>
									v{data.snapshot.revision} · {data.snapshot.sourceRecordCount}{" "}
									{t.records}
									{data.snapshot.updatedAt
										? ` · ${new Date(data.snapshot.updatedAt).toLocaleString(locale)}`
										: ""}
								</span>
								<Button
									variant="ghost"
									disabled={Boolean(busy)}
									onClick={() =>
										void run("load", async () =>
											setData(
												await getConstructionDiaryFeedback(
													siteId,
													undefined,
													domain,
												),
											),
										)
									}
								>
									{t.reload}
								</Button>
								<Button
									variant="outline"
									disabled={Boolean(busy) || dirty || !data.snapshot.active}
									onClick={() => void refresh()}
								>
									<RefreshCw className="mr-2 size-4" />
									{t.refresh}
								</Button>
							</div>
							{!data.snapshot.active ? (
								<p className="rounded-md bg-muted p-3 text-sm">
									{organizationLanguage === "en"
										? "No new records in the last 3 days. This brain is paused; saved guidance and history remain available."
										: organizationLanguage === "ru"
											? "Нет новых записей за последние 3 дня. AI-память приостановлена; история сохранена."
											: "Pēdējās 3 dienās nav jaunu ierakstu. AI palīgs ir apturēts; norādījumi un vēsture saglabāti."}
								</p>
							) : null}
							{data.snapshot.busy ? (
								<output className="block text-sm text-muted-foreground">
									{t.updating} {t.busy}
								</output>
							) : null}
							<div className="space-y-2">
								<label
									htmlFor={`feedback-${siteId}-${domain}`}
									className="text-sm font-medium"
								>
									{t.rules}
								</label>
								<Textarea
									id={`feedback-${siteId}-${domain}`}
									value={draft}
									maxLength={DIARY_FEEDBACK_MAX_PROMPT}
									disabled={Boolean(busy)}
									placeholder={t.placeholder}
									className="min-h-36 resize-y [field-sizing:fixed]"
									onChange={(event) => setDraft(event.target.value)}
								/>
								<div className="flex items-center justify-between gap-2">
									<span className="text-xs text-muted-foreground">
										{draft.length}/{DIARY_FEEDBACK_MAX_PROMPT}
									</span>
									<div className="flex gap-2">
										{dirty ? (
											<Button
												variant="ghost"
												disabled={Boolean(busy)}
												onClick={() => setDraft(data.snapshot.userInstructions)}
											>
												{t.discard}
											</Button>
										) : null}
										<Button
											disabled={Boolean(busy) || !dirty}
											onClick={() =>
												void run("save", async () =>
													accept(
														await saveConstructionDiaryFeedback({
															siteId,
															domain,
															expectedRevision: data.snapshot.revision,
															userInstructions: draft,
														}),
													),
												)
											}
										>
											{t.save}
										</Button>
									</div>
								</div>
								{dirty ? (
									<p className="text-xs text-muted-foreground">{t.unsaved}</p>
								) : null}
							</div>
							<section className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-sm font-medium">{t.generated}</h3>
									<Button
										variant="ghost"
										size="sm"
										disabled={
											Boolean(busy) ||
											dirty ||
											!data.snapshot.generatedPrompt ||
											Boolean(data.snapshot.userInstructions)
										}
										onClick={() => setDraft(data.snapshot.generatedPrompt)}
									>
										{t.edit}
									</Button>
								</div>
								<div className="rounded-md border bg-muted/30 p-4">
									<FeedbackPrompt
										text={data.snapshot.generatedPrompt || t.empty}
									/>
								</div>
							</section>
							<p className="text-xs text-muted-foreground">{t.schedule}</p>
							<section className="space-y-2">
								<h3 className="text-sm font-medium">{t.history}</h3>
								{data.history.map((version) => (
									<details
										key={version.id}
										className="rounded-md border p-3 text-sm"
									>
										<summary className="cursor-pointer">
											v{version.revision} ·{" "}
											{new Date(version.createdAt).toLocaleString(locale)} ·{" "}
											{version.kind === "manual"
												? t.manual
												: version.kind === "restored"
													? t.restored
													: t.auto}{" "}
											· {version.sourceRecordCount} {t.records}
										</summary>
										<p className="mt-3 whitespace-pre-wrap break-words">
											{version.userInstructions}
										</p>
										<div className="mt-3 text-muted-foreground">
											<FeedbackPrompt text={version.generatedPrompt} />
										</div>
										<Button
											className="mt-3"
											variant="outline"
											size="sm"
											disabled={
												Boolean(busy) ||
												dirty ||
												version.revision === data.snapshot.revision
											}
											onClick={() => {
												if (window.confirm(t.confirm))
													void run("save", async () =>
														accept(
															await restoreConstructionDiaryFeedback({
																siteId,
																domain,
																versionId: version.id,
																expectedRevision: data.snapshot.revision,
															}),
														),
													);
											}}
										>
											{t.restore}
										</Button>
									</details>
								))}
								{data.hasMore ? (
									<Button
										variant="outline"
										disabled={Boolean(busy)}
										onClick={() =>
											void run("history", async () => {
												const older = await getConstructionDiaryFeedback(
													siteId,
													data.history[data.history.length - 1].revision,
													domain,
												);
												setData((current) =>
													current
														? {
																...current,
																history: [...current.history, ...older.history],
																hasMore: older.hasMore,
															}
														: current,
												);
											})
										}
									>
										{t.more}
									</Button>
								) : null}
							</section>
						</>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
