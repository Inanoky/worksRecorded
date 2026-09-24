"use client";

import {
	AlertCircle,
	Check,
	FileSearch,
	FileUp,
	Loader2,
	RotateCcw,
} from "lucide-react";
import * as React from "react";

import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { runTgemInvoiceOcr } from "@/server/actions/tgem-invoice-actions";

type UploadStage = "idle" | "uploading" | "processing" | "ready" | "error";

type Props = {
	selectedProjectId?: string | null;
	organizationLanguage?: string | null;
	onInvoiceReady: (invoiceCaseId: string, projectId: string) => Promise<void>;
};

function getUploadCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Iesniegt rēķinu",
			description: "Pievienojiet PDF, JPG, PNG vai WebP failu līdz 16 MB.",
			choose: "Izvēlieties rēķinu",
			drop: "vai ievelciet failu šeit",
			upload: "Augšupielāde",
			process: "OCR un datu nolasīšana",
			review: "Gatavs pārbaudei",
			processing: "MI nolasa laukus un pozīcijas…",
			ready: "Rēķins ir gatavs pārbaudei.",
			items: "pozīcijas",
			warnings: "brīdinājumi",
			retry: "Mēģināt vēlreiz",
			invalid: "Izvēlieties PDF, JPG, PNG vai WebP failu.",
			failed: "Rēķinu neizdevās apstrādāt.",
			projectRequired:
				"Pirms rēķina augšupielādes izvēlieties projektu augšējā izvēlnē.",
		};
	}

	if (language === "ru") {
		return {
			title: "Загрузить счет",
			description: "Добавьте PDF, JPG, PNG или WebP размером до 16 МБ.",
			choose: "Выбрать счет",
			drop: "или перетащите файл сюда",
			upload: "Загрузка",
			process: "OCR и извлечение данных",
			review: "Готово к проверке",
			processing: "ИИ извлекает поля и позиции…",
			ready: "Счет готов к проверке.",
			items: "позиций",
			warnings: "предупреждений",
			retry: "Попробовать снова",
			invalid: "Выберите PDF, JPG, PNG или WebP.",
			failed: "Не удалось обработать счет.",
			projectRequired: "Перед загрузкой счета выберите проект в верхнем меню.",
		};
	}

	return {
		title: "Upload invoice",
		description: "Add a PDF, JPG, PNG, or WebP file up to 16 MB.",
		choose: "Choose invoice",
		drop: "or drop the file here",
		upload: "Upload",
		process: "OCR and extraction",
		review: "Ready for review",
		processing: "AI is reading fields and line items…",
		ready: "The invoice is ready for review.",
		items: "line items",
		warnings: "warnings",
		retry: "Try another file",
		invalid: "Choose a PDF, JPG, PNG, or WebP file.",
		failed: "The invoice could not be processed.",
		projectRequired:
			"Select a project in the top navigation before uploading the invoice.",
	};
}

const ACCEPTED_FILE_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

