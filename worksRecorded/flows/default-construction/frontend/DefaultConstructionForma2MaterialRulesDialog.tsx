"use client";

import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	deleteDefaultConstructionForma2MaterialRule,
	getDefaultConstructionForma2MaterialReviewData,
} from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2AssignmentSelect } from "@/flows/default-construction/frontend/DefaultConstructionForma2AssignmentSelect";

type ReviewData = Awaited<
	ReturnType<typeof getDefaultConstructionForma2MaterialReviewData>
>;

function formatCurrency(value: number, locale: string) {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export function DefaultConstructionForma2MaterialRulesDialog({
	siteId,
	organizationLanguage,
	onAssignmentsChanged,
}: {
	siteId: string;
	organizationLanguage?: string | null;
	onAssignmentsChanged: () => void;
}) {
	const isLatvian = String(organizationLanguage ?? "")
		.toLowerCase()
		.startsWith("lv");
	const locale = isLatvian ? "lv-LV" : "en-GB";
	const copy = isLatvian
		? {
				button: "Pārskatīt nepiesaistītos",
				title: "Materiālu piesaistes un noteikumi",
				description:
					"Piesaistiet līdzīgus Noliktavas materiālus vienā reizē. Izvēle tiek saglabāta kā noteikums turpmākiem ierakstiem.",
				unassigned: "Nepiesaistītās grupas",
				rules: "Saglabātie noteikumi",
				search: "Meklēt materiālu...",
				records: "ieraksti",
				applyHint: "Izvēlētā pozīcija tiks piemērota visai grupai.",
				noGroups: "Visi materiāli ir piesaistīti.",
				noRules: "Saglabātu noteikumu vēl nav.",
				deleteRule: "Dzēst noteikumu",
				deleteConfirm:
					"Dzēst šo noteikumu? Jau veiktās piesaistes netiks dzēstas.",
				deleteSuccess: "Noteikums izdzēsts.",
				loadError: "Neizdevās ielādēt materiālu grupas.",
				matching: "atbilstoši ieraksti",
			}
		: {
				button: "Review unassigned",
				title: "Material assignments and rules",
				description:
					"Assign similar Warehouse materials together. The choice is saved as a rule for future records.",
				unassigned: "Unassigned groups",
				rules: "Saved rules",
				search: "Search materials...",
				records: "records",
				applyHint: "The selected position will be applied to the whole group.",
				noGroups: "All materials are assigned.",
				noRules: "No rules have been saved yet.",
				deleteRule: "Delete rule",
				deleteConfirm:
					"Delete this rule? Existing assignments will not be removed.",
				deleteSuccess: "Rule deleted.",
				loadError: "Could not load material groups.",
				matching: "matching records",
			};
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<ReviewData | null>(null);
	const [search, setSearch] = useState("");
	const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

	const loadData = async () => {
		setLoading(true);
		try {
			setData(await getDefaultConstructionForma2MaterialReviewData(siteId));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : copy.loadError);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (nextOpen && !loading) void loadData();
	};

	const filteredGroups = useMemo(() => {
		const query = search.trim().toLocaleLowerCase("lv");
		if (!query) return data?.groups ?? [];
		return (data?.groups ?? []).filter((group) =>
			`${group.displayName} ${group.context}`
				.toLocaleLowerCase("lv")
				.includes(query),
		);
	}, [data?.groups, search]);

	const deleteRule = async (ruleId: string) => {
		if (!window.confirm(copy.deleteConfirm)) return;
		setDeletingRuleId(ruleId);
		try {
			await deleteDefaultConstructionForma2MaterialRule({ siteId, ruleId });
			await loadData();
			toast.success(copy.deleteSuccess);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : copy.loadError);
		} finally {
			setDeletingRuleId(null);
		}
	};

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => handleOpenChange(true)}
			>
				<Sparkles className="mr-2 size-4" />
				{copy.button}
			</Button>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="flex h-[90dvh] max-h-[900px] flex-col overflow-hidden p-0 sm:max-w-5xl">
					<DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
						<DialogTitle>{copy.title}</DialogTitle>
						<DialogDescription>{copy.description}</DialogDescription>
					</DialogHeader>
					{loading && !data ? (
						<div className="flex min-h-0 flex-1 items-center justify-center">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : data ? (
						<Tabs defaultValue="unassigned" className="min-h-0 flex-1 gap-0">
							<div className="shrink-0 border-b px-6 py-3">
								<TabsList>
									<TabsTrigger value="unassigned">
										{copy.unassigned}
										<Badge variant="secondary">{data.groups.length}</Badge>
									</TabsTrigger>
									<TabsTrigger value="rules">
										{copy.rules}
										<Badge variant="secondary">{data.rules.length}</Badge>
									</TabsTrigger>
								</TabsList>
							</div>
							<TabsContent
								value="unassigned"
								className="min-h-0 overflow-y-auto px-6 py-4 [scrollbar-gutter:stable]"
							>
								<Input
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder={copy.search}
									className="mb-4 max-w-md"
								/>
								<div className="space-y-3">
									{filteredGroups.map((group) => (
										<div
											key={group.normalizedName}
											className="grid gap-4 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-center"
										>
											<div className="min-w-0">
												<div className="font-medium">{group.displayName}</div>
												<div className="mt-1 text-sm text-muted-foreground">
													{group.count} {copy.records} ·{" "}
													{formatCurrency(group.totalCost, locale)}
													{group.units.length
														? ` · ${group.units.join(", ")}`
														: ""}
												</div>
												{group.context ? (
													<div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
														{group.context}
													</div>
												) : null}
											</div>
											<div>
												<DefaultConstructionForma2AssignmentSelect
													siteId={siteId}
													sourceId={group.representativeSourceId}
													value={null}
													options={data.positionOptions}
													organizationLanguage={organizationLanguage}
													assignmentMode="similar-rule"
													onAssigned={() => {
														void loadData();
														onAssignmentsChanged();
													}}
												/>
												<p className="mt-1 text-xs text-muted-foreground">
													{copy.applyHint}
												</p>
											</div>
										</div>
									))}
									{filteredGroups.length === 0 ? (
										<div className="py-16 text-center text-sm text-muted-foreground">
											{copy.noGroups}
										</div>
									) : null}
								</div>
							</TabsContent>
							<TabsContent
								value="rules"
								className="min-h-0 overflow-y-auto px-6 py-4 [scrollbar-gutter:stable]"
							>
								<div className="space-y-3">
									{data.rules.map((rule) => (
										<div
											key={rule.id}
											className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
										>
											<div>
												<div className="font-medium">{rule.displayName}</div>
												<div className="mt-1 text-sm text-muted-foreground">
													→ {rule.positionLabel}
												</div>
												<div className="mt-1 text-xs text-muted-foreground">
													{rule.matchingRecords} {copy.matching}
												</div>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="text-destructive"
												disabled={deletingRuleId === rule.id}
												onClick={() => deleteRule(rule.id)}
											>
												{deletingRuleId === rule.id ? (
													<Loader2 className="mr-2 size-4 animate-spin" />
												) : (
													<Trash2 className="mr-2 size-4" />
												)}
												{copy.deleteRule}
											</Button>
										</div>
									))}
									{data.rules.length === 0 ? (
										<div className="py-16 text-center text-sm text-muted-foreground">
											{copy.noRules}
										</div>
									) : null}
								</div>
							</TabsContent>
						</Tabs>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
