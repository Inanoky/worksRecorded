"use client";

import { Link2, Plus, RefreshCw, Smartphone } from "lucide-react";
import Image from "next/image";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
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
	onConnected,
}: {
	siteId: string;
	onConnectionChange?: () => void;
	inline?: boolean;
	onConnected?: (connection: WasenderConnection) => void;
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
	const pairingStatusRequest = useRef<AbortController | null>(null);
	const submitRequest = useRef<AbortController | null>(null);
	const active = connections.find(({ id }) => id === pairing);
	const listEndpoint = `${endpoint}?v=${reload}`;

	useEffect(() => () => submitRequest.current?.abort(), []);

	useEffect(() => {
		if (inline) return;
		const controller = new AbortController();
		void requestWasenderConnections<WasenderConnections>(listEndpoint, {
			signal: controller.signal,
		}).then(
			(data) => {
				if (controller.signal.aborted) return;
				setEnabled(data.enabled);
				setConnections(data.connections);
			},
			(reason: Error) => {
				if (!controller.signal.aborted) setError(reason.message);
			},
		);
		return () => controller.abort();
	}, [inline, listEndpoint]);

	useEffect(() => {
		if (!pairing || busy) return;
		const controller = new AbortController();
		pairingStatusRequest.current = controller;
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
						if (next.status === "connected") onConnected?.(next);
						else if (inline) setError(statusLabels[next.status]);
						if (!inline) onConnectionChange?.();
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
			pairingStatusRequest.current = null;
			window.clearTimeout(nextCheck);
			window.clearInterval(refreshQr);
		};
	}, [busy, endpoint, inline, onConnected, onConnectionChange, pairing]);

	const submit = useCallback(
		async (action: WasenderConnectionAction) => {
			if (submitRequest.current) return;
			const controller = new AbortController();
			submitRequest.current = controller;
			setBusy(true);
			setError(null);
			try {
				const { connection } = await requestWasenderConnections<{
					connection: WasenderConnection | null;
				}>(endpoint, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(action),
					signal: controller.signal,
				});
				if (controller.signal.aborted) return;
				if (connection) {
					setConnections((list) => updateConnection(list, connection));
					if (action.action === "add" && !inline) setPhone("");
					if (connection.status === "pairing") {
						setQrFailed(false);
						setQrVersion((value) => value + 1);
						setPairing(connection.id);
					} else {
						setPairing((current) =>
							current === connection.id ? null : current,
						);
						if (connection.status === "connected") onConnected?.(connection);
						else if (inline) setError(statusLabels[connection.status]);
					}
				} else if (action.action === "remove") {
					setConnections((list) => list.filter(({ id }) => id !== action.id));
					setPairing((current) => (current === action.id ? null : current));
				}
				if (!inline && connection?.status !== "pairing") onConnectionChange?.();
			} catch (reason) {
				if (controller.signal.aborted) return;
				setError(
					reason instanceof Error
						? reason.message
						: "Neizdevās saglabāt numuru.",
				);
				if (!inline && action.action === "add") setReload((value) => value + 1);
			} finally {
				submitRequest.current = null;
				if (!controller.signal.aborted) setBusy(false);
			}
		},
		[endpoint, inline, onConnected, onConnectionChange],
	);

	function addNumber(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!busy) void submit({ action: "add", phone });
	}

	const phoneForm = (
		<form className="flex flex-wrap items-end gap-2" onSubmit={addNumber}>
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
					readOnly={inline && busy}
					value={phone}
					onChange={(event) => setPhone(event.target.value)}
				/>
			</div>
			<Button type="submit" disabled={busy || !phone.trim()}>
				{inline ? (
					busy ? (
						"Sagatavo QR kodu…"
					) : (
						"Turpināt"
					)
				) : (
					<>
						<Plus className="size-4" /> Pievienot numuru
					</>
				)}
			</Button>
		</form>
	);
	return (
		<div className="space-y-4">
			{inline && !active ? phoneForm : null}
			{!inline && enabled === null && !error ? (
				<p className="text-sm text-muted-foreground">Ielādē numurus…</p>
			) : null}
			{!inline && enabled === false ? (
				<p className="text-sm text-muted-foreground">
					WaSenderAPI vēl nav aktivizēts.
				</p>
			) : null}
			{!inline && enabled ? (
				<>
					{phoneForm}
					{connections.length ? (
						<ul className="divide-y rounded-lg border">
							{connections.map((item) => (
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
										{item.status === "connected" ||
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
										<Button
											type="button"
											variant="ghost"
											size="sm"
											disabled={busy}
											onClick={() => setRemove(item)}
										>
											Noņemt
										</Button>
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
								onClick={() => {
									if (!inline) {
										void submit({ action: "disconnect", id: active.id });
										return;
									}
									pairingStatusRequest.current?.abort();
									setPairing(null);
									setError(null);
								}}
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
					{!inline && enabled === null ? (
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
