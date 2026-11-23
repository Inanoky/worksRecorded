"use client";

import { Link2, Plus, RefreshCw, Smartphone } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useId, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	requestWasenderConnections,
	type WasenderConnection,
	type WasenderConnectionAction,
	type WasenderConnectionStatus,
	type WasenderConnections,
	wasenderConnectionsEndpoint,
} from "@/flows/default-construction/visual/wasender-connections-client";

const statusLabels: Record<WasenderConnectionStatus, string> = {
	pending: "Izveidi vēl nevar apstiprināt",
	disconnected: "Atvienots",
	pairing: "Gaida QR koda skenēšanu",
	connected: "Savienots",
	wrong_number: "Piesaistīts cits numurs. Atvienojiet un skenējiet vēlreiz.",
	unavailable: "Statuss nav pieejams",
};

function updateConnection(
	list: WasenderConnection[],
	next: WasenderConnection,
) {
	return list.some(({ id }) => id === next.id)
		? list.map((item) => (item.id === next.id ? next : item))
		: [...list, next];
}

export function VisualWhatsAppConnectionsCard({
	siteId,
	onConnectionChange,
}: {
	siteId: string;
	onConnectionChange?: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Smartphone className="size-5 text-muted-foreground" /> WhatsApp
					numuri
				</CardTitle>
				<CardDescription>
					Pievienojiet savu WhatsApp numuru ar WaSenderAPI.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<VisualWhatsAppConnectionControls
					siteId={siteId}
					onConnectionChange={onConnectionChange}
				/>
			</CardContent>
		</Card>
	);
}

