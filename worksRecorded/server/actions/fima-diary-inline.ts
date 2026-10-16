"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { fimaInlineFields } from "@/lib/fima/inline-fields";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

const inputSchema = z
	.object({
		siteId: z.string().uuid(),
		recordId: z.string().min(1).max(128),
		field: z.enum(fimaInlineFields),
		value: z.string().max(10000),
		expectedValue: z.string().max(10000),
	})
	.strict();
function normalize(
	field: z.infer<typeof inputSchema>["field"],
	value: string,
	original: boolean,
) {
	if (!value.trim() && (!original || value === "")) return null;
	if (field === "Amounts") {
		const amount = Number(value.replace(",", "."));
		if (!Number.isFinite(amount) || amount < 0 || amount > 1e9)
			throw new Error("Norādiet derīgu apjomu.");
		return amount;
	}
	if (field === "Date") {
		if (!original && !/^\d{4}-\d{2}-\d{2}$/.test(value))
			throw new Error("Norādiet derīgu datumu.");
		const date = new Date(value);
		if (
			!Number.isFinite(date.getTime()) ||
			(!original && date.toISOString().slice(0, 10) !== value)
		)
			throw new Error("Norādiet derīgu datumu.");
		return date;
	}
	return value;
}
export async function updateFimaDiaryField(args: z.input<typeof inputSchema>) {
	const input = inputSchema.parse(args);
	const user = await requireUser();
	const access = await orgCheck(user.id, input.siteId);
	if (!access) throw new Error("Nav piekļuves projektam.");
	const site = await prisma.site.findUnique({
		where: { id: input.siteId },
		select: { organizationId: true, siteDiaryRecordsMap: true },
	});
	if (!site?.organizationId || !isFimaDiary(site.siteDiaryRecordsMap))
		throw new Error("Šajā projektā FIMA rediģēšana nav pieejama.");
	const expectedValue = normalize(input.field, input.expectedValue, true);
	const value = normalize(input.field, input.value, false);
	const where: Prisma.sitediaryrecordsWhereInput = {
		id: input.recordId,
		siteId: input.siteId,
		organizationId: site.organizationId,
		archivedAt: null,
		[input.field]:
			expectedValue === null &&
			input.field !== "Date" &&
			input.field !== "Amounts"
				? { in: [""] }
				: expectedValue,
	};
	if (
		expectedValue === null &&
		input.field !== "Date" &&
		input.field !== "Amounts"
	) {
		delete where[input.field];
		where.OR = [{ [input.field]: null }, { [input.field]: "" }];
	}
	const result = await prisma.sitediaryrecords.updateMany({
		where,
		data: { [input.field]: value },
	});
	if (result.count !== 1)
		throw new Error(
			"Ieraksts ir mainīts vai vairs nav pieejams. Atjaunojiet datus pirms rediģēšanas.",
		);
	revalidatePath(`/dashboard/sites/${input.siteId}/dashboard`);
	revalidatePath("/dashboard/all-projects");
	return {
		field: input.field,
		value: value instanceof Date ? value.toISOString() : value,
	};
}
