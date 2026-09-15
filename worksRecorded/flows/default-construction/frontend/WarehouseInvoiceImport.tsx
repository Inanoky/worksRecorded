"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import {
	validateWarehouseImportFiles,
	WAREHOUSE_IMPORT_TYPES,
} from "../warehouse-import";
import { importWarehouseInvoice } from "./warehouse-import-client";

const translations = {
	lv: {
		title: "Importēt rēķinus",
		description:
			"Līdz 20 dokumentiem vienā reizē. PDF, JPG, PNG vai WebP, līdz 16 MB katram. Pozīcijas tiks pievienotas Noliktavai, nevis nosūtītas uz BIS.",
		choose: "Izvēlēties dokumentus",
		start: "Importēt",
		retry: "Atkārtot neizdevušos",
		clear: "Notīrīt",
		queued: "Gaida",
		uploading: "Augšupielāde",
		processing: "Nolasa pozīcijas",
		done: "Importēts",
		duplicate: "Jau importēts",
		failed: "Neizdevās",
		items: "pozīcijas",
		keepOpen: "Apstrādes laikā neaizveriet šo lapu.",
		original: "Oriģināls",
		file_count: "Izvēlieties no 1 līdz 20 dokumentiem.",
		file_type: "Atļauti tikai PDF, JPG, PNG un WebP faili.",
		file_size: "Katram failam jābūt no 1 baita līdz 16 MB.",
		access:
			"Nav piekļuves projektam vai augšupielāde ir novecojusi. Izvēlieties failus vēlreiz.",
		empty: "Dokumentā nav nolasāmu rēķina pozīciju.",
		error: "Importēšana neizdevās. Mēģiniet vēlreiz.",
	},
	en: {
		title: "Import invoices",
		description:
			"Up to 20 documents at a time. PDF, JPG, PNG or WebP, up to 16 MB each. Line items are added to the warehouse, not sent to BIS.",
		choose: "Choose documents",
		start: "Import",
		retry: "Retry failed",
		clear: "Clear",
		queued: "Waiting",
		uploading: "Uploading",
		processing: "Reading line items",
		done: "Imported",
		duplicate: "Already imported",
		failed: "Failed",
		items: "line items",
		keepOpen: "Keep this page open while processing.",
		original: "Original",
		file_count: "Choose between 1 and 20 documents.",
		file_type: "Only PDF, JPG, PNG and WebP files are supported.",
		file_size: "Each file must be between 1 byte and 16 MB.",
		access: "Project access denied or upload expired. Select the files again.",
		empty: "No readable invoice line items were found.",
		error: "Import failed. Please try again.",
	},
	ru: {
		title: "Импорт счетов",
		description:
			"До 20 документов за раз. PDF, JPG, PNG или WebP, до 16 МБ каждый. Позиции добавляются на склад, но не отправляются в BIS.",
		choose: "Выбрать документы",
		start: "Импортировать",
		retry: "Повторить неудавшиеся",
		clear: "Очистить",
		queued: "Ожидание",
		uploading: "Загрузка",
		processing: "Чтение позиций",
		done: "Импортировано",
		duplicate: "Уже импортировано",
		failed: "Ошибка",
		items: "позиций",
		keepOpen: "Не закрывайте страницу во время обработки.",
		original: "Оригинал",
		file_count: "Выберите от 1 до 20 документов.",
		file_type: "Поддерживаются только PDF, JPG, PNG и WebP.",
		file_size: "Размер каждого файла: от 1 байта до 16 МБ.",
		access:
			"Нет доступа к проекту или загрузка устарела. Выберите файлы заново.",
		empty: "Не найдены читаемые позиции счета.",
		error: "Ошибка импорта. Повторите попытку.",
	},
};

type Entry = {
	file: File;
	status:
		| "queued"
		| "uploading"
		| "processing"
		| "done"
		| "duplicate"
		| "failed";
	receipt?: string;
	url?: string;
	count?: number;
	error?: string;
};

