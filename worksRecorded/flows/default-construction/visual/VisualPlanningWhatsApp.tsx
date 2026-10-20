"use client";

import { Copy, Download, Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PlanningImage } from "./planning-image";
import type { VisualPlan } from "./planning-model";
import {
	normalizePlanningWhatsAppPhone,
	normalizePlanningWhatsAppTemplateText,
	planningWhatsAppTemplateMessage,
} from "./planning-whatsapp";
import {
	type PlanningWhatsAppSendResult,
	sendPlanningWhatsAppTask,
} from "./planning-whatsapp-send-client";

export function VisualPlanningWhatsApp({
	siteId,
	plan,
	createImages,
	contact,
	disabled,
	onSendResult,
}: {
	siteId: string;
	plan: VisualPlan;
	createImages: (signal: AbortSignal) => Promise<PlanningImage[]>;
	contact?: { name: string; phone: string };
	disabled: boolean;
	onSendResult?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [phone, setPhone] = useState("");
	const [message, setMessage] = useState("");
	const [images, setImages] = useState<Array<PlanningImage & { url: string }>>(
		[],
	);
	const [preparing, setPreparing] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);
	const [copying, setCopying] = useState<number | null>(null);
	const [copyNotice, setCopyNotice] = useState<string | null>(null);
	const [sending, setSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);
	const [sendResult, setSendResult] =
		useState<PlanningWhatsAppSendResult | null>(null);
	const [clientRequestId, setClientRequestId] = useState("");
	const imageRequest = useRef<AbortController | null>(null);
	const imageUrls = useRef<string[]>([]);
	const clearImages = useCallback(() => {
		imageRequest.current?.abort();
		for (const url of imageUrls.current) URL.revokeObjectURL(url);
		imageUrls.current = [];
	}, []);
	useEffect(() => clearImages, [clearImages]);

	async function prepareImages() {
		clearImages();
		const controller = new AbortController();
		imageRequest.current = controller;
		setImages([]);
		setImageError(null);
		setCopyNotice(null);
		setPreparing(true);
		try {
			const result = await createImages(controller.signal);
			if (controller.signal.aborted) return;
			const prepared = result.map((image) => ({
				...image,
				url: URL.createObjectURL(image.blob),
			}));
			imageUrls.current = prepared.map((image) => image.url);
			setImages(prepared);
		} catch {
			if (!controller.signal.aborted)
				setImageError("Neizdevās sagatavot attēlu. Mēģiniet vēlreiz.");
		} finally {
			if (!controller.signal.aborted) setPreparing(false);
		}
	}

	async function copyImage(image: PlanningImage) {
		const request = imageRequest.current;
		setCopying(image.page);
		setCopyNotice(null);
		try {
			if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
				throw new Error("Image clipboard unavailable");
			await navigator.clipboard.write([
				new ClipboardItem({ "image/png": image.blob }),
			]);
			if (!request?.signal.aborted)
				setCopyNotice(
					`${image.section ? `Sekcijas ${image.section} rasējums` : `Lapas ${image.page} attēls`} nokopēts. WhatsApp sarunā ielīmējiet to ar Ctrl+V vai Cmd+V.`,
				);
		} catch {
			if (!request?.signal.aborted)
				setCopyNotice(
					"Attēlu neizdevās nokopēt. Lejupielādējiet to un pievienojiet WhatsApp sarunā.",
				);
		} finally {
			if (!request?.signal.aborted) setCopying(null);
		}
	}
	async function sendTask() {
		const recipient = normalizePlanningWhatsAppPhone(phone);
		const normalizedMessage = normalizePlanningWhatsAppTemplateText(message);
		if (!recipient || !normalizedMessage || !images.length || !clientRequestId)
			return;
		const controller = new AbortController();
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
				signal: controller.signal,
			});
			setSendResult(result);
			onSendResult?.();
		} catch (error) {
			setSendError(
				error instanceof Error
					? error.message
					: "Neizdevās nosūtīt WhatsApp darba uzdevumu.",
			);
		} finally {
			setSending(false);
		}
	}
	const id = useId();
	const invalidPhone = !!phone.trim() && !normalizePlanningWhatsAppPhone(phone);
	const normalizedMessage = normalizePlanningWhatsAppTemplateText(message);
	const messageTooLong = normalizedMessage.length > 900;
	const sendDisabled =
		preparing ||
		sending ||
		!images.length ||
		invalidPhone ||
		!phone.trim() ||
		!normalizedMessage ||
		messageTooLong ||
		sendResult?.status === "sent";

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (sending) return;
				if (nextOpen) {
					setPhone(contact?.phone ?? "");
					setMessage(planningWhatsAppTemplateMessage(plan));
					setCopying(null);
					setSendError(null);
					setSendResult(null);
					setClientRequestId(crypto.randomUUID());
					void prepareImages();
				} else {
					clearImages();
					setImages([]);
				}
				setOpen(nextOpen);
			}}
		>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" disabled={disabled}>
					<MessageCircle className="h-4 w-4" />
					Sagatavot WhatsApp
				</Button>
			</DialogTrigger>
			<DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-4xl">
				<DialogHeader className="shrink-0">
					<DialogTitle>Sagatavot uzdevumu WhatsApp</DialogTitle>
					<DialogDescription>
						Pārbaudiet saņēmēju un ziņu. Uzdevums tiks nosūtīts no Limeni
						WhatsApp numura kopā ar visiem sagatavotajiem attēliem.
					</DialogDescription>
				</DialogHeader>
				<div className="grid min-h-0 gap-5 overflow-y-auto sm:grid-cols-2">
					<div className="space-y-3">
						<p className="text-sm font-medium">Uzdevuma zonas attēls</p>
						<p className="text-xs text-muted-foreground">
							Nokopējiet attēlu, atveriet WhatsApp un ielīmējiet to sarunā ar
							Ctrl+V vai Cmd+V. Varat arī lejupielādēt attēlu un pievienot to kā
							failu.
						</p>
						{preparing ? (
							<output className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Sagatavo zonas attēlu…
							</output>
						) : null}
						{images.map((image) => (
							<div key={image.page} className="space-y-2 rounded-lg border p-2">
								<div className="relative h-64 w-full">
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
										sizes="(max-width: 640px) 90vw, 520px"
									/>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<span className="mr-auto text-xs text-muted-foreground">
										{image.section
											? `Sekcija ${image.section}`
											: `PDF lapa ${image.page}`}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={copying !== null}
										onClick={() => void copyImage(image)}
									>
										{copying === image.page ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Copy className="h-4 w-4" />
										)}
										Kopēt attēlu
									</Button>
									<Button asChild variant="outline" size="sm">
										<a
											href={image.url}
											download={
												image.section
													? `sekcija-${image.section}.png`
													: `uzdevums-${plan.id}-lapa-${image.page}.png`
											}
										>
											<Download className="h-4 w-4" />
											Lejupielādēt
										</a>
									</Button>
								</div>
							</div>
						))}
						{imageError ? (
							<div role="alert" className="space-y-2 text-sm text-destructive">
								<p>{imageError}</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void prepareImages()}
								>
									Mēģināt vēlreiz
								</Button>
							</div>
						) : null}
						{copyNotice ? (
							<output className="block text-xs text-muted-foreground">
								{copyNotice}
							</output>
						) : null}
					</div>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={`${id}-phone`}>
								Saņēmēja numurs ar valsts kodu
							</Label>
							<Input
								id={`${id}-phone`}
								type="tel"
								placeholder="+371 20000000"
								value={phone}
								disabled={Boolean(sendResult)}
								aria-invalid={invalidPhone}
								aria-describedby={`${id}-phone-help`}
								onChange={(event) => setPhone(event.target.value)}
							/>
							<p
								id={`${id}-phone-help`}
								className={`text-xs ${invalidPhone ? "text-destructive" : "text-muted-foreground"}`}
							>
								{invalidPhone
									? "Ievadiet derīgu numuru ar valsts kodu, piemēram, +371 20000000."
									: contact
										? `Plāna kontakts: ${contact.name}. Šeit numuru var mainīt šai ziņai.`
										: "Ievadiet saņēmēja WhatsApp numuru, piemēram, +371 20000000."}
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`${id}-message`}>Uzdevuma ziņa</Label>
							<Textarea
								id={`${id}-message`}
								rows={6}
								value={message}
								disabled={Boolean(sendResult)}
								aria-invalid={messageTooLong}
								onChange={(event) => setMessage(event.target.value)}
								onBlur={() => setMessage(normalizedMessage)}
							/>
							<p
								className={`text-xs ${messageTooLong ? "text-destructive" : "text-muted-foreground"}`}
							>
								{normalizedMessage.length}/900 rakstzīmes
							</p>
						</div>
						<p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
							Nosūtot jūs apliecināt, ka saņēmējs ir piekritis saņemt darba
							uzdevumus WhatsApp. Piekrišanu pārvalda Limeni ārpus šīs sistēmas.
						</p>
						{sendResult ? (
							<output
								className={`block rounded-lg border p-3 text-sm ${sendResult.status === "sent" ? "text-emerald-700" : "text-amber-700"}`}
							>
								{sendResult.status === "sent"
									? `Meta pieņēma ${sendResult.items.length} ${sendResult.items.length === 1 ? "attēlu" : "attēlus"} nosūtīšanai. Piegādes statusu skatiet uzdevuma vēsturē.`
									: `Nosūtīti ${sendResult.items.filter((item) => item.status !== "failed").length} no ${sendResult.items.length} attēliem. Varat atkārtot tikai nenosūtītos.`}
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
						onClick={() => {
							clearImages();
							setImages([]);
							setOpen(false);
						}}
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
							? "Atkārtot nenosūtītos attēlus"
							: sendResult?.status === "sent"
								? "Nosūtīts"
								: "Nosūtīt no Limeni WhatsApp"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
