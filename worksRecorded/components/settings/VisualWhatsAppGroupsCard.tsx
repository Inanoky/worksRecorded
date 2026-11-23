"use client";

import { Link2, RefreshCw, Search, Unplug, UsersRound } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";
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
	whatsAppGroupsEndpoint,
} from "@/flows/default-construction/visual/whatsapp-groups-client";

const connectionLabels: Record<WhatsAppGroupConnection["status"], string> = {
	unavailable: "Integrācija nav aktivizēta",
	disconnected: "Nav savienots",
	pairing: "Gaida savienošanu",
	connected: "Savienots",
	reconnect: "Jāsavieno atkārtoti",
	expired: "Savienojuma termiņš beidzies",
};

export function VisualWhatsAppGroupsCard({ siteId }: { siteId: string }) {
	const [connection, setConnection] = useState<WhatsAppGroupConnection | null>(
		null,
	);
	const [selected, setSelected] = useState<string[]>([]);
	const [search, setSearch] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [qrVersion, setQrVersion] = useState(0);
	const [qrFailed, setQrFailed] = useState(false);
	const [reload, setReload] = useState(0);
	const id = useId();

	const apply = useCallback((next: WhatsAppGroupConnection) => {
		setConnection(next);
		setSelected(next.groups.map((group) => group.id));
	}, []);

	useEffect(() => {
		if (reload > 0) setConnection(null);
		const controller = new AbortController();
		void readWhatsAppGroups(siteId, {
			manage: true,
			signal: controller.signal,
		}).then(
			(next) => {
				if (!controller.signal.aborted) apply(next);
			},
			() => {
				if (!controller.signal.aborted)
					setError("Neizdevās ielādēt WhatsApp grupas.");
			},
		);
		return () => controller.abort();
	}, [siteId, reload, apply]);

	const pairing = connection?.status === "pairing";
	useEffect(() => {
		if (!pairing) return;
		const controller = new AbortController();
		const health = window.setInterval(() => {
			void readWhatsAppGroups(siteId, {
				manage: true,
				signal: controller.signal,
			})
				.then((next) => {
					if (!controller.signal.aborted && next.status !== "pairing")
						apply(next);
				})
				.catch(() => {});
		}, 3500);
		const qr = window.setInterval(() => {
			setQrVersion((previous) => previous + 1);
			setQrFailed(false);
		}, 24000);
		return () => {
			controller.abort();
			window.clearInterval(health);
			window.clearInterval(qr);
		};
	}, [pairing, siteId, apply]);

	async function submit(action: Parameters<typeof updateWhatsAppGroups>[1]) {
		setBusy(true);
		setError(null);
		setSaved(false);
		try {
			apply(await updateWhatsAppGroups(siteId, action));
			if (action.action === "save-groups") setSaved(true);
			if (action.action === "connect") {
				setQrVersion((previous) => previous + 1);
				setQrFailed(false);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Neizdevās saglabāt iestatījumus.",
			);
		} finally {
			setBusy(false);
		}
	}

	const enabled = connection?.groups ?? [];
	const groups = filterWhatsAppGroups(
		connection?.availableGroups ?? [],
		search,
	);
	const changed =
		selected.length !== enabled.length ||
		enabled.some((group) => !selected.includes(group.id));
	const status = connection?.status;
	const connected = status === "connected";

	return (
		<Card id={`whatsapp-groups-${siteId}`}>
			<CardHeader className="gap-2">
				<CardTitle className="flex items-center gap-2">
					<UsersRound className="size-5 text-muted-foreground" /> WhatsApp
					grupas
				</CardTitle>
				<CardDescription>
					Izvēlieties, uz kurām grupām varat sūtīt šī projekta darba uzdevumus.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
					<div>
						<p className="text-sm font-medium">Jūsu WhatsApp konts</p>
						<output
							className={`text-sm ${connected ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}
						>
							{status
								? connectionLabels[status]
								: error
									? "Statuss nav pieejams"
									: "Pārbauda savienojumu…"}
							{connection?.phone ? ` · +${connection.phone}` : ""}
						</output>
					</div>
					{status === "disconnected" || status === "reconnect" ? (
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							onClick={() => void submit({ action: "connect" })}
						>
							<Link2 className="size-4" />{" "}
							{status === "reconnect"
								? "Atkārtoti savienot WhatsApp"
								: "Savienot WhatsApp"}
						</Button>
					) : null}
					{connected ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => void submit({ action: "disconnect" })}
						>
							<Unplug className="size-4" /> Atvienot
						</Button>
					) : null}
				</div>
				{pairing ? (
					<div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
						<div className="flex size-44 shrink-0 items-center justify-center rounded-md border bg-white p-2 text-center text-sm text-muted-foreground">
							{qrFailed ? (
								"QR kods vēl nav pieejams."
							) : (
								<Image
									key={qrVersion}
									src={`${whatsAppGroupsEndpoint(siteId)}?qr=1&v=${qrVersion}`}
									alt="WhatsApp savienošanas QR kods"
									width={158}
									height={158}
									unoptimized
									onError={() => setQrFailed(true)}
								/>
							)}
						</div>
						<div className="max-w-sm space-y-2 text-sm">
							<p>
								Telefonā atveriet{" "}
								<strong>WhatsApp → Saistītās ierīces → Saistīt ierīci</strong>{" "}
								un skenējiet QR kodu.
							</p>
							<p className="text-muted-foreground">
								Whapi tiks pievienots jūsu kontam kā saistīta ierīce. Pēc
								savienošanas izvēlieties projekta grupas.
							</p>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setQrFailed(false);
										setQrVersion((previous) => previous + 1);
									}}
								>
									<RefreshCw className="size-4" /> Atjaunot QR kodu
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									disabled={busy}
									onClick={() => void submit({ action: "disconnect" })}
								>
									Atcelt
								</Button>
							</div>
						</div>
					</div>
				) : null}
				{connected ? (
					<div className="space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<label htmlFor={id} className="text-sm font-medium">
								Projekta grupas
							</label>
							<span className="text-sm text-muted-foreground">
								Izvēlētas {selected.length}
							</span>
						</div>
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
							<Input
								id={id}
								aria-label="Meklēt WhatsApp grupu"
								placeholder="Meklēt WhatsApp grupu…"
								className="pl-9"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
						<div className="max-h-60 divide-y overflow-y-auto rounded-md border">
							{groups.map((group) => (
								<label
									key={group.id}
									className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50"
								>
									<input
										type="checkbox"
										checked={selected.includes(group.id)}
										disabled={busy}
										className="size-4 accent-primary"
										onChange={(event) => {
											const checked = event.target.checked;
											setSaved(false);
											setSelected((previous) =>
												checked
													? [...previous, group.id]
													: previous.filter((item) => item !== group.id),
											);
										}}
									/>
									<span className="min-w-0 break-words">{group.name}</span>
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
								type="button"
								size="sm"
								disabled={!changed || busy}
								onClick={() =>
									void submit({ action: "save-groups", groupIds: selected })
								}
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
					<div className="flex flex-wrap items-center gap-3">
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
						{!connection ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setError(null);
									setReload((previous) => previous + 1);
								}}
							>
								Mēģināt vēlreiz
							</Button>
						) : null}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
