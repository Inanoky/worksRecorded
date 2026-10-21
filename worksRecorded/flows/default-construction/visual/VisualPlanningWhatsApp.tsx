"use client";

import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";
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
	normalizePlanningWhatsAppMessage,
	normalizePlanningWhatsAppPhone,
	planningWhatsAppTemplateMessage,
} from "./planning-whatsapp";
import {
	type PlanningWhatsAppSendResult,
	sendPlanningWhatsAppTask,
} from "./planning-whatsapp-send-client";

type PreviewImage = PlanningImage & { url: string };

export function VisualPlanningWhatsApp({
	siteId,
	plan,
	imageKey,
	initialImages,
	createImages,
	contact,
	disabled,
	onSendResult,
}: {
	siteId: string;
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
	const [clientRequestId, setClientRequestId] = useState("");
	const creator = useRef(createImages);
	const initial = useRef(initialImages);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		creator.current = createImages;
		initial.current = initialImages;
	}, [createImages, initialImages]);
	useEffect(() => {
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
	}, [imageKey, retry]);
	useEffect(
		() => () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		},
		[],
	);
	const images = prepared.key === imageKey ? prepared.images : [];
	const recipient = normalizePlanningWhatsAppPhone(contact?.phone ?? "");
	const normalizedMessage = normalizePlanningWhatsAppMessage(message);
	const messageTooLong = normalizedMessage.length > 900;
	const id = useId();
	const sendDisabled =
		disabled ||
		sending ||
		!images.length ||
		!recipient ||
		!normalizedMessage ||
		messageTooLong ||
		sendResult?.status === "sent";
	async function sendTask() {
		if (sendDisabled || !recipient || !clientRequestId) return;
		setMessage(normalizedMessage);
		setSending(true);
		setSendError(null);
		try {
			const result = await sendPlanningWhatsAppTask({
				siteId,
				planId: plan.id,
				planVersion: plan.version,
				recipient,
				message: normalizedMessage,
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
					<DialogDescription
						className={contact ? "flex items-center gap-2" : "sr-only"}
					>
						<MessageCircle className="h-4 w-4" />
						{contact?.name ?? "Darba uzdevums WhatsApp"}
					</DialogDescription>
				</DialogHeader>
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
						{!recipient ? (
							<p role="alert" className="text-sm text-destructive">
								Izvēlieties uzdevumam kontaktu ar WhatsApp numuru.
							</p>
						) : null}
						<div className="space-y-2">
							<Label htmlFor={`${id}-message`}>Ziņa</Label>
							<Textarea
								id={`${id}-message`}
								rows={12}
								value={message}
								disabled={Boolean(sendResult) || sending}
								aria-invalid={messageTooLong}
								onChange={(event) => setMessage(event.target.value)}
								onBlur={() => setMessage(normalizedMessage)}
							/>
							{messageTooLong ? (
								<p role="alert" className="text-xs text-destructive">
									Ziņa pārsniedz 900 rakstzīmes.
								</p>
							) : null}
						</div>
						{sendResult && sendResult.status !== "sent" ? (
							<output className="block text-sm text-amber-700">
								Nosūtīti{" "}
								{
									sendResult.items.filter((item) => item.status !== "failed")
										.length
								}{" "}
								no {sendResult.items.length} attēliem.
							</output>
						) : null}
						{sendError ? (
							<p role="alert" className="text-sm text-destructive">
								{sendError}
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
						{sendResult && sendResult.status !== "sent"
							? "Atkārtot nenosūtītos"
							: "Nosūtīt"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
