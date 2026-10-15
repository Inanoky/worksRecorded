import {
	getBisBaseUrl,
	refreshBisAccessToken,
	requireBisAccessTokenForSite,
} from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";

export class FimaBisError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

export async function fimaBisClient(siteId: string) {
	const access = await requireBisAccessTokenForSite(siteId);
	let token = access.accessToken;
	const base = getBisBaseUrl();
	const path = `/bisp/api/portal/bis_cases/${access.bisCaseId}/logbook`;
	async function request(
		url: string,
		method = "GET",
		body?: unknown,
	): Promise<any> {
		const target = new URL(
			/^https?:\/\//.test(url) || url.startsWith("/") ? url : `${path}/${url}`,
			base,
		);
		if (
			target.origin !== new URL(base).origin ||
			!target.pathname.startsWith("/bisp/api/")
		)
			throw new Error("Nederīgs BIS resurss");
		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await bisFetch(base, target.toString(), {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.api+json",
					"Content-Type": "application/vnd.api+json",
				},
				body: body === undefined ? undefined : JSON.stringify(body),
				cache: "no-store",
				signal: AbortSignal.timeout(45000),
			});
			if (response.status === 401 && method === "GET" && attempt === 0) {
				token = (await refreshBisAccessToken(access.userId, undefined, token))
					.accessToken;
				continue;
			}
			const result = await response.json().catch(() => null);
			if (!response.ok)
				throw new FimaBisError(
					response.status,
					`BIS ${response.status}: ${result?.errors?.[0]?.detail ?? "Pieprasījums neizdevās"}`,
				);
			return result;
		}
		throw new Error("Atjaunojiet BIS savienojumu");
	}
	async function list(url: string) {
		const rows: any[] = [];
		const seen = new Set<string>();
		let next: string | null = url;
		while (next) {
			if (seen.has(next) || seen.size >= 100)
				throw new Error("BIS lapošanas ierobežojums");
			seen.add(next);
			const page = await request(next);
			rows.push(...(page.data ?? []));
			next = typeof page.links?.next === "string" ? page.links.next : null;
		}
		return rows;
	}
	return { ...access, base, request, list };
}
