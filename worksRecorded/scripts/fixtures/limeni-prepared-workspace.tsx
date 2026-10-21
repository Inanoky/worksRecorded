import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ProjectLoadingProgressProvider } from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { LimeniProjectData } from "@/flows/default-construction/frontend/LimeniProjectData";
import { RetainedLimeniDiary } from "@/flows/default-construction/frontend/RetainedLimeniDiary";
import { RetainedLimeniForma2 } from "@/flows/default-construction/frontend/RetainedLimeniForma2";
import {
	getVisualDrawings,
	getVisualPlanning,
} from "@/flows/default-construction/visual/actions";
import type { VisualDrawing } from "@/flows/default-construction/visual/model";
import { VisualProjectView } from "@/flows/default-construction/visual/VisualProjectView";

export function mountPreparedWorkspace(fixture: VisualDrawing) {
	const original = window.fetch;
	const counts: Record<string, number> = {};
	window.fetch = async (url, options) => {
		const name = String(url);
		counts[name] = (counts[name] ?? 0) + 1;
		window.dispatchEvent(new Event("preview-count"));
		if (name.includes("/preview/")) {
			const query = new URL(name, location.origin).searchParams;
			return original(
				query.has("tile")
					? `/tile-${query.get("tile")}.webp`
					: "/prepared.webp",
			);
		}
		if (name.includes("?pdf=1")) return original("/plan.pdf");
		if (name.endsWith("/limeni-project")) {
			await new Promise((resolve) => setTimeout(resolve, 800));
			if (
				new Headers(options?.headers).get("If-None-Match") ===
				'"prepared-fixture-v2"'
			)
				return new Response(null, { status: 304 });
			const index = await getVisualDrawings("demo");
			const drawings = await Promise.all(
				index.drawings.map(async (item) => ({
					drawing: {
						...fixture,
						id: item.id,
						state: { ...fixture.state, location: item.location },
					},
					planning: await getVisualPlanning("demo", item.id),
					preview: {
						version: 1,
						source: item.id,
						pages: [
							{
								page: 1,
								width: 1000,
								height: 700,
								scales: [100],
								url: `/api/sites/demo/visual/${item.id}/preview/1?v=${item.id}`,
								tiles: {
									version: 1,
									size: 1024,
									levels: [
										{
											width: 1600,
											height: 1120,
											urls: [0, 1, 2, 3].map(
												(tile) =>
													`/api/sites/demo/visual/${item.id}/preview/1?v=${item.id}&level=0&tile=${tile}`,
											),
										},
									],
								},
							},
						],
					},
				})),
			);
			return Response.json({
				version: "prepared-fixture-v2",
				settings: {
					siteId: "demo",
					userId: "preview",
					organizationId: "limeni",
					bisEnabled: false,
					organizationLanguage: "lv",
				},
				index: { ...index, userId: "preview" },
				drawings,
				diary: { rows: [], mediaPhotos: [] },
				config: {},
				forma2: {
					data: {
						siteName: "Demonstrācijas Forma 2",
						document: null,
						resultRows: [],
					},
					organizationLanguage: "lv",
				},
			});
		}
		if (name.endsWith("/visual"))
			return Response.json(await getVisualDrawings("demo"));
		if (name.endsWith("/planning"))
			return Response.json(
				await getVisualPlanning(
					"demo",
					name.includes("demo-drawing-2") ? "demo-drawing-2" : "demo-drawing",
				),
			);
		if (name.includes("/api/sites/"))
			return Response.json({
				...fixture,
				id: name.includes("demo-drawing-2") ? "demo-drawing-2" : fixture.id,
			});
		return original(url, options);
	};

	history.replaceState(null, "", "/dashboard/sites/demo/dashboard");
	function Preview() {
		const [requests, setRequests] = useState({});
		useEffect(() => {
			const update = () => setRequests({ ...counts });
			window.addEventListener("preview-count", update);
			update();
			return () => window.removeEventListener("preview-count", update);
		}, []);
		return (
			<ProjectLoadingProgressProvider
				enabled
				visualPreloadEnabled
				cacheScope="preview:limeni"
			>
				<header className="flex gap-3 p-3">
					{[
						["dashboard", "Būvdarbu žurnāls"],
						["izpildshemas", "Izpildshēmas"],
						["analytics", "Forma 2"],
					].map(([path, label]) => (
						<button
							type="button"
							className="rounded border p-2"
							key={path}
							onClick={() => {
								history.pushState(null, "", `/dashboard/sites/demo/${path}`);
								window.dispatchEvent(new PopStateEvent("popstate"));
							}}
						>
							{label}
						</button>
					))}
				</header>
				<LimeniProjectData siteId="demo">
					<VisualProjectView siteId="demo">
						<RetainedLimeniDiary siteId="demo">
							<RetainedLimeniForma2 siteId="demo" />
							<ProjectOpeningOverlay label="Ielādē projektu…" />
						</RetainedLimeniDiary>
					</VisualProjectView>
				</LimeniProjectData>
				<section aria-label="Request counts">
					<pre>{JSON.stringify(requests, null, 2)}</pre>
				</section>
			</ProjectLoadingProgressProvider>
		);
	}
	const root = document.getElementById("root");
	if (root) createRoot(root).render(<Preview />);
}
