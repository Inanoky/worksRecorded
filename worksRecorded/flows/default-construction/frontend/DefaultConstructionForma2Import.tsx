"use client";

import {
	CheckCircle2,
	FileSpreadsheet,
	Loader2,
	Trash2,
	Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	clearDefaultConstructionForma2Import,
	saveDefaultConstructionForma2Import,
} from "@/flows/default-construction/backend/forma2-analytics-actions";
import type { ParsedForma2Sheet } from "@/flows/default-construction/lib/forma2-analytics";
import { getForma2AnalyticsCopy } from "@/flows/default-construction/lib/forma2-analytics-copy";

type DocumentMetadata = {
	id: string;
	fileName: string;
	sheetName: string;
	importedAt: string;
	positionCount: number;
} | null;

type ImportProgress = {
	value: number;
	ceiling: number;
	label: string;
};

const progressDelay = (milliseconds: number) =>
	new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function DefaultConstructionForma2Import({
	siteId,
	organizationLanguage,
	document,
}: {
	siteId: string;
	organizationLanguage?: string | null;
	document: DocumentMetadata;
}) {
	const t = getForma2AnalyticsCopy(organizationLanguage);
	const router = useRouter();
	const sheetSelectId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [parsedSheets, setParsedSheets] = useState<ParsedForma2Sheet[]>([]);
	const [selectedSheetName, setSelectedSheetName] = useState("");
	const [selectedFileName, setSelectedFileName] = useState("");
	const [parsing, setParsing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [progress, setProgress] = useState<ImportProgress | null>(null);
	const selectedSheet = parsedSheets.find(
		(sheet) => sheet.sheetName === selectedSheetName,
	);

	useEffect(() => {
		if (!progress || progress.value >= progress.ceiling) return;
		const timer = window.setInterval(() => {
			setProgress((current) => {
				if (!current || current.value >= current.ceiling) return current;
				const remaining = current.ceiling - current.value;
				return {
					...current,
					value: Math.min(
						current.ceiling,
						current.value + Math.max(1, Math.ceil(remaining * 0.08)),
					),
				};
			});
		}, 600);
		return () => window.clearInterval(timer);
	}, [progress?.ceiling]);

	const handleFile = async (file: File | undefined) => {
		if (!file) return;
		setParsing(true);
		setProgress({ value: 5, ceiling: 90, label: t.uploadingAndAnalyzing });
		let completed = false;
		try {
			const formData = new FormData();
			formData.set("file", file);
			const response = await fetch(
				`/api/sites/${encodeURIComponent(siteId)}/forma2/extract`,
				{
					method: "POST",
					body: formData,
				},
			);
			const payload = (await response.json()) as {
				error?: string;
				sheets?: ParsedForma2Sheet[];
			};
			if (!response.ok) throw new Error(payload.error || t.parseError);
			const sheets = Array.isArray(payload.sheets) ? payload.sheets : [];
			if (!sheets.length) throw new Error(t.parseError);
			const preferred = [...sheets].sort(
				(left, right) => right.positions.length - left.positions.length,
			)[0];
			setSelectedFileName(file.name);
			setParsedSheets(sheets);
			setSelectedSheetName(preferred.sheetName);
			completed = true;
			setProgress({ value: 100, ceiling: 100, label: t.finishingImport });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.parseError);
			setParsedSheets([]);
			setSelectedSheetName("");
			setSelectedFileName("");
		} finally {
			if (completed) await progressDelay(350);
			setParsing(false);
			setProgress(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const importSelectedSheet = async () => {
		if (!selectedSheet) return;
		setSaving(true);
		setProgress({ value: 5, ceiling: 35, label: t.savingPositions });
		let completed = false;
		try {
			await saveDefaultConstructionForma2Import({
				siteId,
				fileName: selectedFileName,
				sheetName: selectedSheet.sheetName,
				positions: selectedSheet.positions,
			});
			setProgress({ value: 40, ceiling: 92, label: t.assigningRecords });
			let assignmentResult: {
				assignedRecords?: number;
				error?: string;
			} = {};
			let assignmentSucceeded = false;
			try {
				const assignmentResponse = await fetch(
					`/api/sites/${encodeURIComponent(siteId)}/forma2/auto-assign`,
					{ method: "POST" },
				);
				assignmentResult =
					(await assignmentResponse.json()) as typeof assignmentResult;
				assignmentSucceeded = assignmentResponse.ok;
			} catch {
				assignmentResult = {};
			}
			setParsedSheets([]);
			setSelectedSheetName("");
			setSelectedFileName("");
			completed = true;
			setProgress({ value: 100, ceiling: 100, label: t.finishingImport });
			router.refresh();
			if (assignmentSucceeded) {
				toast.success(
					t.importAndAssignmentSuccess(
						Number(assignmentResult.assignedRecords) || 0,
					),
				);
			} else {
				toast.warning(assignmentResult.error || t.assignmentWarning);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			if (completed) await progressDelay(350);
			setSaving(false);
			setProgress(null);
		}
	};

	const clearImport = async () => {
		if (!window.confirm(t.clearConfirm)) return;
		setSaving(true);
		try {
			await clearDefaultConstructionForma2Import(siteId);
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.saveError);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card>
			<CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<CardTitle className="flex items-center gap-2">
						<FileSpreadsheet className="size-5 text-emerald-600" />
						{t.importTitle}
					</CardTitle>
					<CardDescription className="mt-1">
						{t.importDescription}
					</CardDescription>
				</div>
				<div className="flex flex-wrap gap-2">
					<Input
						ref={fileInputRef}
						type="file"
						accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						className="hidden"
						onChange={(event) => handleFile(event.target.files?.[0])}
					/>
					<Button
						variant="outline"
						onClick={() => fileInputRef.current?.click()}
						disabled={parsing || saving}
					>
						{parsing ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Upload className="mr-2 size-4" />
						)}
						{parsing ? t.analyzing : document ? t.replaceFile : t.chooseFile}
					</Button>
					{document ? (
						<Button
							variant="ghost"
							className="text-destructive"
							onClick={clearImport}
							disabled={saving}
						>
							<Trash2 className="mr-2 size-4" />
							{t.clear}
						</Button>
					) : null}
				</div>
			</CardHeader>
			<CardContent>
				{progress ? (
					<div className="mb-4 rounded-lg border bg-muted/30 p-4">
						<div className="mb-2 flex items-center justify-between gap-4 text-sm">
							<span className="font-medium">{progress.label}</span>
							<span className="font-semibold tabular-nums">
								{Math.round(progress.value)}%
							</span>
						</div>
						<div
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(progress.value)}
							aria-label={progress.label}
							className="h-2 overflow-hidden rounded-full bg-muted"
						>
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
								style={{ width: `${progress.value}%` }}
							/>
						</div>
					</div>
				) : null}
				{selectedSheet ? (
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
							<div className="space-y-2">
								<div className="font-medium">{selectedFileName}</div>
								<label
									htmlFor={sheetSelectId}
									className="block text-xs font-medium text-muted-foreground"
								>
									{t.detectedSheet}
								</label>
								<select
									id={sheetSelectId}
									value={selectedSheetName}
									onChange={(event) => setSelectedSheetName(event.target.value)}
									className="h-9 min-w-56 rounded-md border bg-background px-3 text-sm"
								>
									{parsedSheets.map((sheet) => (
										<option key={sheet.sheetName} value={sheet.sheetName}>
											{sheet.sheetName} · {sheet.positions.length} {t.positions}
										</option>
									))}
								</select>
							</div>
							<Button onClick={importSelectedSheet} disabled={saving}>
								{saving ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<CheckCircle2 className="mr-2 size-4" />
								)}
								{saving ? t.importing : t.import}
							</Button>
						</div>
					</div>
				) : document ? (
					<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-4">
						<Badge variant="secondary">{t.imported}</Badge>
						<span className="font-medium">{document.fileName}</span>
						<span className="text-sm text-muted-foreground">
							{document.sheetName} · {document.positionCount} {t.positions}
						</span>
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
						{t.noDocument}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
