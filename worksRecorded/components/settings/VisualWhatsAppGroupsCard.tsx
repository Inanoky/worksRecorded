"use client";

import { Search, UsersRound } from "lucide-react";
import { useEffect, useId, useState } from "react";
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
	filterWhatsAppGroups,
	readWhatsAppGroups,
	updateWhatsAppGroups,
	type WhatsAppGroupConnection,
} from "@/flows/default-construction/visual/whatsapp-groups-client";

export function VisualWhatsAppGroupsCard({
	siteId,
	connectionRevision = 0,
	inline = false,
	initialSenderId,
	onSaved,
}: {
	siteId: string;
	connectionRevision?: number;
	inline?: boolean;
	initialSenderId?: string;
	onSaved?: (value: WhatsAppGroupConnection) => void;
}) {
	const [connection, setConnection] = useState<WhatsAppGroupConnection | null>(
		null,
	);
	const [senderId, setSenderId] = useState(initialSenderId);
	const [selected, setSelected] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [request, setRequest] = useState(0);
	const revision = `${connectionRevision}-${request}`;
	const searchId = useId();
	const senderFieldId = useId();
	const groups = filterWhatsAppGroups(
		connection?.availableGroups ?? [],
		search,
	);
	const savedGroups = connection?.groups ?? [];
	const changed =
		selected.length !== savedGroups.length ||
		savedGroups.some(({ id }) => !selected.includes(id));

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		setSaved(false);
		void readWhatsAppGroups(siteId, {
			manage: true,
			connectionId: senderId,
			revision,
			signal: controller.signal,
		}).then(
			(next) => {
				if (controller.signal.aborted) return;
				setConnection(next);
				setSelected(next.groups.map(({ id }) => id));
				setLoading(false);
			},
			() => {
				if (controller.signal.aborted) return;
				setError("Neizdevās ielādēt WhatsApp grupas.");
				setLoading(false);
			},
		);
		return () => controller.abort();
	}, [siteId, senderId, revision]);

	async function saveGroups() {
		if (!connection?.connectionId) return;
		setBusy(true);
		setError(null);
		setSaved(false);
		try {
			const next = await updateWhatsAppGroups(siteId, {
				action: "save-groups",
				connectionId: connection.connectionId,
				groupIds: selected,
			});
			setConnection(next);
			setSelected(next.groups.map(({ id }) => id));
			setSaved(true);
			onSaved?.(next);
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Neizdevās saglabāt grupas.",
			);
		} finally {
			setBusy(false);
		}
	}

	const content = (
		<div className="space-y-4">
			{connection?.senders?.length ? (
				<div className="space-y-2">
					<label htmlFor={senderFieldId} className="block text-sm font-medium">
						Sūtītāja numurs
					</label>
					<select
						id={senderFieldId}
						className="rounded-md border bg-background px-3 py-2 text-sm"
						value={senderId ?? connection.connectionId ?? ""}
						disabled={busy || loading}
						onChange={(event) => {
							setSenderId(event.target.value);
							setSaved(false);
							setSearch("");
						}}
					>
						{!connection.senders.some(
							({ id }) => id === (senderId ?? connection.connectionId),
						) ? (
							<option
								value={senderId ?? connection.connectionId ?? ""}
								disabled
							>
								Izvēlieties savienotu numuru
							</option>
						) : null}
						{connection.senders.map(({ id, phone }) => (
							<option key={id} value={id}>
								{phone}
							</option>
						))}
					</select>
				</div>
			) : null}
			{loading ? (
				<output className="block text-sm text-muted-foreground">
					Ielādē grupas…
				</output>
			) : null}
			{!loading && !error && connection?.status !== "connected" ? (
				<p className="text-sm text-muted-foreground">
					Savienojiet numuru sadaļā WhatsApp numuri.
				</p>
			) : null}
			{!loading && !error && connection?.status === "connected" ? (
				<div className="space-y-3">
					<div className="flex justify-between gap-2 text-sm">
						<label htmlFor={searchId} className="font-medium">
							{inline
								? "Izvēlieties šī projekta WhatsApp grupas"
								: "Projekta grupas"}
						</label>
						<span className="text-muted-foreground">
							Izvēlētas {selected.length}
						</span>
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
						<Input
							id={searchId}
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Meklēt WhatsApp grupu…"
							className="pl-9"
						/>
					</div>
					<div className="max-h-60 divide-y overflow-y-auto rounded-md border">
						{groups.map(({ id, name }) => (
							<label
								key={id}
								className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50"
							>
								<input
									type="checkbox"
									className="size-4 accent-primary"
									checked={selected.includes(id)}
									disabled={busy}
									onChange={(event) => {
										const checked = event.target.checked;
										setSaved(false);
										setSelected((previous) =>
											checked
												? [...previous, id]
												: previous.filter((value) => value !== id),
										);
									}}
								/>
								<span className="min-w-0 break-words">{name}</span>
							</label>
						))}
						{!groups.length ? (
							<p className="p-3 text-sm text-muted-foreground">
								{search
									? "Nav atrasta neviena grupa."
									: "Šajā WhatsApp kontā nav pieejamu grupu."}
							</p>
						) : null}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							size="sm"
							type="button"
							disabled={busy || !changed}
							onClick={() => void saveGroups()}
						>
							Saglabāt grupas
						</Button>
						{saved ? (
							<output className="text-sm text-emerald-700 dark:text-emerald-400">
								Grupas saglabātas.
							</output>
						) : null}
					</div>
				</div>
			) : null}
			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={busy || loading}
				onClick={() => setRequest((value) => value + 1)}
			>
				Atjaunot grupu sarakstu
			</Button>
		</div>
	);
	if (inline) return content;
	return (
		<Card id={`whatsapp-groups-${siteId}`}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UsersRound className="size-5 text-muted-foreground" /> WhatsApp
					grupas
				</CardTitle>
				<CardDescription>
					Izvēlieties projekta grupas no numura, kas savienots ar WaSenderAPI.
				</CardDescription>
			</CardHeader>
			<CardContent>{content}</CardContent>
		</Card>
	);
}
