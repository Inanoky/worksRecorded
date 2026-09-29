"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";
import { DiaryRecordPhotos } from "./DiaryRecordPhotos";

export function EditableDiaryRecordPhotos({
	photos,
	siteId,
	recordId,
	language = "lv",
}: {
	photos: unknown;
	siteId?: string | null;
	recordId?: string | null;
	language?: string;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [added, setAdded] = useState<string[]>([]);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const lv = language.startsWith("lv");
	const { startUpload } = useUploadThing("limeniDiaryPhotoUploader", {
		onUploadProgress: setProgress,
		onClientUploadComplete: (files) => {
			setAdded((current) =>
				normalizeDiaryPhotoUrls([
					...current,
					...files.flatMap((file) => file.serverData.photos),
				]),
			);
		},
	});
	async function upload(files: File[]) {
		if (busy || !files.length || !siteId || !recordId) return;
		setError(null);
		if (
			files.length > 10 ||
			files.some(
				(file) =>
					!file.type.startsWith("image/") || file.size > 16 * 1024 * 1024,
			)
		) {
			setError(
				lv
					? "Izvēlieties līdz 10 attēliem, katru līdz 16 MB."
					: "Select up to 10 images, each up to 16 MB.",
			);
			return;
		}
		setBusy(true);
		setProgress(0);
		try {
			const result = await startUpload(files, { siteId, recordId });
			if (!result) throw new Error("Upload failed");
			setAdded((current) =>
				normalizeDiaryPhotoUrls([
					...current,
					...result.flatMap((file) => file.serverData.photos),
				]),
			);
		} catch {
			setError(
				lv
					? "Neizdevās pievienot visus foto. Pārlādējiet ierakstu un pārbaudiet pievienotos foto pirms atkārtota mēģinājuma."
					: "Could not attach all photos. Reload the record and check attached photos before retrying.",
			);
		} finally {
			setBusy(false);
		}
	}
	if (!siteId || !recordId)
		return <DiaryRecordPhotos photos={photos} language={language} />;
	return (
		<div className="min-w-0 space-y-2">
			<DiaryRecordPhotos
				photos={normalizeDiaryPhotoUrls([
					...normalizeDiaryPhotoUrls(photos),
					...added,
				])}
				language={language}
			/>
			<input
				ref={input}
				type="file"
				accept="image/*"
				multiple
				className="sr-only"
				tabIndex={-1}
				aria-label={lv ? "Izvēlēties foto" : "Choose photos"}
				disabled={busy}
				onChange={(event) => {
					const files = Array.from(event.target.files ?? []);
					event.target.value = "";
					void upload(files);
				}}
			/>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={busy}
				aria-busy={busy}
				onClick={() => input.current?.click()}
			>
				{busy
					? `${lv ? "Pievieno" : "Uploading"} ${progress}%`
					: lv
						? "Pievienot foto"
						: "Add photos"}
			</Button>
			{busy ? <output className="sr-only">{progress}%</output> : null}
			{error ? (
				<p role="alert" className="text-xs text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
