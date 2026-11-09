import { useState } from "react";
import { invokeLocalAction } from "./actions";
import { readFileDataUrl } from "./store";
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
					files.map(async (file) => ({
						name: file.name,
						url: await readFileDataUrl(file),
						ufsUrl: "",
						key: crypto.randomUUID(),
						size: file.size,
					})),
				);
				for (const file of uploaded) file.ufsUrl = file.url;
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
