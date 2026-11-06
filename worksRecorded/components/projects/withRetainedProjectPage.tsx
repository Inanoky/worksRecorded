import type { ReactNode } from "react";
import { RegisterProjectPage } from "./ProjectRegistration";

export function withRetainedProjectPage<
	P extends {
		params: { siteId: string } | Promise<{ siteId: string }>;
		searchParams?: Promise<Record<string, string | string[] | undefined>>;
	},
>(Page: (props: P) => ReactNode | Promise<ReactNode>, view: string) {
	return async function RetainedProjectPage(props: P) {
		const [{ siteId }, content, search] = await Promise.all([
			props.params,
			Page(props),
			props.searchParams,
		]);
		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(search ?? {})) {
			for (const item of Array.isArray(value)
				? value
				: value === undefined
					? []
					: [value])
				query.append(key, item);
		}
		const href = `/dashboard/sites/${siteId}/${view}${query.size ? `?${query}` : ""}`;
		return (
			<RegisterProjectPage siteId={siteId} href={href}>
				{content}
			</RegisterProjectPage>
		);
	};
}
