import { ArchiveRestore } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { restoreTgemArchivedInvoiceAction } from "./actions";

function formatDate(value: Date | null) {
	return value
		? new Intl.DateTimeFormat("lv-LV", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(value)
		: "-";
}

function formatMoney(
	value: { toString(): string } | null,
	currency: string | null,
) {
	return value ? `${value.toString()} ${currency ?? ""}`.trim() : "-";
}

export default async function TgemInvoiceArchivePage() {
	const user = await requireUser();
	const requestHeaders = await headers();
	if (
		!canAccessFlowConfigAdmin(
			user.id,
			requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
		)
	) {
		notFound();
	}

	const invoices = await prisma.tgemInvoiceCase.findMany({
		where: { archivedAt: { not: null } },
		orderBy: { archivedAt: "desc" },
		take: 100,
		select: {
			id: true,
			invoiceNumber: true,
			supplierName: true,
			total: true,
			currency: true,
			status: true,
			archivedAt: true,
			createdAt: true,
			organization: { select: { name: true } },
			site: { select: { name: true } },
			submittedBy: { select: { firstName: true, lastName: true, email: true } },
			_count: { select: { documents: true, auditEvents: true } },
		},
	});

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
			<div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<ArchiveRestore className="size-5 text-blue-600" />
						<h1 className="text-2xl font-semibold tracking-tight">
							TGEM invoice archive
						</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						Operations-only view for restoring archived invoices. Archived
						invoices are hidden from customer dashboards.
					</p>
				</div>
				<Badge variant="outline" className="w-fit">
					{invoices.length} archived
				</Badge>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Archived invoices</CardTitle>
					<CardDescription>
						Showing the latest 100 archived TGEM invoice cases.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Invoice</TableHead>
								<TableHead>Organization</TableHead>
								<TableHead>Project</TableHead>
								<TableHead>Uploader</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Archived</TableHead>
								<TableHead className="text-right">Restore</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invoices.map((invoice) => {
								const uploader = invoice.submittedBy
									? `${invoice.submittedBy.firstName} ${invoice.submittedBy.lastName}`.trim() ||
										invoice.submittedBy.email
									: "-";
								return (
									<TableRow key={invoice.id}>
										<TableCell>
											<div className="font-medium">
												{invoice.invoiceNumber ?? invoice.id}
											</div>
											<div className="text-xs text-muted-foreground">
												{invoice.supplierName ?? "No supplier"} ·{" "}
												{formatMoney(invoice.total, invoice.currency)} ·{" "}
												{invoice._count.documents} docs ·{" "}
												{invoice._count.auditEvents} events
											</div>
										</TableCell>
										<TableCell>{invoice.organization.name}</TableCell>
										<TableCell>{invoice.site?.name ?? "Unassigned"}</TableCell>
										<TableCell>{uploader}</TableCell>
										<TableCell>{invoice.status}</TableCell>
										<TableCell>{formatDate(invoice.archivedAt)}</TableCell>
										<TableCell className="text-right">
											<form action={restoreTgemArchivedInvoiceAction}>
												<input
													type="hidden"
													name="invoiceCaseId"
													value={invoice.id}
												/>
												<Button size="sm" variant="outline" type="submit">
													Restore
												</Button>
											</form>
										</TableCell>
									</TableRow>
								);
							})}
							{invoices.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="py-8 text-center text-sm text-muted-foreground"
									>
										No archived TGEM invoices.
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
