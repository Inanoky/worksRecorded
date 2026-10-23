"use client";

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	fimaDiaryFilterKeys,
	readFimaDiaryFilters,
} from "@/lib/fima/diary-filters";
import { createFimaPageCache, fetchFimaPage } from "@/lib/fima/page-cache";
import { DiaryFilterCard } from "./DiaryFilterCard";
import {
	FimaAllProjectsDiary,
	type FimaAllProjectsRecordRow,
} from "./FimaAllProjectsDiary";
import { FimaDiaryFilters } from "./FimaDiaryFilters";
import { useFimaFilterReturn } from "./useFimaFilterReturn";

type Page = {
	rows: FimaAllProjectsRecordRow[];
	page: number;
	pageSize: number;
	totalCount: number;
	totalPages: number;
};
type Messages = Record<
	| "title"
	| "keyword"
	| "project"
	| "allProjects"
	| "from"
	| "to"
	| "filter"
	| "clear"
	| "previous"
	| "next"
	| "records"
	| "exportToExcel",
	string
>;
type Props = {
	initialPage: Page;
	initialQuery: string;
	projects: { id: string; name: string }[];
	messages: Messages;
};

function normalizedQuery(query: string) {
	const input = new URLSearchParams(query);
	const params = new URLSearchParams();
	for (const key of ["project", "q", "from", "to", ...fimaDiaryFilterKeys]) {
		const value = input.get(key)?.trim();
		if (value) params.set(key, value);
	}
	const page = Number(input.get("page"));
	if (Number.isSafeInteger(page) && page > 1) params.set("page", String(page));
	return params.toString();
}

function filterQuery(query: string) {
	const params = new URLSearchParams(normalizedQuery(query));
	params.delete("page");
	return params.toString();
}

