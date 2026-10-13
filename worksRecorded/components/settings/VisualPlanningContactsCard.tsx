"use client";

import {
	Archive,
	ContactRound,
	Pencil,
	Phone,
	Plus,
	RotateCcw,
} from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	archiveVisualPlanningContactItem,
	restoreVisualPlanningContactItem,
	saveVisualPlanningContact,
} from "@/flows/default-construction/visual/actions";
import type { VisualPlanningContact } from "@/flows/default-construction/visual/planning-contacts";
import { invalidateVisualPlanningClientCache } from "@/flows/default-construction/visual/visual-client-cache";
import { COUNTRY_CALLING_CODES } from "@/lib/constants/countryCallingCodes";

type ContactDraft = {
	id: string | null;
	name: string;
	countryCode: string;
	phone: string;
};

const defaultCountryCode = "371";

function phoneDigits(value: string) {
	return value.replace(/\D/g, "");
}

function splitPhone(phone: string) {
	const digits = phoneDigits(phone);
	const countryCode = [...COUNTRY_CALLING_CODES]
		.sort((left, right) => right.dialCode.length - left.dialCode.length)
		.find((country) => digits.startsWith(country.dialCode))?.dialCode;
	return {
		countryCode: countryCode ?? defaultCountryCode,
		phone: countryCode ? digits.slice(countryCode.length) : digits,
	};
}

function emptyDraft(): ContactDraft {
	return { id: null, name: "", countryCode: defaultCountryCode, phone: "" };
}

function messages(language: string | null | undefined) {
	if (language === "lv") {
		return {
			title: "Plānošanas kontakti",
			description:
				"Projekta adrešu grāmata atbildīgo personu piešķiršanai plānotajiem darbiem.",
			add: "Pievienot kontaktu",
			empty: "Kontakti vēl nav pievienoti.",
			archived: "Rādīt arhivētos",
			edit: "Labot",
			archive: "Arhivēt",
			restore: "Atjaunot",
			archivedLabel: "Arhivēts",
			addTitle: "Jauns kontakts",
			editTitle: "Labot kontaktu",
			dialogDescription:
				"Saglabājiet vārdu un mobilo tālruni, lai kontaktu varētu izvēlēties darbu plānā.",
			name: "Vārds, uzvārds",
			phone: "Mobilais tālrunis",
			country: "Valsts kods",
			cancel: "Atcelt",
			save: "Saglabāt",
			invalidName: "Norādiet kontakta vārdu vismaz 2 rakstzīmju garumā.",
			invalidPhone: "Norādiet pilnu tālruņa numuru ar 8–15 cipariem.",
			saved: "Kontakts saglabāts.",
			archivedNotice: "Kontakts arhivēts.",
			restoredNotice: "Kontakts atjaunots.",
			archiveConfirm:
				"Arhivēt kontaktu? Tas paliks redzams jau piešķirtajos plānos.",
		};
	}
	return {
		title: "Planning contacts",
		description:
			"A project address book for assigning responsible people to planned work.",
		add: "Add contact",
		empty: "No contacts have been added yet.",
		archived: "Show archived",
		edit: "Edit",
		archive: "Archive",
		restore: "Restore",
		archivedLabel: "Archived",
		addTitle: "New contact",
		editTitle: "Edit contact",
		dialogDescription:
			"Save a name and mobile number so this contact can be selected in planning.",
		name: "Full name",
		phone: "Mobile phone",
		country: "Country code",
		cancel: "Cancel",
		save: "Save",
		invalidName: "Enter a contact name with at least 2 characters.",
		invalidPhone: "Enter a complete phone number containing 8–15 digits.",
		saved: "Contact saved.",
		archivedNotice: "Contact archived.",
		restoredNotice: "Contact restored.",
		archiveConfirm:
			"Archive this contact? It will remain visible on plans where it is already assigned.",
	};
}

