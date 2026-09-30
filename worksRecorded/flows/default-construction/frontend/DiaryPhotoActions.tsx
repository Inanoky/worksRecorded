"use client";

import { CheckCircle2, Ellipsis, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useContext,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";

type PhotoActionProps = {
	siteId?: string | null;
	recordId?: string | null;
	language?: string;
	onUploaded?: (photos: string[]) => void;
};

const PhotoUploadContext = createContext<
	((target: PhotoActionProps) => void) | null
>(null);

export function DiaryPhotoUploadProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [target, setTarget] = useState<PhotoActionProps | null>(null);
	return (
		<PhotoUploadContext.Provider value={setTarget}>
			{children}
			{target ? (
				<PhotoUploadDialog target={target} onClose={() => setTarget(null)} />
			) : null}
		</PhotoUploadContext.Provider>
	);
}

function PhotoUploadDialog({
	target,
	onClose,
}: {
	target: PhotoActionProps;
	onClose: () => void;
}) {
	const router = useRouter();
	const input = useRef<HTMLInputElement>(null);
	const uploading = useRef(false);
	const uploadError = useRef<string | null>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [phase, setPhase] = useState<"ready" | "uploading" | "saved" | "error">(
		"ready",
	);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [errorCode, setErrorCode] = useState<string | null>(null);
	const lv = !target.language || target.language.startsWith("lv");
	const busy = phase === "uploading";
	const { startUpload } = useUploadThing("limeniDiaryPhotoUploader", {
		onUploadProgress: setProgress,
		onUploadError: (failure) => {
			uploadError.current = failure.code;
		},
	});

	async function upload() {
		if (
			uploading.current ||
			!files.length ||
			!target.siteId ||
			!target.recordId
		)
			return;
		uploading.current = true;
		uploadError.current = null;
		setPhase("uploading");
		setError(null);
		setProgress(0);
		try {
			const result = await startUpload(files, {
				siteId: target.siteId,
				recordId: target.recordId,
			});
			const confirmed = (result ?? []).filter(
				(file) =>
					file.serverData?.url &&
					normalizeDiaryPhotoUrls(file.serverData.photos).includes(
						file.serverData.url,
					),
			);
			const photos = normalizeDiaryPhotoUrls(
				confirmed.flatMap((file) => file.serverData.photos),
			);
			if (photos.length) target.onUploaded?.(photos);
			if (confirmed.length !== files.length)
				throw new Error("Attachment confirmation missing");
			setPhase("saved");
			toast.success(lv ? "Foto pievienoti." : "Photos added.");
		} catch {
			const message = lv
				? "Neizdevās apstiprināt visu foto pievienošanu. Daži foto, iespējams, ir saglabāti. Aizveriet šo logu un atjaunojiet ierakstus pirms atkārtota mēģinājuma."
				: "Could not confirm all photo attachments. Some photos may have been saved. Close this window and refresh the records before retrying.";
			setPhase("error");
			setError(message);
			setErrorCode(uploadError.current);
			toast.error(message);
		} finally {
			uploading.current = false;
			router.refresh();
		}
	}

	const status =
		phase === "saved"
			? lv
				? `Pievienoti ${files.length} foto.`
				: `${files.length} photos attached.`
			: progress >= 100
				? lv
					? "Saglabā foto pie ieraksta…"
					: "Attaching photos to the record…"
				: lv
					? `Augšupielādē ${files.length} foto… ${progress}%`
					: `Uploading ${files.length} photos… ${progress}%`;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !uploading.current) onClose();
			}}
		>
			<DialogContent
				showCloseButton={!busy}
				onEscapeKeyDown={(event) => {
					if (busy) event.preventDefault();
				}}
				onInteractOutside={(event) => {
					if (busy) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>{lv ? "Pievienot foto" : "Add photos"}</DialogTitle>
					<DialogDescription>
						{lv
							? "Līdz 10 attēliem, katrs līdz 16 MB. Foto tiks pievienoti izvēlētajam ierakstam."
							: "Up to 10 images, each up to 16 MB. Photos will be attached to the selected record."}
					</DialogDescription>
				</DialogHeader>
				<input
					ref={input}
					type="file"
					accept="image/*"
					multiple
					hidden
					disabled={phase !== "ready"}
					aria-label={lv ? "Izvēlēties foto" : "Choose photos"}
					onChange={(event) => {
						const selected = Array.from(event.target.files ?? []);
						event.target.value = "";
						if (!selected.length) return;
						if (
							selected.length > 10 ||
							selected.some(
								(file) =>
									!file.type.startsWith("image/") ||
									file.size > 16 * 1024 * 1024,
							)
						) {
							setError(
								lv
									? "Izvēlieties līdz 10 attēliem, katru līdz 16 MB."
									: "Select up to 10 images, each up to 16 MB.",
							);
							setFiles([]);
							return;
						}
						setFiles(selected);
						setError(null);
					}}
				/>
				{phase === "ready" ? (
					<Button variant="outline" onClick={() => input.current?.click()}>
						<ImagePlus className="h-4 w-4" aria-hidden="true" />
						{lv ? "Izvēlēties foto" : "Choose photos"}
					</Button>
				) : null}
				{files.length ? (
					<ul
						className="max-h-36 overflow-y-auto rounded-md border p-3 text-sm space-y-1"
						aria-label={lv ? "Izvēlētie foto" : "Selected photos"}
					>
						{files.map((file, index) => (
							<li key={`${file.name}-${index}`} className="break-all">
								{file.name}
							</li>
						))}
					</ul>
				) : null}
				{busy || phase === "saved" ? (
					<output
						className="block space-y-3 rounded-md bg-muted/50 p-4"
						aria-live="polite"
					>
						<span className="flex items-center gap-2 text-sm font-medium">
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
							) : (
								<CheckCircle2
									className="h-4 w-4 text-green-600"
									aria-hidden="true"
								/>
							)}
							{status}
						</span>
						{busy ? (
							<>
								<progress
									className="h-2 w-full accent-green-600"
									value={progress}
									max={100}
									aria-label={lv ? "Augšupielādes progress" : "Upload progress"}
								/>
								<span className="block text-xs text-muted-foreground">
									{lv
										? "Lūdzu, neaizveriet šo lapu. Gaidiet saglabāšanas apstiprinājumu."
										: "Please keep this page open until saving is confirmed."}
								</span>
							</>
						) : null}
					</output>
				) : null}
				{error ? (
					<div role="alert" className="text-sm text-destructive">
						{error}
						{errorCode ? (
							<p className="mt-2 text-xs">
								{lv ? "Kļūdas kods" : "Error code"}: {errorCode}
							</p>
						) : null}
					</div>
				) : null}
				<DialogFooter>
					{!busy ? (
						<Button variant="outline" onClick={onClose}>
							{phase === "ready"
								? lv
									? "Atcelt"
									: "Cancel"
								: lv
									? "Aizvērt"
									: "Close"}
						</Button>
					) : null}
					{phase === "ready" || busy ? (
						<Button
							disabled={busy || !files.length}
							onClick={() => void upload()}
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
							) : (
								<ImagePlus className="h-4 w-4" aria-hidden="true" />
							)}
							{busy
								? lv
									? "Pievieno foto…"
									: "Adding photos…"
								: lv
									? "Augšupielādēt"
									: "Upload"}
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DiaryPhotoUploadMenuItem(props: PhotoActionProps) {
	const open = useContext(PhotoUploadContext);
	if (!props.siteId || !props.recordId || !open) return null;
	return (
		<DropdownMenuItem onSelect={() => open(props)}>
			<ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
			{props.language?.startsWith("en") ? "Add photos" : "Pievienot foto"}
		</DropdownMenuItem>
	);
}

export function DiaryPhotoActions(props: PhotoActionProps) {
	if (!props.siteId || !props.recordId) return null;
	return (
		<DiaryPhotoUploadProvider>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label={
							props.language?.startsWith("en") ? "Actions" : "Darbības"
						}
					>
						<Ellipsis className="h-4 w-4" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DiaryPhotoUploadMenuItem {...props} />
				</DropdownMenuContent>
			</DropdownMenu>
		</DiaryPhotoUploadProvider>
	);
}