export function FimaPaginatedDiary({
	initialPage,
	initialQuery,
	projects,
	messages,
}: Props) {
	const container = useRef<HTMLDivElement>(null);
	const { change: changeFilters, restore: restorePosition } =
		useFimaFilterReturn("all-projects", container);
	const [cache] = useState(() => {
		const value = createFimaPageCache<Page>();
		value.seed(normalizedQuery(initialQuery), initialPage);
		return value;
	});
	const [page, setPage] = useState(initialPage);
	const [query, setQuery] = useState(() => normalizedQuery(initialQuery));
	const [draft, setDraft] = useState(() =>
		Object.fromEntries(new URLSearchParams(initialQuery)),
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const request = useRef(0);
	const currentQuery = useRef(query);
	currentQuery.current = query;
	const currentPage = useRef(page);
	currentPage.current = page;
	const lastInitialPage = useRef(initialPage);
	const failedQuery = useRef(query);
	const load = useCallback(
		async (next: string, history: "push" | "replace" | "none" = "push") => {
			const params = new URLSearchParams(normalizedQuery(next));
			const previousFilters = filterQuery(currentQuery.current);
			const nextFilters = filterQuery(next);
			if (history === "push" && previousFilters !== nextFilters) {
				const number = changeFilters(
					Boolean(previousFilters),
					Boolean(nextFilters),
					currentPage.current.page,
				);
				if (number > 1) params.set("page", String(number));
				else params.delete("page");
			}
			const key = normalizedQuery(params.toString());
			failedQuery.current = key;
			const revision = ++request.current;
			const cached = cache.read(key);
			setLoading(!cached);
			setError("");
			try {
				const value =
					cached ??
					(await cache.load(key, (signal) =>
						fetchFimaPage<Page>(new URLSearchParams(key), signal),
					));
				if (revision !== request.current) return;
				const params = new URLSearchParams(key);
				if (value.page > 1) params.set("page", String(value.page));
				else params.delete("page");
				const resolved = normalizedQuery(params.toString());
				if (resolved !== key) cache.seed(resolved, value);
				setPage(value);
				setQuery(resolved);
				setDraft(Object.fromEntries(params));
				const href = `/dashboard/all-projects${resolved ? `?${resolved}` : ""}`;
				if (history === "push") window.history.pushState(null, "", href);
				else if (history === "replace" || resolved !== key)
					window.history.replaceState(null, "", href);
			} catch (cause) {
				if (
					revision !== request.current ||
					(cause instanceof Error && cause.name === "AbortError")
				)
					return;
				setError(
					cause instanceof Error
						? cause.message
						: "Neizdevās ielādēt ierakstus.",
				);
				if (history === "none")
					window.history.replaceState(
						null,
						"",
						`/dashboard/all-projects?${currentQuery.current}`,
					);
			} finally {
				if (revision === request.current) setLoading(false);
			}
		},
		[cache, changeFilters],
	);
	useLayoutEffect(() => {
		if (!loading && !error && !filterQuery(query)) restorePosition();
	}, [loading, error, query, restorePosition]);
	useEffect(() => {
		cache.seed(currentQuery.current, currentPage.current);
		const onPopState = () => void load(window.location.search, "none");
		window.addEventListener("popstate", onPopState);
		return () => {
			window.removeEventListener("popstate", onPopState);
			++request.current;
			cache.clear();
		};
	}, [cache, load]);
	useEffect(() => {
		if (lastInitialPage.current === initialPage) return;
		lastInitialPage.current = initialPage;
		const key = normalizedQuery(initialQuery);
		if (normalizedQuery(window.location.search) !== key) return;
		++request.current;
		cache.clear();
		cache.seed(key, initialPage);
		setPage(initialPage);
		setQuery(key);
		setDraft(Object.fromEntries(new URLSearchParams(key)));
		setLoading(false);
	}, [cache, initialPage, initialQuery]);
	useEffect(() => {
		if (page.page >= page.totalPages || loading || error) return;
		const timer = window.setTimeout(() => {
			if (
				document.visibilityState === "hidden" ||
				(navigator as Navigator & { connection?: { saveData?: boolean } })
					.connection?.saveData
			)
				return;
			const params = new URLSearchParams(query);
			params.set("page", String(page.page + 1));
			const key = normalizedQuery(params.toString());
			void cache
				.load(key, (signal) => fetchFimaPage<Page>(params, signal))
				.catch(() => {});
		}, 400);
		return () => window.clearTimeout(timer);
	}, [cache, page.page, page.totalPages, query, loading, error]);
	const invalidate = useCallback(() => {
		++request.current;
		cache.clear();
		setLoading(false);
	}, [cache]);
	const changePage = (number: number) => {
		const params = new URLSearchParams(query);
		params.set("page", String(number));
		void load(params.toString());
	};
	const pagination = (
		<nav
			aria-label="Ierakstu lapas"
			className="flex flex-wrap items-center justify-between gap-3 py-3"
		>
			<span className="text-sm text-muted-foreground">
				{page.totalCount ? (page.page - 1) * page.pageSize + 1 : 0}–
				{Math.min(page.page * page.pageSize, page.totalCount)} /{" "}
				{page.totalCount} {messages.records}
			</span>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={loading || page.page <= 1}
					onClick={() => changePage(page.page - 1)}
				>
					{messages.previous}
				</Button>
				<span className="text-sm tabular-nums">
					{page.page} / {page.totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={loading || page.page >= page.totalPages}
					onClick={() => changePage(page.page + 1)}
				>
					{messages.next}
				</Button>
			</div>
		</nav>
	);
	return (
		<div ref={container} className="space-y-6">
			<DiaryFilterCard sticky>
				<CardContent className="pt-6">
					<form
						className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_170px_170px_auto]"
						onSubmit={(event) => {
							event.preventDefault();
							const params = new URLSearchParams();
							for (const key of [
								"q",
								"project",
								"from",
								"to",
								...fimaDiaryFilterKeys,
							])
								if (draft[key]) params.set(key, draft[key]);
							void load(params.toString());
						}}
					>
						<Input
							name="q"
							value={draft.q ?? ""}
							onChange={(event) =>
								setDraft((value) => ({ ...value, q: event.target.value }))
							}
							placeholder={messages.keyword}
							aria-label={messages.keyword}
						/>
						<select
							name="project"
							value={draft.project ?? ""}
							onChange={(event) =>
								setDraft((value) => ({ ...value, project: event.target.value }))
							}
							aria-label={messages.project}
							className="h-9 rounded-md border border-input bg-background px-3 text-sm"
						>
							<option value="">{messages.allProjects}</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
						<Input
							name="from"
							type="date"
							value={draft.from ?? ""}
							onChange={(event) =>
								setDraft((value) => ({ ...value, from: event.target.value }))
							}
							aria-label={messages.from}
						/>
						<Input
							name="to"
							type="date"
							value={draft.to ?? ""}
							onChange={(event) =>
								setDraft((value) => ({ ...value, to: event.target.value }))
							}
							aria-label={messages.to}
						/>
						<div className="flex gap-2">
							<Button type="submit" disabled={loading}>
								{messages.filter}
							</Button>
							<Button
								variant="outline"
								type="button"
								disabled={loading}
								onClick={() =>
									void load(page.page > 1 ? `page=${page.page}` : "")
								}
							>
								{messages.clear}
							</Button>
						</div>
						<div className="col-span-full border-t pt-3">
							<FimaDiaryFilters
								value={readFimaDiaryFilters(draft)}
								onChange={(filters) =>
									setDraft((current) => ({
										...current,
										...Object.fromEntries(
											fimaDiaryFilterKeys.map((key) => [
												key,
												filters[key] ?? "",
											]),
										),
									}))
								}
							/>
						</div>
					</form>
				</CardContent>
			</DiaryFilterCard>
			<Card>
				<CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>{messages.title}</CardTitle>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={loading}
							onClick={() => {
								invalidate();
								void load(query, "replace");
							}}
						>
							Atjaunot ierakstus
						</Button>
						<Button asChild variant="outline" size="sm">
							<a href={`/api/all-projects/export?${query}`}>
								{messages.exportToExcel}
							</a>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{pagination}
					<output className="block min-h-5 text-xs text-muted-foreground">
						{loading ? "Ielādē ierakstus..." : ""}
					</output>
					{error ? (
						<div
							role="alert"
							className="mb-3 flex items-center gap-3 text-sm text-destructive"
						>
							{error}
							<Button
								variant="outline"
								size="sm"
								onClick={() => void load(failedQuery.current)}
							>
								Mēģināt vēlreiz
							</Button>
						</div>
					) : null}
					<div aria-busy={loading}>
						<FimaAllProjectsDiary
							records={page.rows}
							onRecordsChanged={invalidate}
						/>
					</div>
					{pagination}
				</CardContent>
			</Card>
		</div>
	);
}
