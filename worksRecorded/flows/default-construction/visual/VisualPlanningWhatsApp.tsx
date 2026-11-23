"use client";

import {
	CheckCircle2,
	Loader2,
	MessageCircle,
	UserRound,
	UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanningImage } from "./planning-image";
import type { VisualPlan } from "./planning-model";
import {
	LIMENI_TASK_REPORTING_NOTE,
	normalizePlanningWhatsAppMessage,
	normalizePlanningWhatsAppPhone,
	PLANNING_WHATSAPP_MESSAGE_LIMIT,
	planningWhatsAppMessageWithReportingNote,
	planningWhatsAppTemplateMessage,
} from "./planning-whatsapp";
import {
	type PlanningWhatsAppSendResult,
	readWasenderTaskReceipt,
	sendPlanningWhatsAppTask,
} from "./planning-whatsapp-send-client";
import type { VisualClientCache } from "./visual-client-cache";
import { WhatsAppGroupPicker } from "./WhatsAppGroupPicker";
import type { WhatsAppGroupConnection } from "./whatsapp-groups-client";

type PreviewImage = PlanningImage & { url: string };

export function VisualPlanningWhatsApp({
	siteId,
	active = true,
	cache,
	plan,
	imageKey,
	initialImages,
	createImages,
	contact,
	disabled,
	onSendResult,
}: {
	siteId: string;
	active?: boolean;
	cache: VisualClientCache;
	plan: VisualPlan;
	imageKey: string;
	initialImages?: PlanningImage[];
	createImages: (signal: AbortSignal) => Promise<PlanningImage[]>;
	contact?: { name: string; phone: string };
	disabled: boolean;
	onSendResult?: (result: PlanningWhatsAppSendResult) => void;
}) {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [target, setTarget] = useState<"direct" | "group">("direct");
	const [connection, setConnection] = useState<WhatsAppGroupConnection | null>(
		() => cache.peekWhatsAppGroups() ?? null,
	);
	const [groupId, setGroupId] = useState("");
	const [groupError, setGroupError] = useState(false);
	const [prepared, setPrepared] = useState<{
		key: string;
		images: PreviewImage[];
	}>({ key: "", images: [] });
	const [imageError, setImageError] = useState<string | null>(null);
	const [retry, setRetry] = useState(0);
	const [sending, setSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);
	const [sendResult, setSendResult] =
		useState<PlanningWhatsAppSendResult | null>(null);
	const sendId = sendResult?.sendId;
	const hasQueuedImages = !!sendResult?.items.some(
		({ status }) => status === "queued",
	);
	const canRetryGroupImages =
		target === "group" &&
		!!sendResult?.items.some(
			({ status }) => status === "failed" || status === "pending",
		) &&
		!sendResult.items.some(({ status }) => status === "processing");
	const groupSendFailure =
		target === "group"
			? sendResult?.items.find(({ error }) => error)?.error
			: null;
	const [clientRequestId, setClientRequestId] = useState("");
	const creator = useRef(createImages);
	const initial = useRef(initialImages);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const resultHandler = useRef(onSendResult);
	useEffect(() => {
		resultHandler.current = onSendResult;
	}, [onSendResult]);
	useEffect(() => {
		if (!open || !sendId || !hasQueuedImages || sending) return;
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout>;
		let remaining = 15;
		const refresh = async () => {
			const result = await readWasenderTaskReceipt(
				siteId,
				sendId,
				controller.signal,
			).catch(() => null);
			if (controller.signal.aborted) return;
			if (result) {
				setSendResult(result);
				resultHandler.current?.(result);
				if (!result.items.some(({ status }) => status === "queued")) return;
			}
			if (--remaining > 0) timer = setTimeout(refresh, 5000);
		};
		timer = setTimeout(refresh, 5000);
		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [hasQueuedImages, open, sending, sendId, siteId]);
	useEffect(() => {
		creator.current = createImages;
		initial.current = initialImages;
	}, [createImages, initialImages]);
	useEffect(() => {
		if (!active) return;
		const controller = new AbortController();
		let urls: string[] = [];
		setImageError(null);
		setPrepared({ key: imageKey, images: [] });
		void (async () => {
			try {
				const images =
					retry === 0 && initial.current?.length
						? initial.current
						: await creator.current(controller.signal);
				controller.signal.throwIfAborted();
				const previews = images.map((image) => ({
					...image,
					url: URL.createObjectURL(image.blob),
				}));
				urls = previews.map((image) => image.url);
				setPrepared({ key: imageKey, images: previews });
			} catch {
				if (!controller.signal.aborted)
					setImageError("Neizdevās sagatavot attēlus.");
			}
		})();
		return () => {
			controller.abort();
			for (const url of urls) URL.revokeObjectURL(url);
		};
	}, [active, imageKey, retry]);
	useEffect(
		() => () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		},
		[],
	);
	useEffect(() => {
		if (!active) return;
		let cancelled = false;
		const refresh = (force = false) => {
			void cache.loadWhatsAppGroups({ force }).then(
				(next) => {
					if (cancelled) return;
					setConnection(next);
					setGroupError(false);
				},
				() => {
					if (!cancelled) setGroupError(!cache.peekWhatsAppGroups());
				},
			);
		};
		refresh();
		const refreshOnFocus = () => refresh(true);
		if (open) window.addEventListener("focus", refreshOnFocus);
		return () => {
			cancelled = true;
			window.removeEventListener("focus", refreshOnFocus);
		};
	}, [active, cache, open]);
	const images = prepared.key === imageKey ? prepared.images : [];
	const recipient = normalizePlanningWhatsAppPhone(contact?.phone ?? "");
	const group =
		target === "group" && connection?.status === "connected"
			? connection.groups.find((item) => item.id === groupId)
			: undefined;
	const groupSender = connection?.phone;
	const canAddress =
		target === "direct" ? Boolean(recipient) : Boolean(group && groupSender);
	const settingsLink = `/dashboard/sites/${encodeURIComponent(siteId)}/settings#whatsapp-groups-${encodeURIComponent(siteId)}`;
	const outgoingMessage = planningWhatsAppMessageWithReportingNote(message);
	const messageTooLong =
		outgoingMessage.length > PLANNING_WHATSAPP_MESSAGE_LIMIT;
	const id = useId();
	const sendDisabled =
		disabled ||
		sending ||
		!images.length ||
		!canAddress ||
		!outgoingMessage ||
		messageTooLong ||
		(target === "group" &&
			sendResult?.status === "processing" &&
			!canRetryGroupImages) ||
		sendResult?.status === "sent";
	async function sendTask() {
		if (sendDisabled || !clientRequestId) return;
		setMessage(normalizePlanningWhatsAppMessage(message));
		setSending(true);
		setSendError(null);
		try {
			const result = await sendPlanningWhatsAppTask({
				siteId,
				planId: plan.id,
				planVersion: plan.version,
				recipient: target === "direct" ? (recipient ?? "") : "",
				...(group && groupSender
					? { group: { id: group.id, sender: groupSender } }
					: {}),
				message: outgoingMessage,
				clientRequestId,
				images,
				signal: new AbortController().signal,
			});
			setSendResult(result);
			onSendResult?.(result);
			if (result.status === "sent")
				closeTimer.current = setTimeout(() => {
					setOpen(false);
					closeTimer.current = null;
				}, 1100);
		} catch (error) {
			setSendError(
				error instanceof Error ? error.message : "Neizdevās nosūtīt uzdevumu.",
			);
		} finally {
			setSending(false);
		}
	}
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (sending) return;
				if (closeTimer.current) {
					clearTimeout(closeTimer.current);
					closeTimer.current = null;
				}
				if (next) {
					setMessage(planningWhatsAppTemplateMessage(plan));
					setTarget("direct");
					setGroupId("");
					setSendError(null);
					setSendResult(null);
					setClientRequestId(crypto.randomUUID());
				}
				setOpen(next);
			}}
		>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" disabled={disabled}>
					<MessageCircle className="h-4 w-4" />
					Nosūtīt uzdevumu
				</Button>
			</DialogTrigger>
			<DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-3xl">
				{sendResult?.status === "sent" ? (
					<output
						aria-live="polite"
						aria-label="WhatsApp sūtījums veiksmīgs"
						className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-lg bg-background p-8 text-center"
					>
						<CheckCircle2 className="h-16 w-16 text-emerald-600" />
						<strong className="text-2xl text-emerald-700">Nosūtīts</strong>
					</output>
				) : null}
				<DialogHeader className="shrink-0">
					<DialogTitle>Nosūtīt uzdevumu</DialogTitle>
					<DialogDescription className="sr-only">
						Darba uzdevums WhatsApp
					</DialogDescription>
				</DialogHeader>
				<div className="shrink-0 space-y-2 border-b pb-3">
					<p className="text-sm font-medium" id={`${id}-target`}>
						Nosūtīt uz
					</p>
					<fieldset
						aria-labelledby={`${id}-target`}
						className="flex flex-wrap gap-2"
					>
						<Button
							type="button"
							variant="outline"
							size="sm"
							aria-pressed={target === "direct"}
							disabled={sending || Boolean(sendResult)}
							className={
								target === "direct"
									? "border-primary bg-primary/10 text-primary"
									: undefined
							}
							onClick={() => {
								setTarget("direct");
								setSendError(null);
							}}
						>
							<UserRound className="size-4" /> Kontaktpersona
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							aria-pressed={target === "group"}
							disabled={sending || Boolean(sendResult)}
							className={
								target === "group"
									? "border-primary bg-primary/10 text-primary"
									: undefined
							}
							onClick={() => {
								setTarget("group");
								setSendError(null);
							}}
						>
							<UsersRound className="size-4" /> WhatsApp grupa
						</Button>
					</fieldset>
					{target === "direct" ? (
						<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
							<span>
								Sūtītājs{" "}
								<strong className="font-medium text-foreground">
									ThermoWhite
								</strong>
							</span>
							{contact ? (
								<span>
									Saņēmējs{" "}
									<strong className="font-medium text-foreground">
										{contact.name}
									</strong>
									{recipient ? ` · +${recipient}` : ""}
								</span>
							) : null}
						</div>
					) : groupError ? (
						<div className="flex flex-wrap items-center gap-2">
							<p role="alert" className="text-sm text-destructive">
								Neizdevās ielādēt WhatsApp grupas.
							</p>
							<Button
								size="sm"
								type="button"
								variant="outline"
								onClick={() => {
									setGroupError(false);
									void cache
										.loadWhatsAppGroups({ force: true })
										.then(setConnection, () => setGroupError(true));
								}}
							>
								Mēģināt vēlreiz
							</Button>
						</div>
					) : !connection ? (
						<output className="block text-sm text-muted-foreground">
							Ielādē projekta grupas…
						</output>
					) : connection.status === "connected" && connection.groups.length ? (
						<div className="grid items-center gap-2 sm:grid-cols-2">
							<WhatsAppGroupPicker
								groups={connection.groups}
								value={groupId}
								disabled={sending || Boolean(sendResult)}
								onChange={setGroupId}
							/>
							<p className="text-sm text-muted-foreground">
								Sūtītājs{" "}
								<strong className="font-medium text-foreground">
									+{groupSender}
								</strong>{" "}
								· WaSenderAPI
							</p>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							{connection.status === "unavailable" ? (
								"WhatsApp grupu integrācija vēl nav aktivizēta."
							) : (
								<Link
									href={settingsLink}
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									{connection.status === "connected"
										? "Pievienot grupas projekta iestatījumos"
										: connection.status === "reconnect" ||
												connection.status === "expired"
											? "Atkārtoti savienot WhatsApp"
											: "Savienot WhatsApp projekta iestatījumos"}
								</Link>
							)}
						</p>
					)}
				</div>
				<div className="grid min-h-0 gap-4 overflow-y-auto sm:grid-cols-2">
					<div className="space-y-3">
						{!images.length && !imageError ? (
							<output
								aria-label="Attēlu sagatavošana"
								className="flex h-48 items-center justify-center rounded-lg border text-muted-foreground"
							>
								<Loader2 className="h-5 w-5 animate-spin" />
							</output>
						) : null}
						{images.map((image) => (
							<figure
								key={`${image.page}:${image.section ?? "zone"}`}
								className="overflow-hidden rounded-lg border"
							>
								<div className="relative h-52 w-full">
									<Image
										src={image.url}
										alt={
											image.section
												? `Sekcijas rasējums · ${image.section}`
												: `Uzdevuma zona · PDF lapa ${image.page}`
										}
										fill
										unoptimized
										className="object-contain"
										sizes="(max-width: 640px) 90vw, 360px"
									/>
								</div>
								<figcaption className="px-3 py-2 text-xs text-muted-foreground">
									{image.section
										? `Sekcija ${image.section}`
										: images.filter((image) => !image.section).length > 1
											? `Zona · ${image.page}. lapa`
											: "Zona"}
								</figcaption>
							</figure>
						))}
						{imageError ? (
							<div role="alert" className="space-y-2 text-sm text-destructive">
								<p>{imageError}</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setRetry((value) => value + 1)}
								>
									Mēģināt vēlreiz
								</Button>
							</div>
						) : null}
					</div>
					<div className="space-y-3">
						{target === "direct" && !recipient ? (
							<p role="alert" className="text-sm text-destructive">
								Izvēlieties uzdevumam kontaktu ar WhatsApp numuru.
							</p>
						) : null}
						<div className="space-y-2">
							<Label htmlFor={`${id}-message`}>Ziņa</Label>
							<Textarea
								id={`${id}-message`}
								rows={8}
								value={message}
								disabled={Boolean(sendResult) || sending}
								aria-invalid={messageTooLong}
								onChange={(event) => setMessage(event.target.value)}
								onBlur={() =>
									setMessage(normalizePlanningWhatsAppMessage(message))
								}
							/>
							<p className="whitespace-pre-wrap text-sm">
								{LIMENI_TASK_REPORTING_NOTE}
							</p>
							{messageTooLong ? (
								<p role="alert" className="text-xs text-destructive">
									Ziņa kopā ar piezīmi pārsniedz{" "}
									{PLANNING_WHATSAPP_MESSAGE_LIMIT} rakstzīmes.
								</p>
							) : null}
						</div>
						{sendResult && sendResult.status !== "sent" ? (
							<output className="block text-sm text-amber-700">
								Nosūtīti{" "}
								{
									sendResult.items.filter((item) =>
										["sent", "delivered", "read"].includes(item.status),
									).length
								}{" "}
								no {sendResult.items.length} attēliem.
								{hasQueuedImages
									? " WaSenderAPI apstrādā attēlus."
									: target === "group" && sendResult.status === "processing"
										? " Pārbaudiet WhatsApp grupu, lai pārliecinātos par pārējo attēlu nosūtīšanu."
										: null}
							</output>
						) : null}
						{sendError ? (
							<p role="alert" className="text-sm text-destructive">
								{sendError}
							</p>
						) : null}
						{groupSendFailure ? (
							<p role="alert" className="text-sm text-destructive">
								{groupSendFailure}
							</p>
						) : null}
					</div>
				</div>
				<DialogFooter className="shrink-0">
					<Button
						type="button"
						variant="outline"
						disabled={sending}
						onClick={() => setOpen(false)}
					>
						Atcelt
					</Button>
					<Button
						type="button"
						disabled={sendDisabled}
						onClick={() => void sendTask()}
					>
						{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						{target === "group" &&
						sendResult?.status === "processing" &&
						!canRetryGroupImages
							? "Gaida apstiprinājumu"
							: sendResult && sendResult.status !== "sent"
								? "Atkārtot nenosūtītos"
								: "Nosūtīt"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
