import {
	getLandingRoute,
	LANDING_LOCALES,
	LANDING_STATIC_PATHS,
} from "./landing-routes";

function route(path: string) {
	return getLandingRoute(new URL(path, "https://www.worksrecorded.com"));
}

it("covers every supported public landing page and locale", () => {
	for (const locale of LANDING_LOCALES) {
		for (const path of LANDING_STATIC_PATHS) {
			const unsupported =
				(locale !== "lv" && path.endsWith("/BIS-integracija")) ||
				(locale === "ru" &&
					path.endsWith("/how-to-track-construction-site-progress"));
			expect(Boolean(route(`/${locale}${path}`))).toBe(!unsupported);
		}
	}
});

it("separates news pages and languages while reusing anchor and tracking-link caches", () => {
	expect(route("/lv/Landing/News?page=2")?.key).not.toBe(
		route("/lv/Landing/News?page=3")?.key,
	);
	expect(route("/lv/Landing/Agents#materials")?.key).toBe(
		route("/lv/Landing/Agents?utm_source=test")?.key,
	);
	expect(route("/en/Landing/Agents")?.key).not.toBe(
		route("/lv/Landing/Agents")?.key,
	);
	expect(route("/lv/Landing/News?page=invalid")?.page).toBe(1);
	expect(route("/lv/Landing/News?page=2.8")?.page).toBe(2);
	expect(route("/lv/Landing/News/42")?.articleId).toBe(42);
});

it("leaves dashboard navigation, unknown articles and invalid paths to Next.js", () => {
	for (const path of [
		"/dashboard",
		"/lv/LandingOther",
		"/lv/Landing/Unknown",
		"/lv/Landing/CaseStudies/Unknown",
		"/lv/Landing/News/0",
		"/lv/Landing/News/9007199254740992",
		"/de/Landing",
	]) {
		expect(route(path)).toBeNull();
	}
});
