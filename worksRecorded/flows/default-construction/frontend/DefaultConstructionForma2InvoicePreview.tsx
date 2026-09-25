"use client";

import { ExternalLink, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DefaultConstructionForma2PdfPreview } from "./DefaultConstructionForma2PdfPreview";

export function DefaultConstructionForma2InvoicePreview({
	url,
	title,
	isLatvian,
	onClose,
}: {
	url: string;
	title: string;
	isLatvian: boolean;
	onClose: () => void;
}) {
	const [document, setDocument] = useState(/\.pdf(?:[?#]|$)/i.test(url));
	const [loading, setLoading] = useState(true);
	const heading = isLatvian ? "Rēķina priekšskatījums" : "Invoice preview";
	return (
		<section
			aria-label={heading}
			className="flex min-h-[440px] min-w-0 flex-col border-t bg-muted/30 xl:min-h-0 xl:border-t-0 xl:border-l"
		>
			<div className="flex items-center justify-between gap-2 border-b bg-background px-4 py-3">
				<div className="min-w-0">
					<h3 className="text-sm font-medium">{heading}</h3>
					<p className="truncate text-xs text-muted-foreground" title={title}>
						{title}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button asChild variant="ghost" size="icon">
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={
								isLatvian
									? "Atvērt oriģinālu jaunā cilnē"
									: "Open original in new tab"
							}
						>
							<ExternalLink className="size-4" />
						</a>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label={isLatvian ? "Aizvērt priekšskatījumu" : "Close preview"}
					>
						<X className="size-4" />
					</Button>
				</div>
			</div>
			<div className="relative min-h-[360px] flex-1">
				{loading && !document ? (
					<output className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/80">
						<Loader2 className="size-5 animate-spin" />
						<span className="sr-only">
							{isLatvian ? "Ielādē rēķinu" : "Loading invoice"}
						</span>
					</output>
				) : null}
				{document ? (
					<DefaultConstructionForma2PdfPreview
						url={url}
						title={title}
						isLatvian={isLatvian}
					/>
				) : (
					<Image
						src={url}
						alt={title}
						fill
						unoptimized
						sizes="(min-width: 1280px) 45vw, 100vw"
						className="object-contain p-3"
						onLoad={() => setLoading(false)}
						onError={() => setDocument(true)}
					/>
				)}
			</div>
		</section>
	);
}
