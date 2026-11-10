export function isPerformanceAuthRedirect(currentUrl: string, baseURL: string) {
	const current = new URL(currentUrl);
	const base = new URL(baseURL);
	if (current.origin !== base.origin) return true;
	return (
		current.pathname.startsWith("/api/auth/") ||
		current.pathname.includes("/login") ||
		current.pathname.includes("/sign-in")
	);
}
