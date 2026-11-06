"use client";

import { Globe, Mail, Phone, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import {
	MarketingPageShell,
	PageEyebrow,
} from "@/components/landing/MarketingPagePrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackGenerateLeadOnce } from "@/lib/analytics/marketing-events";

export default function ContactForm() {
	const t = useTranslations("Contact");
	const locale = useLocale();
	const router = useRouter();
	const submissionInFlight = useRef(false);
	const [pending, setPending] = useState(false);
	const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(
		null,
	);
	const emailId = useId();
	const firstNameId = useId();
	const lastNameId = useId();
	const messageId = useId();
	const subjectId = useId();

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submissionInFlight.current) return;

		submissionInFlight.current = true;
		setPending(true);
		setStatus(null);
		const formData = new FormData(event.currentTarget);
		const payload = {
			firstName: String(formData.get("firstName") || ""),
			lastName: String(formData.get("lastName") || ""),
			email: String(formData.get("email") || ""),
			subject: String(formData.get("subject") || ""),
			message: String(formData.get("message") || ""),
			hp: String(formData.get("hp") || ""),
		};

		try {
			const response = await fetch("/api/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await response.json().catch(() => ({}));

			if (response.ok) {
				if (data.accepted === true && typeof data.id === "string")
					trackGenerateLeadOnce(data.id);
				router.push(`/${locale}/Landing/ThankYou`);
				return;
			}

			setStatus({
				ok: false,
				msg: data?.error ? String(data.error) : t("status.errorDefault"),
			});
		} catch {
			setStatus({ ok: false, msg: t("status.errorDefault") });
		} finally {
			submissionInFlight.current = false;
			setPending(false);
		}
	}

	const contactDetails = [
		{
			icon: Phone,
			label: t("phoneLabel"),
			value: "+371 24885690",
			href: "tel:+37124885690",
		},
		{
			icon: Mail,
			label: t("emailLabel"),
			value: "vjaceslavs@worksrecorded.com",
			href: "mailto:vjaceslavs@worksrecorded.com",
		},
		{
			icon: Globe,
			label: t("webLabel"),
			value: "worksrecorded.com",
			href: "https://www.worksrecorded.com",
		},
	];

	return (
		<MarketingPageShell>
			<section className="mx-auto grid min-h-[760px] w-full max-w-[1328px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-20">
				<div className="max-w-xl">
					<PageEyebrow>WorksRecorded</PageEyebrow>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.35rem]">
						{t("heroTitle").replace(" 🚀", "")}
					</h1>
					<p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						{t("heroDescription").replaceAll("**", "")}
					</p>
					<h2 className="mt-10 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
						{t("quickDetailsTitle")}
					</h2>
					<ul className="mt-5 grid gap-3">
						{contactDetails.map(({ icon: Icon, label, value, href }) => (
							<li key={label}>
								<a
									href={href}
									className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70"
								>
									<span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-[#087a49]">
										<Icon className="size-5" aria-hidden="true" />
									</span>
									<span className="min-w-0">
										<span className="block text-sm text-slate-500">
											{label}
										</span>
										<span className="block truncate font-semibold text-slate-900 group-hover:text-[#087a49] dark:text-white">
											{value}
										</span>
									</span>
								</a>
							</li>
						))}
					</ul>
				</div>

				<div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.16)] backdrop-blur-sm sm:p-9 dark:border-slate-800 dark:bg-slate-900/90">
					<h2 className="text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
						{t("formTitle")}
					</h2>
					<form className="mt-7 grid gap-5" onSubmit={onSubmit}>
						<input
							type="text"
							name="hp"
							className="hidden"
							tabIndex={-1}
							autoComplete="off"
						/>
						<div className="grid gap-5 sm:grid-cols-2">
							<Field label={t("firstNameLabel")} id={firstNameId}>
								<Input
									id={firstNameId}
									name="firstName"
									placeholder={t("firstNamePlaceholder")}
									required
								/>
							</Field>
							<Field label={t("lastNameLabel")} id={lastNameId}>
								<Input
									id={lastNameId}
									name="lastName"
									placeholder={t("lastNamePlaceholder")}
									required
								/>
							</Field>
						</div>
						<Field label={t("emailFieldLabel")} id={emailId}>
							<Input
								id={emailId}
								name="email"
								type="email"
								placeholder={t("emailPlaceholder")}
								required
							/>
						</Field>
						<Field label={t("subjectLabel")} id={subjectId}>
							<Input
								id={subjectId}
								name="subject"
								placeholder={t("subjectPlaceholder")}
								required
							/>
						</Field>
						<Field label={t("messageLabel")} id={messageId}>
							<Textarea
								id={messageId}
								name="message"
								placeholder={t("messagePlaceholder")}
								className="min-h-36 resize-y"
								required
							/>
						</Field>
						{status && (
							<p
								role="alert"
								className={
									status.ok
										? "text-sm font-semibold text-green-600"
										: "text-sm font-semibold text-red-600"
								}
							>
								{status.msg}
							</p>
						)}
						<Button
							type="submit"
							className="h-13 w-full rounded-full bg-[#1769ff] text-base font-semibold text-white hover:bg-[#0f5de8]"
							disabled={pending}
						>
							{pending ? (
								t("sending")
							) : (
								<>
									{t("sendMessage")}
									<Send className="ml-2 size-4" aria-hidden="true" />
								</>
							)}
						</Button>
					</form>
				</div>
			</section>
		</MarketingPageShell>
	);
}

function Field({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-2">
			<Label
				htmlFor={id}
				className="font-semibold text-slate-700 dark:text-slate-200"
			>
				{label}
			</Label>
			{children}
		</div>
	);
}
