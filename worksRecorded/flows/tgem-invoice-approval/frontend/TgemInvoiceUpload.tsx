"use client";

import {
	AlertCircle,
	Check,
	FileSearch,
	FileText,
	FileUp,
	Loader2,
	RotateCcw,
	X,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { getTgemInvoiceProcessingStatus } from "@/server/actions/tgem-invoice-actions";
import { submitTgemWebInvoicePackage } from "@/server/actions/tgem-invoice-package-actions";

type UploadStage =
	| "idle"
	| "selected"
	| "uploading"
	| "processing"
	| "ready"
	| "error";

type Props = {
	selectedProjectId?: string | null;
	organizationLanguage?: string | null;
	onInvoiceReady: (invoiceCaseId: string, projectId: string) => Promise<void>;
};

function getUploadCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Iesniegt rēķinu",
			description:
				"Līdz 10 PDF, JPG, PNG vai WebP failiem; katrs līdz 16 MB, kopā līdz 32 MB.",
			together: "Viens rēķins ar pielikumiem (piemēram, čeku)",
			separate: "Katrs fails ir atsevišķs rēķins",
			limits: "Atļauti līdz 10 failiem, katrs līdz 16 MB, kopā līdz 32 MB.",
			choose: "Izvēlieties rēķinu",
			drop: "vai ievelciet failus šeit",
			selectedFiles: "Izvēlētie faili",
			addFiles: "Pievienot failus",
			removeFile: "Noņemt failu",
			previewImage: "Priekšskatīt attēlu",
			closePreview: "Aizvērt priekšskatījumu",
			grouping: "Kā apstrādāt dokumentus?",
			selectionHint:
				"Pārbaudiet failus un izvēlieties apstrādes veidu. Augšupielāde sāksies tikai pēc pogas nospiešanas.",
			startUpload: "Augšupielādēt",
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
			description:
				"До 10 PDF, JPG, PNG или WebP; каждый до 16 МБ, всего до 32 МБ.",
			together: "Один счет с приложениями (например, чеком)",
			separate: "Каждый файл — отдельный счет",
			limits: "До 10 файлов, каждый до 16 МБ, всего до 32 МБ.",
			choose: "Выбрать счет",
			drop: "или перетащите файлы сюда",
			selectedFiles: "Выбранные файлы",
			addFiles: "Добавить файлы",
			removeFile: "Удалить файл",
			previewImage: "Просмотреть изображение",
			closePreview: "Закрыть просмотр",
			grouping: "Как обработать документы?",
			selectionHint:
				"Проверьте файлы и выберите способ обработки. Загрузка начнется только после нажатия кнопки.",
			startUpload: "Загрузить",
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
		description:
			"Up to 10 PDF, JPG, PNG, or WebP files; 16 MB each, 32 MB total.",
		together: "One invoice with attachments (such as a receipt)",
		separate: "Each file is a separate invoice",
		limits: "Up to 10 files, 16 MB each and 32 MB total.",
		choose: "Choose invoice",
		drop: "or drop files here",
		selectedFiles: "Selected files",
		addFiles: "Add files",
		removeFile: "Remove file",
		previewImage: "Preview image",
		closePreview: "Close preview",
		grouping: "How should these documents be processed?",
		selectionHint:
			"Review the files and choose how to process them. Uploading starts only when you press Upload.",
		startUpload: "Upload",
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

function SelectedImagePreview({
	file,
	copy,
}: {
	file: File;
	copy: { previewImage: string; closePreview: string };
}) {
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (typeof URL.createObjectURL !== "function") return;
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	if (!previewUrl) {
		return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<button
					type="button"
					aria-label={`${copy.previewImage}: ${file.name}`}
					title={`${copy.previewImage}: ${file.name}`}
					className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
				>
					<Image
						src={previewUrl}
						alt={file.name}
						width={56}
						height={56}
						unoptimized
						className="h-full w-full object-contain"
					/>
				</button>
			</DialogTrigger>
			<DialogContent
				aria-describedby={undefined}
				showCloseButton={false}
				className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl"
			>
				<DialogTitle className="min-w-0 break-all pr-8 text-left text-sm leading-5">
					{file.name}
				</DialogTitle>
				<DialogClose asChild>
					<button
						type="button"
						aria-label={copy.closePreview}
						className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
					>
						<X className="h-4 w-4" />
					</button>
				</DialogClose>
				<div className="relative h-[65dvh] min-w-0">
					<Image
						src={previewUrl}
						alt={file.name}
						fill
						unoptimized
						className="object-contain"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function getFileSelectionError(
	files: File[],
	copy: ReturnType<typeof getUploadCopy>,
) {
	if (files.some((file) => !ACCEPTED_FILE_TYPES.has(file.type))) {
		return copy.invalid;
	}
	if (
		files.length > 10 ||
		files.some((file) => file.size > 16 * 1024 * 1024) ||
		files.reduce((sum, file) => sum + file.size, 0) > 32 * 1024 * 1024
	) {
		return copy.limits;
	}
	return null;
}

export function TgemInvoiceUpload({
	selectedProjectId,
	organizationLanguage,
	onInvoiceReady,
}: Props) {
	const copy = getUploadCopy(organizationLanguage);
	const inputId = React.useId();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [stage, setStage] = React.useState<UploadStage>("idle");
	const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
	const [progress, setProgress] = React.useState(0);
	const [fileName, setFileName] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [result, setResult] = React.useState<{
		lineItemCount: number;
		warningCount: number;
	} | null>(null);
	const [dragActive, setDragActive] = React.useState(false);
	const [mode, setMode] = React.useState<"together" | "separate">("together");
	const pendingDraftId = React.useRef<string | null>(null);
	const pendingFiles = React.useRef<File[]>([]);
	const pendingProjectId = React.useRef<string | null>(null);
	const uploadInFlight = React.useRef(false);
	const { startUpload: startPackageUpload } = useUploadThing(
		"tgemInvoicePackageUploader",
		{
			uploadProgressGranularity: "fine",
			onUploadProgress: setProgress,
		},
	);
	const { startUpload } = useUploadThing("tgemInvoiceUploader", {
		uploadProgressGranularity: "fine",
		onUploadProgress: setProgress,
	});
	const busy = stage === "uploading" || stage === "processing";
	const selecting = stage === "idle" || stage === "selected";

	const reset = React.useCallback(() => {
		setStage("idle");
		setSelectedFiles([]);
		setProgress(0);
		setFileName(null);
		setError(null);
		setResult(null);
		pendingDraftId.current = null;
		pendingFiles.current = [];
		pendingProjectId.current = null;
		if (inputRef.current) inputRef.current.value = "";
	}, []);

	const selectFiles = (files: File[]) => {
		if (!selecting || !files.length) return;
		if (!selectedProjectId) {
			setError(copy.projectRequired);
			return;
		}
		const nextFiles = [...selectedFiles];
		for (const file of files) {
			if (
				!nextFiles.some(
					(selected) =>
						selected.name === file.name &&
						selected.type === file.type &&
						selected.size === file.size &&
						selected.lastModified === file.lastModified,
				)
			) {
				nextFiles.push(file);
			}
		}
		const selectionError = getFileSelectionError(nextFiles, copy);
		if (selectionError) {
			setError(selectionError);
			return;
		}
		setSelectedFiles(nextFiles);
		setError(null);
		setStage("selected");
	};

	const processFile = React.useCallback(
		async (files: File[], resume = false) => {
			const file = files[0];
			if (!file || busy || uploadInFlight.current) return;
			const projectId = resume ? pendingProjectId.current : selectedProjectId;
			if (!projectId) {
				setStage("error");
				setError(copy.projectRequired);
				return;
			}
			const selectionError = getFileSelectionError(files, copy);
			if (selectionError) {
				setStage("error");
				setError(selectionError);
				return;
			}

			uploadInFlight.current = true;
			setFileName(files.map((item) => item.name).join(", "));
			setError(null);
			setResult(null);
			setProgress(0);
			setStage("uploading");
			if (!resume) {
				pendingDraftId.current = null;
				pendingFiles.current = files;
				pendingProjectId.current = projectId;
			}

			try {
				let invoices: Array<{ invoiceCaseId: string; documentId?: string }>;
				if (files.length > 1) {
					if (!pendingDraftId.current) {
						const uploaded = await startPackageUpload(files, {
							siteId: projectId,
						});
						const draftId = uploaded?.[0]?.serverData?.draftId;
						if (
							!draftId ||
							uploaded?.length !== files.length ||
							uploaded.some((item) => item.serverData?.draftId !== draftId)
						)
							throw new Error(copy.failed);
						pendingDraftId.current = draftId;
					}
					const draftId = pendingDraftId.current;
					invoices = await submitTgemWebInvoicePackage({ draftId, mode });
				} else {
					const uploaded = await startUpload([file], {
						siteId: projectId,
					});
					const data = uploaded?.[0]?.serverData;
					invoices = data ? [data] : [];
				}
				if (
					!invoices.length ||
					invoices.some((item) => !item.invoiceCaseId || !item.documentId)
				) {
					throw new Error(copy.failed);
				}

				setProgress(100);
				setStage("processing");
				const results = await Promise.all(
					invoices.map(async (serverData) => {
						let ocrResult: Awaited<
							ReturnType<typeof getTgemInvoiceProcessingStatus>
						> = null;
						for (let attempt = 0; attempt < 80; attempt += 1) {
							ocrResult = await getTgemInvoiceProcessingStatus({
								invoiceCaseId: serverData.invoiceCaseId,
								documentId: serverData.documentId as string,
							});
							if (
								ocrResult &&
								!["received", "processing"].includes(ocrResult.status)
							) {
								break;
							}
							await new Promise((resolve) => setTimeout(resolve, 1_500));
						}
						if (!ocrResult || ocrResult.status === "failed_processing") {
							throw new Error(ocrResult?.processingError || copy.failed);
						}
						if (["received", "processing"].includes(ocrResult.status)) {
							throw new Error(copy.failed);
						}
						return ocrResult;
					}),
				);

				setResult({
					lineItemCount: results.reduce(
						(sum, item) => sum + item.lineItemCount,
						0,
					),
					warningCount: results.reduce(
						(sum, item) => sum + item.warningCount,
						0,
					),
				});
				await onInvoiceReady(invoices[0].invoiceCaseId, projectId);
				setStage("ready");
			} catch (uploadError) {
				setStage("error");
				setError(
					uploadError instanceof Error ? uploadError.message : copy.failed,
				);
			} finally {
				uploadInFlight.current = false;
			}
		},
		[
			busy,
			copy,
			mode,
			startPackageUpload,
			onInvoiceReady,
			selectedProjectId,
			startUpload,
		],
	);

	const stepState = (step: "uploading" | "processing" | "ready") => {
		const order = { uploading: 1, processing: 2, ready: 3 };
		const current =
			stage === "idle" || stage === "selected" || stage === "error"
				? 0
				: order[stage];
		return {
			active: stage === step,
			complete: current > order[step] || stage === "ready",
		};
	};

	return (
		<section
			aria-label={copy.title}
			className={`min-w-0 w-full overflow-hidden rounded-lg border bg-white transition-colors dark:bg-card ${dragActive ? "border-tgem-primary bg-[#F1F6FF] dark:bg-tgem-primary/10" : "border-[#E1E6ED]"}`}
			onDragEnter={(event) => {
				event.preventDefault();
				if (selecting && selectedProjectId) setDragActive(true);
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
				selectFiles(Array.from(event.dataTransfer.files));
			}}
		>
			<div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
				<div className="flex min-w-0 items-start gap-4 border-b p-4 lg:border-r lg:border-b-0">
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

				<div className="relative flex min-h-28 min-w-0 flex-col gap-4 p-4">
					{stage === "selected" ? (
						<div className="grid min-w-0 gap-2">
							<p className="text-sm font-medium">
								{copy.selectedFiles} ({selectedFiles.length}/10)
							</p>
							<ul
								aria-label={copy.selectedFiles}
								className="grid min-w-0 gap-1.5"
							>
								{selectedFiles.map((file, index) => (
									<li
										key={`${file.name}-${file.size}-${file.lastModified}`}
										className="flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2"
									>
										{file.type.startsWith("image/") ? (
											<SelectedImagePreview file={file} copy={copy} />
										) : (
											<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
										)}
										<span
											className="min-w-0 flex-1 truncate text-sm"
											title={file.name}
										>
											{file.name}
										</span>
										<button
											type="button"
											aria-label={`${copy.removeFile}: ${file.name}`}
											onClick={() => {
												const remaining = selectedFiles.filter(
													(_, itemIndex) => itemIndex !== index,
												);
												setSelectedFiles(remaining);
												setError(null);
												if (!remaining.length) setStage("idle");
											}}
											className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
										>
											<X className="h-4 w-4" />
										</button>
									</li>
								))}
							</ul>
							<p className="text-xs leading-5 text-muted-foreground">
								{copy.selectionHint}
							</p>
						</div>
					) : null}
					{stage === "selected" && selectedFiles.length > 1 ? (
						<fieldset className="flex min-w-0 w-full flex-col gap-2 text-xs">
							<legend className="mb-2 text-xs font-medium">
								{copy.grouping}
							</legend>
							{(
								[
									["together", copy.together],
									["separate", copy.separate],
								] as const
							).map(([value, label]) => (
								<label key={value} className="flex min-w-0 items-start gap-2">
									<input
										type="radio"
										className="mt-1 shrink-0"
										name={`${inputId}-mode`}
										value={value}
										checked={mode === value}
										onChange={() => setMode(value)}
									/>
									<span className="min-w-0 break-words leading-5">{label}</span>
								</label>
							))}
						</fieldset>
					) : null}
					{selecting ? (
						<div className="grid min-w-0 gap-3">
							<div className="flex min-w-0 flex-col items-start gap-3 text-left sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
								<div className="min-w-0">
									<div className="text-sm font-medium">{copy.drop}</div>
									<div className="mt-1 text-xs text-muted-foreground">
										PDF · JPG · PNG · WEBP
									</div>
								</div>
								<div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
									<label
										htmlFor={inputId}
										aria-disabled={!selectedProjectId}
										className={`inline-flex max-w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold shadow-sm transition focus-within:ring-2 focus-within:ring-tgem-primary/30 focus-within:ring-offset-2 ${!selectedProjectId ? "cursor-not-allowed border-border bg-muted text-muted-foreground" : stage === "selected" ? "cursor-pointer border-border hover:bg-muted" : "cursor-pointer border-tgem-primary bg-tgem-primary text-white hover:border-tgem-primary-hover hover:bg-tgem-primary-hover"}`}
									>
										<FileUp className="h-4 w-4 shrink-0" />
										<span className="min-w-0 break-words">
											{stage === "selected" ? copy.addFiles : copy.choose}
										</span>
									</label>
									{stage === "selected" ? (
										<button
											type="button"
											disabled={!selectedProjectId}
											onClick={() => void processFile(selectedFiles)}
											className="inline-flex max-w-full items-center justify-center gap-2 rounded-md bg-tgem-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-tgem-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
										>
											<FileUp className="h-4 w-4 shrink-0" />
											<span className="min-w-0 break-words">
												{copy.startUpload}
											</span>
										</button>
									) : null}
								</div>
							</div>
							{error ? (
								<p role="alert" className="break-words text-xs text-red-600">
									{error}
								</p>
							) : null}
						</div>
					) : (
						<div
							className="flex min-w-0 flex-col justify-center gap-3"
							aria-live="polite"
						>
							<div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
								<div className="flex min-w-0 flex-1 items-center gap-2">
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
										onClick={() => {
											if (stage === "error" && pendingDraftId.current)
												void processFile(pendingFiles.current, true);
											else reset();
										}}
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
								<div className="break-words text-xs text-red-600">
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
				multiple
				accept="application/pdf,image/jpeg,image/png,image/webp"
				disabled={!selecting || !selectedProjectId}
				className="sr-only"
				onChange={(event) => {
					selectFiles(Array.from(event.target.files ?? []));
					event.target.value = "";
				}}
			/>
		</section>
	);
}
