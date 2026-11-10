import { isPerformanceAuthRedirect } from "./auth-preflight-url";

const baseURL = "https://www.worksrecorded.com";

it("accepts the application dashboard URL", () => {
	expect(
		isPerformanceAuthRedirect(
			"https://www.worksrecorded.com/dashboard",
			baseURL,
		),
	).toBe(false);
});

it.each([
	"https://tenant.kinde.com/login",
	"https://auth.buvconsult.lv/login",
	"https://www.worksrecorded.com/api/auth/login",
	"https://www.worksrecorded.com/sign-in",
])("detects an authentication redirect to %s", (url) => {
	expect(isPerformanceAuthRedirect(url, baseURL)).toBe(true);
});
