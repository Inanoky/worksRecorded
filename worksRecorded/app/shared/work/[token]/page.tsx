import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadPublicVisualWork } from "@/flows/default-construction/visual/planning-share-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
	title: "Kopīgots darba uzdevums | WorksRecorded",
	robots: { index: false, follow: false, nocache: true },
	referrer: "no-referrer",
	alternates: { canonical: null, languages: {} },
	openGraph: { title: "Kopīgots darba uzdevums", images: [] },
};
export default async function PublicVisualWorkPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const share = await loadPublicVisualWork(token);
	if (!share) notFound();
	return (
		<main className="mx-auto min-h-dvh max-w-5xl space-y-5 px-3 py-5 sm:px-6">
			<header className="space-y-2">
				<p className="text-sm font-semibold text-emerald-700">WorksRecorded</p>
				<h1 className="break-words text-xl font-semibold">{share.work}</h1>
				<p className="text-sm text-muted-foreground">
					{share.location}
					{share.section ? ` · ${share.section}` : ""}
				</p>
				<p className="text-sm">
					{new Intl.NumberFormat("lv-LV").format(share.quantity)} {share.unit} ·{" "}
					{share.startDate} – {share.endDate}
				</p>
			</header>
			<p className="text-xs text-muted-foreground">
				Kopīgots uzdevuma attēls. Pieskarieties attēlam, lai atvērtu to pilnā
				izmērā.
			</p>
			{share.images.map((image) => {
				const src = `/api/public/visual-work/${token}/image/${image.page}`;
				return (
					<section key={image.page} className="space-y-2">
						<h2 className="text-sm font-medium">
							{image.section
								? `Sekcijas ${image.section} rasējums`
								: `Lapa ${image.page}`}
						</h2>
						<a href={src} target="_blank" rel="noopener noreferrer">
							<Image
								src={src}
								alt={
									image.section
										? `Sekcijas ${image.section} rasējums`
										: `${share.work} · ${share.location} · lapa ${image.page}`
								}
								width={1600}
								height={1800}
								unoptimized
								className="h-auto w-full rounded-lg border bg-white"
							/>
						</a>
					</section>
				);
			})}
		</main>
	);
}
