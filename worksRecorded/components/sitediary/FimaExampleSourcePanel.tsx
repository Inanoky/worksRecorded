"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatFimaDiaryNumber } from "@/lib/fima/diary-number";
import { getFimaExampleSource } from "@/server/actions/fima-diary-collaboration";

type Scope = Parameters<typeof getFimaExampleSource>[0];
type Props = Scope & { onClose: () => void };

export function FimaExampleSourcePanel({
	siteId,
	recordId,
	bisId,
	sourceRecordId,
	onClose,
}: Props) {
	const [request, setRequest] = useState<Scope>(() => ({
		siteId,
		recordId,
		bisId,
		sourceRecordId,
	}));
	const [source, setSource] = useState<Awaited<
		ReturnType<typeof getFimaExampleSource>
	> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	useEffect(() => {
		let active = true;
		setLoading(true);
		setError("");
		void getFimaExampleSource(request)
			.then((value) => {
				if (active) setSource(value);
			})
			.catch(() => {
				if (active)
					setError(
						"Neizdevās ielādēt KUCE avotu. Tas var būt mainīts vai vairs nav pieejams.",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [request]);
	return (
		<Dialog.Root
			open
			modal={false}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Content
					onInteractOutside={(event) => event.preventDefault()}
					className="fixed inset-y-0 right-0 z-[60] flex h-dvh w-full max-w-[calc(100%-1rem)] flex-col border-l bg-background shadow-2xl outline-none sm:w-[29rem] sm:max-w-[29rem]"
				>
					<header className="relative space-y-1 border-b px-5 py-4 pr-14">
						<Dialog.Title className="text-lg font-semibold">
							KUCE avots
						</Dialog.Title>
						<Dialog.Description className="text-sm text-muted-foreground">
							KUCE ieraksts, kas saistīts ar izvēlēto BIS paraugu.
						</Dialog.Description>
						<Dialog.Close asChild>
							<button
								type="button"
								aria-label="Aizvērt KUCE avotu"
								className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<X className="size-4" />
							</button>
						</Dialog.Close>
					</header>
					<div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
						{loading ? (
							<output className="text-sm text-muted-foreground">
								Ielādē KUCE avotu...
							</output>
						) : error ? (
							<div role="alert" className="space-y-3 text-sm text-destructive">
								<p>{error}</p>
								<Button
									variant="outline"
									onClick={() =>
										setRequest({ siteId, recordId, bisId, sourceRecordId })
									}
								>
									Mēģināt vēlreiz
								</Button>
							</div>
						) : source ? (
							<>
								<p className="font-semibold tabular-nums">
									{formatFimaDiaryNumber(source.fimaNumber)}
								</p>
								<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
									<dt className="text-muted-foreground">Projekts</dt>
									<dd>{source.Site?.name ?? "—"}</dd>
									<dt className="text-muted-foreground">Datums</dt>
									<dd>
										{source.Date
											? new Date(source.Date).toLocaleDateString("lv-LV", {
													timeZone: "Europe/Riga",
												})
											: "—"}
									</dd>
									<dt className="text-muted-foreground">Balsti / posms</dt>
									<dd>{source.Location || "—"}</dd>
								</dl>
								<section className="space-y-2">
									<h2 className="text-sm font-semibold">Darba apraksts</h2>
									<p className="whitespace-pre-wrap break-words text-sm">
										{source.Works || "Darba apraksts nav norādīts."}
									</p>
								</section>
								{source.Works_Custom_1 ? (
									<section className="space-y-2 border-t pt-4">
										<h2 className="text-sm font-semibold">BIS apraksts</h2>
										<p className="whitespace-pre-wrap break-words text-sm">
											{source.Works_Custom_1}
										</p>
									</section>
								) : null}
								{source.originalUserComment ? (
									<section className="space-y-2 border-t pt-4">
										<h2 className="text-sm font-semibold">
											Sākotnējais ziņojums
										</h2>
										<p className="whitespace-pre-wrap break-words text-sm">
											{source.originalUserComment}
										</p>
									</section>
								) : null}
							</>
						) : null}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
