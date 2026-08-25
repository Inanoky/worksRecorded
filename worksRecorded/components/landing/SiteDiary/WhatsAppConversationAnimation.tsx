"use client";

import {
	ArrowLeft,
	Camera,
	CheckCheck,
	LoaderCircle,
	Mic,
	MoreVertical,
	Paperclip,
	Phone,
	Video,
} from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/whatsappIcon";
import concretePhoto from "@/public/frontend/pages/SiteDiary/hero-construction-site-scott-blake.jpg";
import cranePhoto from "@/public/pictures/deprom.jpeg";
import winterPhoto from "@/public/pictures/ufix.jpg";

type ConversationCopy = {
	eyebrow: string;
	title: string;
	description: string;
	status: string;
	reminder: string;
	workerReply: string;
	saved: string;
	date: string;
	concrete: string;
	additionalWorks: string;
	photoRequest: string;
	composer: string;
	photoAlt: string;
	chips: string[];
};

const LATVIAN_COPY: ConversationCopy = {
	eyebrow: "WhatsApp → būvdarbu žurnāls",
	title: "No īsas ziņas līdz pilnam dienas ierakstam",
	description:
		"Vadītājs raksta tā, kā pieradis. WorksRecorded automātiski sakārto darbus, apjomus, cilvēkus, stundas un foto.",
	status: "tiešsaistē",
	reminder: "Atgādinājums aizpildīt būvdarbu žurnālu! 👷👷",
	workerReply: "Šodien aizbetonējām 15 m³, un papilddarbos – 10 stundas.",
	saved: "Saglabāts:",
	date: "25.08.2026",
	concrete: "Betonēšana – 15 m³, 3 cilvēki, 5 stundas",
	additionalWorks: "Papilddarbi – 10 stundas",
	photoRequest: "Vai vari nosūtīt bildes?",
	composer: "Ziņa",
	photoAlt: "Būvobjekta foto",
	chips: ["Darbi", "Apjomi", "Cilvēki", "Stundas", "Foto"],
};

const ENGLISH_COPY: ConversationCopy = {
	eyebrow: "WhatsApp → site diary",
	title: "From one short message to a complete daily record",
	description:
		"The site manager writes naturally. WorksRecorded structures the work, quantities, people, hours, and photos automatically.",
	status: "online",
	reminder: "Reminder to complete the construction site diary! 👷👷",
	workerReply:
		"Today we poured 15 m³ of concrete and spent 10 hours on additional work.",
	saved: "Saved:",
	date: "25.08.2026",
	concrete: "Concrete works – 15 m³, 3 people, 5 hours",
	additionalWorks: "Additional work – 10 hours",
	photoRequest: "Can you send photos?",
	composer: "Message",
	photoAlt: "Construction site photo",
	chips: ["Work", "Quantities", "People", "Hours", "Photos"],
};

const PHOTO_MESSAGES: StaticImageData[] = [
	concretePhoto,
	winterPhoto,
	cranePhoto,
];
const MESSAGE_ENTER =
	"animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none";
const TIMELINE = [500, 2200, 3900, 5000, 7900, 9600] as const;
const LOOP_DURATION = 13_500;

export function WhatsAppConversationAnimation({ locale }: { locale: string }) {
	const copy = locale.toLowerCase().startsWith("lv")
		? LATVIAN_COPY
		: ENGLISH_COPY;

	return (
		<section className="relative mx-auto grid w-full max-w-[1328px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-24 xl:px-14">
			<div className="max-w-xl">
				<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087a49]">
					<span className="h-0.5 w-8 rounded-full bg-[#087a49]" />
					{copy.eyebrow}
				</p>
				<h2 className="mt-5 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] sm:text-5xl lg:text-[4rem]">
					{copy.title}
				</h2>
				<p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
					{copy.description}
				</p>
				<div className="mt-8 flex flex-wrap gap-2">
					{copy.chips.map((label) => (
						<span
							key={label}
							className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-[#087a49] dark:border-emerald-900 dark:bg-emerald-950/30"
						>
							{label}
						</span>
					))}
				</div>
			</div>

			<div className="relative flex justify-center lg:justify-end">
				<div className="pointer-events-none absolute inset-x-10 bottom-2 h-20 rounded-full bg-emerald-900/20 blur-3xl" />
				<WhatsAppChatPhone locale={locale} />
			</div>

			<p className="sr-only">
				{copy.reminder} {copy.workerReply} {copy.saved} {copy.date}{" "}
				{copy.concrete} {copy.additionalWorks} {copy.photoRequest}
			</p>
		</section>
	);
}

