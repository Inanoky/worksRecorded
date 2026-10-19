"use client";

import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	type FimaCollaboration,
	formatFimaEventText,
} from "@/lib/fima/diary-collaboration";
import { mergeFimaCollaboration } from "@/lib/fima/diary-list-summary";
import { getFimaDiaryCollaboration } from "@/server/actions/fima-diary-collaboration";

type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};

export function FimaBadgeHistory({ siteId, recordId, state, onChange }: Props) {
	const [open, setOpen] = useState(false);
	const [snapshot, setSnapshot] = useState<FimaCollaboration | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [request, setRequest] = useState<Pick<
		Props,
		"siteId" | "recordId"
	> | null>(null);
	const callback = useRef(onChange);
	useEffect(() => {
		callback.current = onChange;
	}, [onChange]);
	useEffect(() => {
		if (!request) return;
		const { siteId, recordId } = request;
		let active = true;
		setLoading(true);
		setError("");
		setSnapshot(null);
		void getFimaDiaryCollaboration({ siteId, recordId })
			.then((value) => {
				if (!active) return;
				setSnapshot(value);
				callback.current(recordId, value);
			})
			.catch(() => {
				if (active) setError("Neizdevās ielādēt atzīmju vēsturi.");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [request]);
	const history = mergeFimaCollaboration(snapshot ?? undefined, state)
		.history.filter((event) => event.kind === "status")
		.toReversed();
	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				setRequest(value ? { siteId, recordId } : null);
			}}
		>
			<DialogTrigger asChild>
				<button
					type="button"
					aria-label="Atzīmju vēsture"
					title="Atzīmju vēsture"
					className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<History className="size-3" />
				</button>
			</DialogTrigger>
			<DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Atzīmju vēsture</DialogTitle>
					<DialogDescription>
						Kas, kad un kā mainīja ieraksta rīcības atzīmi.
					</DialogDescription>
				</DialogHeader>
				{loading ? (
					<output className="text-sm text-muted-foreground">
						Ielādē atzīmju vēsturi...
					</output>
				) : null}
				{error ? (
					<div role="alert" className="space-y-2 text-sm text-destructive">
						<p>{error}</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setRequest({ siteId, recordId })}
						>
							Mēģināt vēlreiz
						</Button>
					</div>
				) : null}
				{!loading && !error ? (
					<ol className="space-y-3" aria-label="Atzīmju izmaiņas">
						{history.map((event) => (
							<li key={event.id} className="rounded-lg border p-3">
								<p className="text-sm font-medium">{event.actorName}</p>
								<time
									dateTime={event.at}
									className="text-xs text-muted-foreground"
								>
									{new Date(event.at).toLocaleString("lv-LV", {
										timeZone: "Europe/Riga",
									})}
								</time>
								<p className="mt-2 text-sm">{formatFimaEventText(event)}</p>
							</li>
						))}
						{!history.length ? (
							<li className="text-sm text-muted-foreground">
								Atzīmju izmaiņu vēl nav.
							</li>
						) : null}
					</ol>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