export function TgemInvoiceUpload({
	selectedProjectId,
	organizationLanguage,
	onInvoiceReady,
}: Props) {
	const copy = getUploadCopy(organizationLanguage);
	const inputId = React.useId();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [stage, setStage] = React.useState<UploadStage>("idle");
	const [progress, setProgress] = React.useState(0);
	const [fileName, setFileName] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [result, setResult] = React.useState<{
		lineItemCount: number;
		warningCount: number;
	} | null>(null);
	const [dragActive, setDragActive] = React.useState(false);
	const { startUpload } = useUploadThing("tgemInvoiceUploader", {
		uploadProgressGranularity: "fine",
		onUploadProgress: setProgress,
	});
	const busy = stage === "uploading" || stage === "processing";

	const reset = React.useCallback(() => {
		setStage("idle");
		setProgress(0);
		setFileName(null);
		setError(null);
		setResult(null);
		if (inputRef.current) inputRef.current.value = "";
	}, []);

	const processFile = React.useCallback(
		async (file: File | undefined) => {
			if (!file || busy) return;
			if (!selectedProjectId) {
				setStage("error");
				setError(copy.projectRequired);
				return;
			}
			if (!ACCEPTED_FILE_TYPES.has(file.type)) {
				setStage("error");
				setError(copy.invalid);
				return;
			}

			setFileName(file.name);
			setError(null);
			setResult(null);
			setProgress(0);
			setStage("uploading");

			try {
				const uploaded = await startUpload([file], {
					siteId: selectedProjectId,
				});
				const serverData = uploaded?.[0]?.serverData;
				if (!serverData?.invoiceCaseId || !serverData.documentId) {
					throw new Error(copy.failed);
				}

				setProgress(100);
				setStage("processing");
				const ocrResult = await runTgemInvoiceOcr({
					invoiceCaseId: serverData.invoiceCaseId,
					documentId: serverData.documentId,
				});
				if (!ocrResult) throw new Error(copy.failed);

				setResult({
					lineItemCount: ocrResult.lineItemCount,
					warningCount: ocrResult.warningCount,
				});
				await onInvoiceReady(serverData.invoiceCaseId, selectedProjectId);
				setStage("ready");
			} catch (uploadError) {
				setStage("error");
				setError(
					uploadError instanceof Error ? uploadError.message : copy.failed,
				);
			}
		},
		[
			busy,
			copy.failed,
			copy.invalid,
			copy.projectRequired,
			onInvoiceReady,
			selectedProjectId,
			startUpload,
		],
	);

	const stepState = (step: "uploading" | "processing" | "ready") => {
		const order = { uploading: 1, processing: 2, ready: 3 };
		const current = stage === "idle" || stage === "error" ? 0 : order[stage];
		return {
			active: stage === step,
			complete: current > order[step] || stage === "ready",
		};
	};

	return (
		<section
			aria-label={copy.title}
			className={`overflow-hidden rounded-lg border bg-white transition-colors dark:bg-card ${dragActive ? "border-tgem-primary bg-[#F1F6FF] dark:bg-tgem-primary/10" : "border-[#E1E6ED]"}`}
			onDragEnter={(event) => {
				event.preventDefault();
				if (!busy) setDragActive(true);
			}}
			onDragOver={(event) => event.preventDefault()}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					setDragActive(false);
				}
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDragActive(false);
				void processFile(event.dataTransfer.files[0]);
			}}
		>
			<div className="grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(28rem,1.3fr)]">
				<div className="flex items-start gap-4 border-b p-4 lg:border-r lg:border-b-0">
					<div
						data-testid="tgem-invoice-upload-icon"
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#F1F6FF] text-tgem-primary dark:bg-tgem-primary/15"
					>
						<FileUp className="h-5 w-5" />
					</div>
					<div className="min-w-0">
						<h2 className="font-semibold tracking-tight">{copy.title}</h2>
						<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
							{selectedProjectId ? copy.description : copy.projectRequired}
						</p>
					</div>
				</div>

				<div className="relative min-h-28 p-4">
					{stage === "idle" ? (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
							<div>
								<div className="text-sm font-medium">{copy.drop}</div>
								<div className="mt-1 text-xs text-muted-foreground">
									PDF · JPG · PNG · WEBP
								</div>
							</div>
							<label
								htmlFor={inputId}
								aria-disabled={!selectedProjectId}
								className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold shadow-sm transition focus-within:ring-2 focus-within:ring-tgem-primary/30 focus-within:ring-offset-2 ${selectedProjectId ? "cursor-pointer border-tgem-primary bg-tgem-primary text-white hover:border-tgem-primary-hover hover:bg-tgem-primary-hover" : "cursor-not-allowed border-border bg-muted text-muted-foreground"}`}
							>
								<FileUp className="h-4 w-4" />
								{copy.choose}
							</label>
						</div>
					) : (
						<div
							className="flex h-full flex-col justify-center gap-3"
							aria-live="polite"
						>
							<div className="flex items-center justify-between gap-3">
								<div className="flex min-w-0 items-center gap-2">
									{stage === "ready" ? (
										<Check className="h-4 w-4 shrink-0 text-[#159447]" />
									) : stage === "error" ? (
										<AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
									) : (
										<Loader2 className="h-4 w-4 shrink-0 animate-spin text-tgem-primary" />
									)}
									<span className="truncate text-sm font-medium">
										{fileName}
									</span>
								</div>
								{!busy ? (
									<button
										type="button"
										onClick={reset}
										className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-tgem-primary/10 hover:text-tgem-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
									>
										<RotateCcw className="h-3.5 w-3.5" />
										{copy.retry}
									</button>
								) : null}
							</div>

							<div className="grid grid-cols-3 gap-2">
								{[
									["uploading", copy.upload],
									["processing", copy.process],
									["ready", copy.review],
								].map(([step, label]) => {
									const state = stepState(
										step as "uploading" | "processing" | "ready",
									);
									return (
										<div key={step} className="min-w-0">
											<div
												className={`h-1 rounded-full ${state.complete ? "bg-[#159447]" : state.active ? "bg-tgem-primary" : "bg-muted"}`}
											/>
											<div className="mt-1 truncate text-[11px] text-muted-foreground">
												{label}
											</div>
										</div>
									);
								})}
							</div>

							{stage === "uploading" ? (
								<div className="text-xs text-muted-foreground">{progress}%</div>
							) : stage === "processing" ? (
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<FileSearch className="h-3.5 w-3.5" />
									{copy.processing}
								</div>
							) : stage === "ready" ? (
								<div className="text-xs text-[#159447] dark:text-emerald-400">
									{copy.ready} {result?.lineItemCount ?? 0} {copy.items} ·{" "}
									{result?.warningCount ?? 0} {copy.warnings}
								</div>
							) : (
								<div className="text-xs text-red-600">
									{error || copy.failed}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<input
				ref={inputRef}
				id={inputId}
				type="file"
				accept="application/pdf,image/jpeg,image/png,image/webp"
				disabled={busy || !selectedProjectId}
				className="sr-only"
				onChange={(event) => void processFile(event.target.files?.[0])}
			/>
		</section>
	);
}