export function WhatsAppChatPhone({
	locale,
	className = "",
}: {
	locale: string;
	className?: string;
}) {
	const [stage, setStage] = useState(0);
	const copy = locale.toLowerCase().startsWith("lv")
		? LATVIAN_COPY
		: ENGLISH_COPY;

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setStage(TIMELINE.length);
			return;
		}

		let timeouts: Array<ReturnType<typeof setTimeout>> = [];
		const play = () => {
			timeouts.forEach(clearTimeout);
			timeouts = [];
			setStage(0);
			TIMELINE.forEach((delay, index) => {
				timeouts.push(setTimeout(() => setStage(index + 1), delay));
			});
		};

		play();
		const interval = setInterval(play, LOOP_DURATION);
		return () => {
			clearInterval(interval);
			timeouts.forEach(clearTimeout);
		};
	}, []);

	return (
		<div
			className={`relative w-full max-w-[390px] rounded-[3rem] border-[9px] border-[#101312] bg-[#101312] p-1 shadow-[0_34px_90px_rgba(3,59,39,0.3)] ${className}`}
			aria-hidden="true"
		>
			<div className="absolute left-1/2 top-2 z-20 h-5 w-28 -translate-x-1/2 rounded-full bg-[#101312]" />
			<div className="overflow-hidden rounded-[2.35rem] bg-[#efeae2]">
				<PhoneHeader status={copy.status} />
				<div
					className="flex h-[650px] flex-col justify-start gap-3 overflow-hidden px-3 pb-4 pt-8 sm:px-4"
					style={{
						backgroundColor: "#efeae2",
						backgroundImage:
							"radial-gradient(circle at 18px 22px, rgba(17,94,89,0.06) 1.5px, transparent 1.5px), radial-gradient(circle at 52px 58px, rgba(17,94,89,0.04) 2px, transparent 2px)",
						backgroundSize: "72px 72px",
					}}
				>
					{stage >= 1 ? (
						<MessageBubble direction="incoming" time="08:30">
							{copy.reminder}
						</MessageBubble>
					) : null}
					{stage >= 2 ? (
						<MessageBubble direction="outgoing" time="08:37" sent>
							{copy.workerReply}
						</MessageBubble>
					) : null}
					{stage === 3 ? <TypingBubble /> : null}
					{stage >= 4 ? (
						<MessageBubble direction="incoming" time="08:38">
							<p className="font-semibold text-[#087a49]">{copy.saved}</p>
							<p>{copy.date}</p>
							<p className="mt-1">{copy.concrete}</p>
							<p>{copy.additionalWorks}</p>
							<p className="mt-2">{copy.photoRequest}</p>
						</MessageBubble>
					) : null}
					{stage >= 5 ? (
						<PhotoMessage copy={copy} uploading={stage === 5} />
					) : null}
				</div>
				<Composer placeholder={copy.composer} />
			</div>
		</div>
	);
}

function PhoneHeader({ status }: { status: string }) {
	return (
		<div className="flex h-[76px] items-end gap-2 bg-[#075e54] px-3 pb-2.5 text-white">
			<ArrowLeft className="mb-2 size-5 shrink-0" strokeWidth={2.2} />
			<div className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-sm">
				<WhatsAppIcon size={32} />
			</div>
			<div className="min-w-0 flex-1 pb-0.5">
				<p className="truncate text-[15px] font-semibold leading-tight">
					WorksRecorded
				</p>
				<p className="text-[11px] text-white/80">{status}</p>
			</div>
			<div className="mb-2 flex items-center gap-4">
				<Video className="size-5" strokeWidth={1.8} />
				<Phone className="size-4" strokeWidth={1.9} />
				<MoreVertical className="size-5" />
			</div>
		</div>
	);
}

