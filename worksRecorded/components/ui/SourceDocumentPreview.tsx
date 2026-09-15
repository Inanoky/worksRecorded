"use client";

import { FileText } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function SourceDocumentPreview({
	url,
	label,
}: {
	url: string;
	label: string;
}) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	return failedUrl === url ? (
		<span
			role="img"
			aria-label={label}
			className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"
		>
			<FileText className="size-6" aria-hidden="true" />
		</span>
	) : (
		<Image
			src={url}
			alt={label}
			fill
			sizes="135px"
			className="object-contain"
			unoptimized
			onError={() => setFailedUrl(url)}
		/>
	);
}
