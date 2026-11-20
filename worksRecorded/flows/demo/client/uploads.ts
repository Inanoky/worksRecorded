import { createElement, useState } from "react";
import { invokeLocalAction } from "./actions";
import { readFileDataUrl } from "./store";
import { readWarehouseSampleUpload } from "./warehouse";
export function useUploadThing(
	endpoint: string,
	options?: {
		onUploadBegin?: () => void;
		onClientUploadComplete?: (files: any[]) => void;
		onUploadError?: (error: Error) => void;
		onUploadProgress?: (progress: number) => void;
	},
) {
	const [isUploading, setUploading] = useState(false);
	return {
		isUploading,
		startUpload: async (files: File[], input?: unknown) => {
			setUploading(true);
			options?.onUploadBegin?.();
			try {
				const uploaded = await Promise.all(
					files.map(async (file) => {
						const invoice =
							endpoint === "warehouseInvoiceUploader"
								? await readWarehouseSampleUpload(file)
								: undefined;
						const url = invoice ? invoice.url : await readFileDataUrl(file);
						return {
							name: file.name,
							type: file.type,
							url,
							ufsUrl: url,
							key: crypto.randomUUID(),
							size: file.size,
							serverData: invoice ? { receipt: invoice.receipt } : undefined,
						};
					}),
				);
				if (endpoint.includes("DiaryPhoto")) {
					const photos = await invokeLocalAction("", "attachLocalPhotos", [
						input,
						uploaded,
					]);
					for (const file of uploaded)
						(file as any).serverData = { url: file.url, photos };
				}
				options?.onUploadProgress?.(100);
				options?.onClientUploadComplete?.(uploaded);
				return uploaded;
			} catch (error) {
				options?.onUploadError?.(error as Error);
				throw error;
			} finally {
				setUploading(false);
			}
		},
	};
}

export function UploadButton({
	endpoint,
	appearance,
	content,
	onClientUploadComplete,
}: {
	endpoint: string;
	appearance?: { button?: string };
	content?: { button?: string };
	onClientUploadComplete?: (files: any[]) => void;
}) {
	const [error, setError] = useState("");
	const { startUpload, isUploading } = useUploadThing(endpoint, {
		onClientUploadComplete,
	});
	return createElement(
		"label",
		{
			className: `flex cursor-pointer items-center justify-center rounded border p-2 text-center ${appearance?.button ?? ""}`,
		},
		isUploading ? "Augšupielādē…" : error || content?.button || "Augšupielādēt",
		createElement("input", {
			type: "file",
			className: "sr-only",
			accept:
				endpoint === "imageUploader" ? "image/*" : "image/*,application/pdf",
			disabled: isUploading,
			onChange: async (event: React.ChangeEvent<HTMLInputElement>) => {
				const input = event.currentTarget;
				const file = input.files?.[0];
				input.value = "";
				if (!file) return;
				setError("");
				if (file.size > 1024 * 1024) {
					setError("Izvēlieties failu līdz 1 MB.");
					return;
				}
				try {
					await startUpload([file]);
				} catch {
					setError("Neizdevās pievienot failu.");
				}
			},
		}),
	);
}