function MessageBubble({
	direction,
	time,
	sent = false,
	children,
}: {
	direction: "incoming" | "outgoing";
	time: string;
	sent?: boolean;
	children: ReactNode;
}) {
	const outgoing = direction === "outgoing";
	return (
		<div
			className={`${MESSAGE_ENTER} relative max-w-[96%] rounded-xl px-[15px] pb-2 pt-2.5 text-[16.5px] leading-[1.4] text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.12)] ${
				outgoing
					? "ml-auto rounded-tr-sm bg-[#d9fdd3]"
					: "mr-auto rounded-tl-sm bg-white"
			}`}
		>
			{children}
			<MessageMeta time={time} sent={sent} />
		</div>
	);
}

function MessageMeta({ time, sent = false }: { time: string; sent?: boolean }) {
	return (
		<span className="ml-[15px] inline-flex translate-y-1 items-center gap-1 whitespace-nowrap text-[11.5px] text-slate-500">
			{time}
			{sent ? (
				<CheckCheck className="size-[18px] text-[#53bdeb]" strokeWidth={2.2} />
			) : null}
		</span>
	);
}

function TypingBubble() {
	return (
		<div
			className={`${MESSAGE_ENTER} mr-auto flex h-[46px] items-center gap-1 rounded-xl rounded-tl-sm bg-white px-5 shadow-[0_1px_1px_rgba(15,23,42,0.12)]`}
		>
			{[0, 1, 2].map((dot) => (
				<span
					key={dot}
					className="size-2 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
					style={{ animationDelay: `${dot * 120}ms` }}
				/>
			))}
		</div>
	);
}

function PhotoMessage({
	copy,
	uploading,
}: {
	copy: ConversationCopy;
	uploading: boolean;
}) {
	return (
		<div
			className={`${MESSAGE_ENTER} ml-auto w-[96%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-2 shadow-[0_1px_1px_rgba(15,23,42,0.12)]`}
		>
			<div className="grid h-36 grid-cols-2 gap-1 overflow-hidden rounded-lg">
				<div className="relative row-span-2 overflow-hidden">
					<ConstructionPhoto
						src={PHOTO_MESSAGES[0]}
						alt={`${copy.photoAlt} 1`}
						uploading={uploading}
					/>
				</div>
				{PHOTO_MESSAGES.slice(1).map((photo, index) => (
					<div key={photo.src} className="relative overflow-hidden">
						<ConstructionPhoto
							src={photo}
							alt={`${copy.photoAlt} ${index + 2}`}
							uploading={uploading}
						/>
					</div>
				))}
			</div>
			<div className="flex justify-end pr-1">
				<MessageMeta time="08:43" sent={!uploading} />
			</div>
		</div>
	);
}

function ConstructionPhoto({
	src,
	alt,
	uploading,
}: {
	src: StaticImageData;
	alt: string;
	uploading: boolean;
}) {
	return (
		<>
			<Image src={src} alt={alt} fill className="object-cover" sizes="160px" />
			{uploading ? (
				<div className="absolute inset-0 grid place-items-center bg-black/45">
					<LoaderCircle className="size-7 animate-spin text-white motion-reduce:animate-none" />
				</div>
			) : null}
		</>
	);
}

function Composer({ placeholder }: { placeholder: string }) {
	return (
		<div className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2.5">
			<div className="flex h-10 flex-1 items-center gap-3 rounded-full bg-white px-3 text-slate-400">
				<span className="text-lg">☺</span>
				<span className="flex-1 text-sm">{placeholder}</span>
				<Paperclip className="size-5" />
				<Camera className="size-5" />
			</div>
			<span className="grid size-10 place-items-center rounded-full bg-[#00a884] text-white">
				<Mic className="size-5" />
			</span>
		</div>
	);
}
