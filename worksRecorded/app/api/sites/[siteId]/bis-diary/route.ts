import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { ProjectAccessError } from "@/flows/default-construction/visual/project-access-error";
import { prisma } from "@/lib/utils/db";
import { getBisDiaryReferences } from "@/server/actions/bis-diary-references";
import {
	getBisAvailableResponsiblePersons,
	getBisCaseAvailableMaterials,
	getBisCharacterMeasures,
	getSiteGalleryAttachments,
	syncDeletedSiteDiaryBisRecords,
} from "@/server/actions/site-diary-actions";

export const maxDuration = 300;

const headers = { "Cache-Control": "private, no-store" };

async function authorize(siteId: string) {
	const user = await getKindeServerSession().getUser();
	if (!user)
		return Response.json(
			{ error: "Nepieciešama pierakstīšanās." },
			{ status: 401, headers },
		);
	const access = await requireConstructionProjectAccess(user.id, siteId);
	if (!access.bisCaseId)
		throw new ProjectAccessError("Projektam nav piesaistīta BIS lieta.");
	return null;
}

function failure(error: unknown) {
	return Response.json(
		{
			error:
				error instanceof ProjectAccessError
					? "Nav piekļuves projekta BIS datiem."
					: "Neizdevās ielādēt BIS datus. Mēģiniet vēlreiz.",
		},
		{ status: error instanceof ProjectAccessError ? 403 : 502, headers },
	);
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const url = new URL(request.url);
	const loaders = {
		materials: getBisCaseAvailableMaterials,
		attachments: getSiteGalleryAttachments,
		measurements: getBisCharacterMeasures,
		responsiblePeople: getBisAvailableResponsiblePersons,
		references: (siteId: string) =>
			getBisDiaryReferences(siteId, url.searchParams.get("refresh") === "1"),
	};
	const kind = url.searchParams.get("kind");
	if (!kind || !Object.hasOwn(loaders, kind))
		return Response.json(
			{ error: "Nezināms BIS saraksts." },
			{ status: 400, headers },
		);
	try {
		const { siteId } = await params;
		const denied = await authorize(siteId);
		if (denied) return denied;
		const data = await loaders[kind as keyof typeof loaders](siteId);
		return Response.json({ data }, { headers });
	} catch (error) {
		return failure(error);
	}
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	if (request.headers.get("origin") !== new URL(request.url).origin)
		return Response.json(
			{ error: "Pieprasījums nav atļauts." },
			{ status: 403, headers },
		);
	try {
		const { siteId } = await params;
		const denied = await authorize(siteId);
		if (denied) return denied;
		await syncDeletedSiteDiaryBisRecords(siteId, true);
		const records = await prisma.sitediaryrecords.findMany({
			where: { siteId, archivedAt: null },
			select: { id: true, BISId: true, bisStatus: true },
		});
		return Response.json({ records }, { headers });
	} catch (error) {
		return failure(error);
	}
}
