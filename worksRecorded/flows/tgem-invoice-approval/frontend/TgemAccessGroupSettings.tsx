"use client";

import { ChevronDown, Save, ShieldCheck, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	TGEM_PERMISSIONS,
	type TgemPermission,
} from "@/lib/tgem-invoice-approval/permissions";
import {
	saveTgemAccessGroup,
	saveTgemOrganizationAccessMemberships,
	saveTgemSiteAccessMemberships,
} from "@/server/actions/tgem-access-actions";

type AccessGroup = {
	id: string;
	name: string;
	permissions: string[];
	memberUserIds: string[];
	organizationMemberUserIds?: string[];
};

type AccessUser = {
	id: string;
	name: string;
	email: string;
};

const permissionLabels: Record<TgemPermission, string> = {
	"invoice.view": "Skatīt rēķinus",
	"invoice.edit_basic": "Labot rēķina pamatdatus",
	"invoice.assign_project": "Mainīt rēķina projektu",
	"invoice.split": "Sadalīt rēķinu",
	"invoice.submit_approval": "Nosūtīt apstiprināšanai",
	"invoice.approve": "Apstiprināt piešķirto soli",
	"invoice.archive": "Arhivēt rēķinu",
	"invoice.mark_paid": "Atzīmēt kā apmaksātu",
};

