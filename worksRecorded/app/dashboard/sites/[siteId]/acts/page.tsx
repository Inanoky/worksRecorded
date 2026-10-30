import { notFound } from "next/navigation";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

export default async function ActsRoute({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	const allowed = await orgCheck(user.id, siteId);
	if (!allowed) notFound();
	const site = await prisma.site.findUnique({
		where: { id: siteId },
		select: { siteDiaryRecordsMap: true, bisCaseId: true },
	});
	if (!site?.bisCaseId || !isFimaDiary(site.siteDiaryRecordsMap)) notFound();
	return null;
}