export function VisualWhatsAppConnectionControls({
	siteId,
	onConnectionChange,
	inline = false,
	preferredConnectionId,
}: {
	siteId: string;
	onConnectionChange?: () => void;
	inline?: boolean;
	preferredConnectionId?: string;
}) {
	const endpoint = wasenderConnectionsEndpoint(siteId);
	const phoneField = useId();
	const [enabled, setEnabled] = useState<boolean | null>(null);
	const [connections, setConnections] = useState<WasenderConnection[]>([]);
	const [phone, setPhone] = useState("");
	const [pairing, setPairing] = useState<string | null>(null);
	const [remove, setRemove] = useState<WasenderConnection | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reload, setReload] = useState(0);
	const [qrVersion, setQrVersion] = useState(0);
	const [qrFailed, setQrFailed] = useState(false);
	const active = connections.find(({ id }) => id === pairing);
	const preferred = connections.find(({ id }) => id === preferredConnectionId);
	const visibleConnections = inline && preferred ? [preferred] : connections;
	const listEndpoint = `${endpoint}?v=${reload}`;

	useEffect(() => {
		const controller = new AbortController();
		void requestWasenderConnections<WasenderConnections>(listEndpoint, {
			signal: controller.signal,
		}).then(
			(data) => {
				if (controller.signal.aborted) return;
				setEnabled(data.enabled);
				setConnections(data.connections);
				if (inline) {
					const preferred = data.connections.find(
						({ id }) => id === preferredConnectionId,
					);
					const candidates = preferred ? [preferred] : data.connections;
					setPairing(
						candidates.find(({ status }) => status === "pairing")?.id ?? null,
					);
				}
			},
			(reason: Error) => {
				if (!controller.signal.aborted) setError(reason.message);
			},
		);
		return () => controller.abort();
	}, [inline, listEndpoint, preferredConnectionId]);

	useEffect(() => {
		if (!pairing || busy) return;
		const controller = new AbortController();
		let nextCheck: number;
		async function checkStatus() {
			try {
				const next = await requestWasenderConnections<WasenderConnection>(
					`${endpoint}?id=${pairing}`,
					{ signal: controller.signal },
				);
				if (controller.signal.aborted) return;
				if (next.status !== "unavailable") {
					setConnections((list) => updateConnection(list, next));
					if (next.status !== "pairing") {
						setPairing(null);
						if (!inline || next.status === "connected") onConnectionChange?.();
						return;
					}
				}
			} catch {
				if (controller.signal.aborted) return;
			}
			nextCheck = window.setTimeout(() => void checkStatus(), 4500);
		}
		nextCheck = window.setTimeout(() => void checkStatus(), 4500);
		const refreshQr = window.setInterval(() => {
			setQrFailed(false);
			setQrVersion((value) => value + 1);
		}, 20000);
		return () => {
			controller.abort();
			window.clearTimeout(nextCheck);
			window.clearInterval(refreshQr);
		};
	}, [busy, endpoint, inline, onConnectionChange, pairing]);

	async function submit(action: WasenderConnectionAction) {
		setBusy(true);
		setError(null);
		try {
			const { connection } = await requestWasenderConnections<{
				connection: WasenderConnection | null;
			}>(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(action),
			});
			if (connection) {
				setConnections((list) => updateConnection(list, connection));
				if (action.action === "add") setPhone("");
				if (connection.status === "pairing") {
					setQrFailed(false);
					setQrVersion((value) => value + 1);
					setPairing(connection.id);
				} else if (connection.id === pairing) {
					setPairing(null);
				}
			} else if (action.action === "remove") {
				setConnections((list) => list.filter(({ id }) => id !== action.id));
				if (pairing === action.id) setPairing(null);
			}
			if (
				connection?.status === "connected" ||
				(!inline && connection?.status !== "pairing")
			)
				onConnectionChange?.();
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Neizdevās saglabāt numuru.",
			);
			if (action.action === "add") setReload((value) => value + 1);
		} finally {
			setBusy(false);
		}
	}

	function addNumber(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!busy) void submit({ action: "add", phone });
	}

	return (
		<div className="space-y-4">
			{enabled === null && !error ? (
				<p className="text-sm text-muted-foreground">Ielādē numurus…</p>
			) : null}
			{enabled === false ? (
				<p className="text-sm text-muted-foreground">
					WaSenderAPI vēl nav aktivizēts.
				</p>
			) : null}
			{enabled ? (
				<>
					{!inline || connections.length === 0 ? (
						<form
							className="flex flex-wrap items-end gap-2"
							onSubmit={addNumber}
						>
							<div className="min-w-48 flex-1 space-y-2">
								<label htmlFor={phoneField} className="text-sm font-medium">
									Tālruņa numurs
								</label>
								<Input
									id={phoneField}
									type="tel"
									autoComplete="tel"
									placeholder="+371 20 000 000"
									required
									maxLength={36}
									value={phone}
									onChange={(event) => setPhone(event.target.value)}
								/>
							</div>
							<Button type="submit" disabled={busy || !phone.trim()}>
								<Plus className="size-4" /> Pievienot numuru
							</Button>
						</form>
					) : null}
					{visibleConnections.length ? (
						<ul className="divide-y rounded-lg border">
							{visibleConnections.map((item) => (
								<li
									key={item.id}
									className="flex flex-wrap items-center justify-between gap-2 p-3"
								>
									<div>
										<p className="text-sm font-medium">{item.phone}</p>
										<output
											className={`text-sm ${item.status === "connected" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}
										>
											{statusLabels[item.status]}
										</output>
									</div>
									<div className="flex flex-wrap gap-2">
										{inline && item.status === "connected" ? (
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={onConnectionChange}
											>
												Atjaunot grupas
											</Button>
										) : item.status === "connected" ||
											item.status === "wrong_number" ? (
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={busy}
												onClick={() =>
													void submit({ action: "disconnect", id: item.id })
												}
											>
												Atvienot
											</Button>
										) : (
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={busy || pairing === item.id}
												onClick={() =>
													void submit({ action: "connect", id: item.id })
												}
											>
												<Link2 className="size-4" />
												{item.status === "pending" ||
												item.status === "unavailable"
													? "Pārbaudīt"
													: item.status === "pairing"
														? "Rādīt QR kodu"
														: "Savienot"}
											</Button>
										)}
										{!inline ? (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={busy}
												onClick={() => setRemove(item)}
											>
												Noņemt
											</Button>
										) : null}
									</div>
								</li>
							))}
						</ul>
					) : null}
				</>
			) : null}
			{active?.status === "pairing" ? (
				<div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
					<div className="flex size-44 items-center justify-center rounded-md border bg-white p-2 text-center text-sm text-neutral-600">
						{qrFailed ? (
							"Gaida QR kodu…"
						) : (
							<Image
								key={`${active.id}-${qrVersion}`}
								src={`${endpoint}?qr=${active.id}&v=${qrVersion}`}
								alt="WhatsApp savienošanas QR kods"
								width={158}
								height={158}
								unoptimized
								onError={() => setQrFailed(true)}
							/>
						)}
					</div>
					<div className="max-w-sm space-y-2 text-sm">
						<p className="font-medium">Savienot {active.phone}</p>
						<p>
							Telefonā atveriet{" "}
							<strong>WhatsApp → Saistītās ierīces → Saistīt ierīci</strong> un
							skenējiet QR kodu.
						</p>
						<p className="text-muted-foreground">
							WaSenderAPI tiks pievienots kā saistīta ierīce ar piekļuvi konta
							ziņām.
						</p>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={busy}
								onClick={() => {
									setQrFailed(false);
									setQrVersion((value) => value + 1);
								}}
							>
								<RefreshCw className="size-4" /> Atjaunot QR kodu
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								disabled={busy}
								onClick={() =>
									void submit({ action: "disconnect", id: active.id })
								}
							>
								{inline ? "Atcelt savienošanu" : "Atcelt"}
							</Button>
						</div>
					</div>
				</div>
			) : null}
			{error ? (
				<div className="flex flex-wrap items-center gap-2">
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
					{enabled === null ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								setError(null);
								setReload((value) => value + 1);
							}}
						>
							Mēģināt vēlreiz
						</Button>
					) : null}
				</div>
			) : null}
			{!inline ? (
				<AlertDialog
					open={remove !== null}
					onOpenChange={(open) => {
						if (!open) setRemove(null);
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Noņemt {remove?.phone}?</AlertDialogTitle>
							<AlertDialogDescription>
								Numurs tiks atvienots un noņemts no WaSenderAPI. To varēs
								pievienot atkārtoti.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Atcelt</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (remove) void submit({ action: "remove", id: remove.id });
								}}
							>
								Noņemt numuru
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			) : null}
		</div>
	);
}