export function VisualPlanningContactsCard({
	siteId,
	initialContacts,
	organizationLanguage,
}: {
	siteId: string;
	initialContacts: VisualPlanningContact[];
	organizationLanguage?: string | null;
}) {
	const t = messages(organizationLanguage);
	const [contacts, setContacts] = useState(initialContacts);
	const [draft, setDraft] = useState<ContactDraft>(emptyDraft);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [pending, startTransition] = useTransition();
	const fieldId = useId();
	const visibleContacts = contacts.filter(
		(contact) => showArchived || !contact.archivedAt,
	);

	function openCreate() {
		setDraft(emptyDraft());
		setDialogOpen(true);
	}

	function openEdit(contact: VisualPlanningContact) {
		const phone = splitPhone(contact.phone);
		setDraft({
			id: contact.id,
			name: contact.name,
			countryCode: phone.countryCode,
			phone: phone.phone,
		});
		setDialogOpen(true);
	}

	function replaceContact(contact: VisualPlanningContact) {
		setContacts((current) => {
			const exists = current.some((item) => item.id === contact.id);
			const next = exists
				? current.map((item) => (item.id === contact.id ? contact : item))
				: [...current, contact];
			return next.sort(
				(left, right) =>
					Number(Boolean(left.archivedAt)) -
						Number(Boolean(right.archivedAt)) ||
					left.name.localeCompare(right.name, organizationLanguage ?? "lv"),
			);
		});
	}

	function saveContact(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = draft.name.trim();
		const phone = `${draft.countryCode}${phoneDigits(draft.phone)}`;
		if (name.length < 2) {
			toast.error(t.invalidName);
			return;
		}
		if (!/^\d{8,15}$/.test(phone)) {
			toast.error(t.invalidPhone);
			return;
		}
		startTransition(async () => {
			const result = await saveVisualPlanningContact({
				siteId,
				...(draft.id ? { id: draft.id } : {}),
				name,
				phone,
			});
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			replaceContact(result.contact);
			invalidateVisualPlanningClientCache(siteId);
			setDialogOpen(false);
			toast.success(t.saved);
		});
	}

	function archiveContact(contact: VisualPlanningContact) {
		if (!window.confirm(t.archiveConfirm)) return;
		startTransition(async () => {
			const result = await archiveVisualPlanningContactItem({
				siteId,
				id: contact.id,
			});
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			replaceContact(result.contact);
			invalidateVisualPlanningClientCache(siteId);
			toast.success(t.archivedNotice);
		});
	}

	function restoreContact(contact: VisualPlanningContact) {
		startTransition(async () => {
			const result = await restoreVisualPlanningContactItem({
				siteId,
				id: contact.id,
			});
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			replaceContact(result.contact);
			invalidateVisualPlanningClientCache(siteId);
			toast.success(t.restoredNotice);
		});
	}

	return (
		<>
			<Card className="mt-6 overflow-hidden border-slate-200 pt-0">
				<div className="h-1 bg-gradient-to-r from-teal-700 via-teal-500 to-sky-400" />
				<CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
								<ContactRound className="h-5 w-5" />
							</span>
							<CardTitle>{t.title}</CardTitle>
						</div>
						<CardDescription>{t.description}</CardDescription>
					</div>
					<Button size="sm" onClick={openCreate} disabled={pending}>
						<Plus className="h-4 w-4" />
						{t.add}
					</Button>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="flex justify-end">
						<Label
							htmlFor={`${fieldId}-archived`}
							className="flex items-center gap-2 text-xs font-normal text-muted-foreground"
						>
							<Switch
								id={`${fieldId}-archived`}
								checked={showArchived}
								onCheckedChange={setShowArchived}
							/>
							{t.archived}
						</Label>
					</div>

					{visibleContacts.length ? (
						<ul className="divide-y rounded-xl border bg-slate-50/40">
							{visibleContacts.map((contact) => (
								<li
									key={contact.id}
									className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
								>
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-teal-800 shadow-sm ring-1 ring-slate-200">
											{contact.name.slice(0, 1).toLocaleUpperCase()}
										</span>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<p className="truncate text-sm font-medium">
													{contact.name}
												</p>
												{contact.archivedAt ? (
													<span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
														{t.archivedLabel}
													</span>
												) : null}
											</div>
											<p className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
												<Phone className="h-3.5 w-3.5" />+{contact.phone}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 self-end sm:self-auto">
										{contact.archivedAt ? (
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={pending}
												onClick={() => restoreContact(contact)}
											>
												<RotateCcw className="h-3.5 w-3.5" />
												{t.restore}
											</Button>
										) : (
											<>
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={pending}
													onClick={() => openEdit(contact)}
												>
													<Pencil className="h-3.5 w-3.5" />
													{t.edit}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													className="text-muted-foreground"
													disabled={pending}
													onClick={() => archiveContact(contact)}
												>
													<Archive className="h-3.5 w-3.5" />
													{t.archive}
												</Button>
											</>
										)}
									</div>
								</li>
							))}
						</ul>
					) : (
						<div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
							{t.empty}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{draft.id ? t.editTitle : t.addTitle}</DialogTitle>
						<DialogDescription>{t.dialogDescription}</DialogDescription>
					</DialogHeader>
					<form className="space-y-4" onSubmit={saveContact}>
						<div className="space-y-2">
							<Label htmlFor={`${fieldId}-name`}>{t.name}</Label>
							<Input
								id={`${fieldId}-name`}
								value={draft.name}
								maxLength={100}
								autoComplete="name"
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										name: event.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`${fieldId}-phone`}>{t.phone}</Label>
							<div className="grid grid-cols-[150px_minmax(0,1fr)] gap-2">
								<Select
									value={draft.countryCode}
									onValueChange={(countryCode) =>
										setDraft((current) => ({ ...current, countryCode }))
									}
								>
									<SelectTrigger aria-label={t.country}>
										<SelectValue placeholder={t.country} />
									</SelectTrigger>
									<SelectContent>
										{COUNTRY_CALLING_CODES.map((country) => (
											<SelectItem
												key={`${country.iso2}-${country.dialCode}`}
												value={country.dialCode}
											>
												{country.name} (+{country.dialCode})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									id={`${fieldId}-phone`}
									value={draft.phone}
									inputMode="tel"
									autoComplete="tel-national"
									onChange={(event) =>
										setDraft((current) => ({
											...current,
											phone: phoneDigits(event.target.value),
										}))
									}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								disabled={pending}
								onClick={() => setDialogOpen(false)}
							>
								{t.cancel}
							</Button>
							<Button type="submit" disabled={pending}>
								{t.save}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