export function WarehouseInvoiceImport({
	siteId,
	organizationLanguage,
}: {
	siteId: string;
	organizationLanguage?: string | null;
}) {
	const copy =
		translations[
			organizationLanguage === "en" || organizationLanguage === "ru"
				? organizationLanguage
				: "lv"
		];
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const busyRef = useRef(false);
	const router = useRouter();
	const [entries, setEntries] = useState<Entry[]>([]);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const { startUpload } = useUploadThing("warehouseInvoiceUploader", {
		onUploadProgress: setProgress,
		uploadProgressGranularity: "fine",
	});

	useEffect(() => {
		if (!busy) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [busy]);

	function selectFiles(files: File[]) {
		if (busyRef.current) return;
		const issue = validateWarehouseImportFiles(files);
		if (issue) {
			setError(copy[issue]);
			return;
		}
		setError(null);
		setEntries(files.map((file) => ({ file, status: "queued" })));
	}

	async function runImport() {
		if (busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		setProgress(0);
		const queue = entries.map((entry) => ({ ...entry }));
		const pending = queue.filter(
			(entry) => entry.status === "queued" || entry.status === "failed",
		);
		const publish = () => setEntries(queue.map((entry) => ({ ...entry })));
		try {
			const toUpload = pending.filter((entry) => !entry.receipt);
			if (toUpload.length) {
				toUpload.forEach((entry) => {
					entry.status = "uploading";
					entry.error = undefined;
				});
				publish();
				try {
					const result = await startUpload(
						toUpload.map((entry) => entry.file),
						{ siteId },
					);
					toUpload.forEach((entry, index) => {
						const uploaded = result?.[index];
						entry.receipt = uploaded?.serverData?.receipt;
						entry.url = uploaded?.ufsUrl;
						entry.status = entry.receipt ? "queued" : "failed";
						if (!entry.receipt) entry.error = copy.error;
					});
				} catch (uploadError) {
					const accessDenied =
						typeof uploadError === "object" &&
						uploadError !== null &&
						"code" in uploadError &&
						(uploadError.code === "FORBIDDEN" ||
							uploadError.code === "UNAUTHORIZED");
					toUpload.forEach((entry) => {
						entry.status = "failed";
						entry.error = accessDenied ? copy.access : copy.error;
					});
				}
				publish();
			}
			await Promise.all(
				pending.map(async (entry) => {
					if (!entry.receipt) return;
					entry.status = "processing";
					entry.error = undefined;
					publish();
					try {
						const result = await importWarehouseInvoice(entry.receipt);
						if (!result.ok) {
							entry.status = "failed";
							entry.error =
								result.error === "processing" ? copy.error : copy[result.error];
						} else {
							entry.status = result.duplicate ? "duplicate" : "done";
							entry.count = result.count;
						}
					} catch {
						entry.status = "failed";
						entry.error = copy.error;
					}
					publish();
				}),
			);
		} finally {
			busyRef.current = false;
			setBusy(false);
			router.refresh();
		}
	}

	const completed = entries.filter(
		(entry) => entry.status === "done" || entry.status === "duplicate",
	).length;
	const canImport = entries.some(
		(entry) => entry.status === "queued" || entry.status === "failed",
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<FileUp className="size-4" aria-hidden="true" />
					{copy.title}
				</CardTitle>
				<p className="text-sm text-muted-foreground">{copy.description}</p>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<div className="min-w-0 flex-1 space-y-1">
						<label htmlFor={inputId} className="text-sm font-medium">
							{copy.choose}
						</label>
						<Input
							ref={inputRef}
							id={inputId}
							type="file"
							multiple
							accept={WAREHOUSE_IMPORT_TYPES.join(",")}
							disabled={busy}
							onChange={(event) =>
								selectFiles(Array.from(event.target.files ?? []))
							}
						/>
					</div>
					<Button
						type="button"
						disabled={busy || !canImport}
						onClick={() => void runImport()}
					>
						{busy ? (
							<Loader2
								className="mr-2 size-4 animate-spin"
								aria-hidden="true"
							/>
						) : null}
						{entries.some((entry) => entry.status === "failed")
							? copy.retry
							: copy.start}
					</Button>
					{entries.length ? (
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							onClick={() => {
								setEntries([]);
								setError(null);
								if (inputRef.current) inputRef.current.value = "";
							}}
						>
							{copy.clear}
						</Button>
					) : null}
				</div>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
				{entries.length ? (
					<div className="space-y-2" aria-live="polite" aria-atomic="false">
						<p className="text-sm text-muted-foreground">
							{completed}/{entries.length} {copy.done.toLowerCase()}
							{busy ? ` · ${copy.keepOpen}` : ""}
						</p>
						{entries.some((entry) => entry.status === "uploading") ? (
							<div className="flex items-center gap-2">
								<progress
									className="h-2 min-w-0 flex-1"
									value={progress}
									max={100}
									aria-label={copy.uploading}
								/>
								<span className="text-xs">{progress}%</span>
							</div>
						) : null}
						<ul className="max-h-96 divide-y overflow-y-auto rounded-md border">
							{entries.map((entry, index) => (
								<li
									key={`${index}-${entry.file.name}`}
									className="flex min-w-0 flex-col gap-1 p-3 text-sm sm:flex-row sm:justify-between sm:gap-4"
								>
									<div className="min-w-0">
										<p className="break-all font-medium">{entry.file.name}</p>
										<span className="text-xs text-muted-foreground">
											{(entry.file.size / 1024 / 1024).toFixed(2)} MB
										</span>
										{entry.url ? (
											<a
												className="ml-3 text-xs underline"
												href={entry.url}
												target="_blank"
												rel="noopener noreferrer"
											>
												{copy.original}
											</a>
										) : null}
									</div>
									<div
										className={
											entry.status === "failed"
												? "text-destructive"
												: "text-muted-foreground"
										}
									>
										<p>
											{copy[entry.status]}
											{entry.count !== undefined
												? ` · ${entry.count} ${copy.items}`
												: ""}
										</p>
										{entry.error ? (
											<p className="max-w-md text-xs">{entry.error}</p>
										) : null}
									</div>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