function MembershipRow({
	user,
	groups,
	organizationId,
	siteId,
}: {
	user: AccessUser;
	groups: AccessGroup[];
	organizationId: string;
	siteId?: string;
}) {
	const router = useRouter();
	const initial = groups
		.filter((group) => group.memberUserIds.includes(user.id))
		.map((group) => group.id);
	const assignedGroups = groups.filter((group) => initial.includes(group.id));
	const inheritedGroups =
		siteId && assignedGroups.length === 0
			? groups.filter((group) =>
					group.organizationMemberUserIds?.includes(user.id),
				)
			: [];
	const effectiveGroups = assignedGroups.length
		? assignedGroups
		: inheritedGroups;
	const assignmentSource = inheritedGroups.length
		? "No organizācijas"
		: siteId
			? "Šajā projektā"
			: "Organizācijā";
	const [selected, setSelected] = React.useState(initial);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	async function save() {
		setSaving(true);
		setError(null);
		try {
			if (siteId) {
				await saveTgemSiteAccessMemberships({
					siteId,
					userId: user.id,
					groupIds: selected,
				});
			} else {
				await saveTgemOrganizationAccessMemberships({
					organizationId,
					userId: user.id,
					groupIds: selected,
				});
			}
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Neizdevās saglabāt");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-[minmax(12rem,0.7fr)_minmax(18rem,1.3fr)_auto] md:items-center">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-sm font-semibold text-tgem-primary dark:bg-tgem-primary/15">
					{(user.name || user.email).slice(0, 1).toUpperCase()}
				</div>
				<div className="min-w-0">
					<div className="truncate font-medium">{user.name || user.email}</div>
					<div className="truncate text-xs text-muted-foreground">
						{user.email}
					</div>
				</div>
			</div>
			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
					<span className="text-xs font-medium text-muted-foreground">
						Pašlaik piešķirtās lomas
					</span>
					{effectiveGroups.length ? (
						<>
							{effectiveGroups.map((group) => (
								<Badge
									key={group.id}
									variant="outline"
									className="border-[#B8CDF1] bg-[#EEF4FF] text-tgem-primary dark:border-tgem-primary/40 dark:bg-tgem-primary/15 dark:text-blue-100"
								>
									{group.name}
								</Badge>
							))}
							<span className="text-xs text-muted-foreground">
								{assignmentSource}
							</span>
						</>
					) : (
						<span className="text-xs text-muted-foreground">
							Nav piešķirtu lomu
						</span>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{groups.map((group) => (
						<label
							key={group.id}
							className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
								selected.includes(group.id)
									? "border-[#B8CDF1] bg-[#EEF4FF] text-slate-950 dark:border-tgem-primary/40 dark:bg-tgem-primary/15 dark:text-blue-100"
									: "bg-card hover:bg-muted/50"
							}`}
						>
							<input
								type="checkbox"
								className="size-4 accent-[#214EA3]"
								checked={selected.includes(group.id)}
								onChange={(event) =>
									setSelected((current) =>
										event.target.checked
											? [...current, group.id]
											: current.filter((id) => id !== group.id),
									)
								}
							/>
							{group.name}
						</label>
					))}
				</div>
			</div>
			<div className="flex items-center gap-3 md:justify-end">
				<Button
					size="sm"
					onClick={save}
					disabled={saving}
					className="bg-tgem-primary text-white hover:bg-tgem-primary/90"
				>
					<Save className="size-4" />
					{saving ? "Saglabā…" : "Saglabāt piekļuvi"}
				</Button>
			</div>
			{error ? (
				<p className="text-sm text-destructive md:col-start-2 md:col-span-2">
					{error}
				</p>
			) : null}
		</div>
	);
}

export function TgemAccessGroupSettings({
	organizationId,
	siteId,
	groups,
	users,
	canEditGroups,
}: {
	organizationId: string;
	siteId?: string;
	groups: AccessGroup[];
	users: AccessUser[];
	canEditGroups: boolean;
}) {
	const router = useRouter();
	const accessContentId = React.useId();
	const groupNameInputId = React.useId();
	const [accessOpen, setAccessOpen] = React.useState(false);
	const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");
	const selectedGroup = groups.find((group) => group.id === selectedGroupId);
	const [name, setName] = React.useState("");
	const [permissions, setPermissions] = React.useState<TgemPermission[]>([]);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		setName(selectedGroup?.name ?? "");
		setPermissions(
			(selectedGroup?.permissions ?? []).filter(
				(permission): permission is TgemPermission =>
					TGEM_PERMISSIONS.includes(permission as TgemPermission),
			),
		);
	}, [selectedGroup]);

	async function saveGroup() {
		setSaving(true);
		setError(null);
		try {
			await saveTgemAccessGroup({
				organizationId,
				id: selectedGroupId || undefined,
				name,
				permissions,
			});
			setSelectedGroupId("");
			setName("");
			setPermissions([]);
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Neizdevās saglabāt");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="rounded-xl border bg-card">
			<button
				type="button"
				aria-label={siteId ? "Projekta piekļuve" : "Organizācijas piekļuve"}
				aria-expanded={accessOpen}
				aria-controls={accessContentId}
				onClick={() => setAccessOpen((open) => !open)}
				className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl p-5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
			>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2 text-base font-semibold">
						<UsersRound className="size-5 text-tgem-primary" />
						{siteId ? "Projekta piekļuve" : "Organizācijas piekļuve"}
					</span>
					<span className="mt-1 block text-sm text-muted-foreground">
						Pārvaldiet lietotāju grupas un atļaujas rēķinu darbībām.
					</span>
				</span>
				<ChevronDown
					className={`size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${accessOpen ? "rotate-180" : ""}`}
				/>
			</button>

			<div
				id={accessContentId}
				hidden={!accessOpen}
				className="space-y-5 border-t p-5"
			>
				{canEditGroups ? (
					<section className="rounded-lg border border-dashed border-[#E1E6ED] bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-900/20">
						<div className="mb-4 flex items-start gap-3">
							<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-tgem-primary dark:bg-tgem-primary/15">
								<ShieldCheck className="size-5" />
							</div>
							<div>
								<h2 className="font-semibold">Piekļuves grupas</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Izveidojiet jaunu grupu vai izvēlieties esošu grupu, lai
									mainītu tās atļaujas.
								</p>
							</div>
						</div>
						<div className="grid gap-4 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(22rem,1.3fr)]">
							<div className="space-y-3">
								<label className="grid gap-1.5 text-sm font-medium">
									Grupa
									<select
										className="h-10 rounded-md border bg-background px-3 font-normal"
										value={selectedGroupId}
										onChange={(event) => setSelectedGroupId(event.target.value)}
									>
										<option value="">Jauna grupa</option>
										{groups.map((group) => (
											<option key={group.id} value={group.id}>
												{group.name}
											</option>
										))}
									</select>
								</label>
								<label
									htmlFor={groupNameInputId}
									className="grid gap-1.5 text-sm font-medium"
								>
									Grupas nosaukums
									<Input
										id={groupNameInputId}
										value={name}
										onChange={(event) => setName(event.target.value)}
										placeholder="Piemēram, Grāmatveži"
										className="bg-background font-normal"
									/>
								</label>
							</div>
							<fieldset>
								<legend className="mb-2 text-sm font-medium">Atļaujas</legend>
								<div className="grid gap-2 sm:grid-cols-2">
									{TGEM_PERMISSIONS.map((permission) => (
										<label
											key={permission}
											className={`flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2.5 text-sm transition-colors ${
												permissions.includes(permission)
													? "border-[#B8CDF1] bg-[#EEF4FF] dark:border-tgem-primary/40 dark:bg-tgem-primary/15"
													: "hover:bg-muted/50"
											}`}
										>
											<input
												type="checkbox"
												className="size-4 accent-[#214EA3]"
												checked={permissions.includes(permission)}
												onChange={(event) =>
													setPermissions((current) =>
														event.target.checked
															? [...current, permission]
															: current.filter((value) => value !== permission),
													)
												}
											/>
											{permissionLabels[permission]}
										</label>
									))}
								</div>
							</fieldset>
						</div>
						<div className="mt-4 flex flex-wrap items-center gap-3">
							<Button
								onClick={saveGroup}
								disabled={saving || !name.trim()}
								className="bg-tgem-primary text-white hover:bg-tgem-primary/90"
							>
								<Save className="size-4" />
								{saving ? "Saglabā…" : "Saglabāt grupu"}
							</Button>
							{error ? (
								<p className="text-sm text-destructive">{error}</p>
							) : null}
						</div>
					</section>
				) : null}

				<section className="space-y-3">
					<div>
						<h2 className="font-semibold">
							{siteId
								? "Projekta grupu piešķīrumi"
								: "Organizācijas grupu piešķīrumi"}
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{siteId
								? "Projekta grupas aizstāj organizācijas grupas tikai šajā projektā."
								: "Vairāku grupu atļaujas tiek apvienotas."}
						</p>
					</div>
					<div className="space-y-2">
						{users.map((user) => (
							<MembershipRow
								key={user.id}
								user={user}
								groups={groups}
								organizationId={organizationId}
								siteId={siteId}
							/>
						))}
					</div>
				</section>
			</div>
		</section>
	);
}
